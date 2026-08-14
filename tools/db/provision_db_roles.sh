#!/usr/bin/env bash
# Create and grant the separate database roles.
#
#   tools/db/provision_db_roles.sh <container> <database> [superuser]
#
# Passwords come from /root/ops-secrets/synapse/db-roles.env, which is created
# with 32-byte random values on first run and never enters the repository. The
# file is the thing to back up: losing it means rotating four passwords and the
# application connection string together.
#
# Idempotent. Run it again after a migration adds tables -- new tables inherit
# the grants through ALTER DEFAULT PRIVILEGES, but running it again costs
# nothing and repairs anything created by hand.
set -euo pipefail

CONTAINER="${1:?usage: provision_db_roles.sh <container> <database> [superuser]}"
DATABASE="${2:?usage: provision_db_roles.sh <container> <database> [superuser]}"
SUPERUSER="${3:-postgres}"

SECRETS_DIR=/root/ops-secrets/synapse
SECRETS_FILE="$SECRETS_DIR/db-roles.env"
SQL_FILE="$(cd "$(dirname "$0")" && pwd)/provision_db_roles.sql"

ROLES=(synapse_migrate synapse_app synapse_readonly synapse_backup)

if [[ ! -f "$SECRETS_FILE" ]]; then
  mkdir -p "$SECRETS_DIR"
  umask 077
  {
    echo "# Passwords for the separate PostgreSQL roles."
    echo "# Generated $(date -Is). Back this file up; it is not in git."
    for role in "${ROLES[@]}"; do
      printf '%s_PASSWORD=%s\n' "$(echo "$role" | tr '[:lower:]' '[:upper:]')" \
        "$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
    done
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  echo "created $SECRETS_FILE (0600) with fresh passwords"
fi

# shellcheck disable=SC1090
set -a; source "$SECRETS_FILE"; set +a

echo "=== applying role definitions and grants to $DATABASE ==="
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -v ON_ERROR_STOP=1 -q < "$SQL_FILE"

echo "=== setting passwords ==="
for role in "${ROLES[@]}"; do
  var="$(echo "$role" | tr '[:lower:]' '[:upper:]')_PASSWORD"
  password="${!var:?missing $var in $SECRETS_FILE}"
  # Fed through stdin with psql variables rather than interpolated into the
  # command line: an argument would be visible in `ps` while the process runs,
  # and psql does not expand :variables given to -c anyway.
  printf 'ALTER ROLE :"role" WITH PASSWORD :%s;\n' "'pw'" \
    | docker exec -i -e PGOPTIONS=--client-min-messages=warning "$CONTAINER" \
        psql -U "$SUPERUSER" -d "$DATABASE" -q -v ON_ERROR_STOP=1 \
        -v role="$role" -v pw="$password" >/dev/null
  echo "  $role: password set"
done

echo
echo "=== resulting privileges for synapse_app ==="
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -At -c "
  SELECT privilege_type || ' on ' || count(*) || ' tables'
  FROM information_schema.table_privileges
  WHERE grantee = 'synapse_app' AND table_schema = 'public'
  GROUP BY privilege_type ORDER BY privilege_type"
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -At -c "
  SELECT 'CREATE on schema public: ' ||
         coalesce(has_schema_privilege('synapse_app', 'public', 'CREATE')::text, 'unknown')"
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -At -c "
  SELECT 'tables owned by synapse_app: ' || count(*)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relowner = 'synapse_app'::regrole"

echo
echo "done. Connection string for the application:"
echo "  postgresql+psycopg://synapse_app:<SYNAPSE_APP_PASSWORD>@<host>:<port>/$DATABASE"
