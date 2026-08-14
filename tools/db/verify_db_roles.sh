#!/usr/bin/env bash
# Negative tests for the separate database roles.
#
#   tools/db/verify_db_roles.sh <container> <database> [superuser]
#
# Every check below asserts that something is REFUSED. A privilege model is only
# worth the statements it stops, so this script fails if any of them succeeds.
set -uo pipefail

CONTAINER="${1:?usage: verify_db_roles.sh <container> <database> [superuser]}"
DATABASE="${2:?usage: verify_db_roles.sh <container> <database> [superuser]}"
SUPERUSER="${3:-postgres}"
SECRETS_FILE=/root/ops-secrets/synapse/db-roles.env

[[ -r "$SECRETS_FILE" ]] || { echo "missing $SECRETS_FILE; run provision_db_roles.sh first" >&2; exit 1; }
# shellcheck disable=SC1090
set -a; source "$SECRETS_FILE"; set +a

failures=0
checks=0

as_role() {
  local role="$1" password="$2" sql="$3"
  docker exec -i -e PGPASSWORD="$password" "$CONTAINER" \
    psql -h 127.0.0.1 -U "$role" -d "$DATABASE" -At -v ON_ERROR_STOP=1 -c "$sql" 2>&1
}

must_fail() {
  local label="$1" role="$2" password="$3" sql="$4"
  checks=$((checks + 1))
  local output
  output=$(as_role "$role" "$password" "$sql")
  if [[ $? -eq 0 ]]; then
    echo "  FAIL: $label -- statement succeeded but must be refused"
    echo "        $sql"
    failures=$((failures + 1))
  else
    echo "  ok:   $label (refused: $(echo "$output" | head -1 | cut -c1-90))"
  fi
}

must_succeed() {
  local label="$1" role="$2" password="$3" sql="$4"
  checks=$((checks + 1))
  local output
  output=$(as_role "$role" "$password" "$sql")
  if [[ $? -ne 0 ]]; then
    echo "  FAIL: $label -- statement was refused but must succeed"
    echo "        $(echo "$output" | head -2)"
    failures=$((failures + 1))
  else
    echo "  ok:   $label"
  fi
}

echo "=== synapse_app: may read and write data ==="
must_succeed "SELECT on users"        synapse_app "$SYNAPSE_APP_PASSWORD" \
  "SELECT count(*) FROM users"
must_succeed "INSERT/DELETE on telemetry_events" synapse_app "$SYNAPSE_APP_PASSWORD" \
  "INSERT INTO telemetry_events (event_name) VALUES ('role_probe')"
must_succeed "SELECT on alembic_version" synapse_app "$SYNAPSE_APP_PASSWORD" \
  "SELECT version_num FROM alembic_version"

echo
echo "=== synapse_app: may NOT change the schema ==="
must_fail "CREATE TABLE"  synapse_app "$SYNAPSE_APP_PASSWORD" \
  "CREATE TABLE role_probe_table (id int)"
must_fail "ALTER TABLE"   synapse_app "$SYNAPSE_APP_PASSWORD" \
  "ALTER TABLE users ADD COLUMN role_probe text"
must_fail "DROP TABLE"    synapse_app "$SYNAPSE_APP_PASSWORD" \
  "DROP TABLE telemetry_events"
must_fail "CREATE INDEX"  synapse_app "$SYNAPSE_APP_PASSWORD" \
  "CREATE INDEX role_probe_idx ON users (status)"
must_fail "TRUNCATE"      synapse_app "$SYNAPSE_APP_PASSWORD" \
  "TRUNCATE telemetry_events"
must_fail "CREATE SCHEMA" synapse_app "$SYNAPSE_APP_PASSWORD" \
  "CREATE SCHEMA role_probe_schema"
must_fail "CREATE ROLE"   synapse_app "$SYNAPSE_APP_PASSWORD" \
  "CREATE ROLE role_probe_role"

echo
echo "=== synapse_app: may NOT rewrite the audit trail or claim a revision ==="
# The append-only trigger is owned by synapse_owner. A table owner may disable
# its own triggers; synapse_app owns nothing, which is what makes this hold.
must_fail "UPDATE audit_log"            synapse_app "$SYNAPSE_APP_PASSWORD" \
  "UPDATE audit_log SET action = 'forged'"
must_fail "DELETE FROM audit_log"       synapse_app "$SYNAPSE_APP_PASSWORD" \
  "DELETE FROM audit_log"
must_fail "UPDATE telemetry_events"     synapse_app "$SYNAPSE_APP_PASSWORD" \
  "UPDATE telemetry_events SET event_name = 'forged'"
must_fail "ALTER TABLE ... DISABLE TRIGGER" synapse_app "$SYNAPSE_APP_PASSWORD" \
  "ALTER TABLE audit_log DISABLE TRIGGER audit_log_append_only"
must_fail "UPDATE alembic_version"      synapse_app "$SYNAPSE_APP_PASSWORD" \
  "UPDATE alembic_version SET version_num = '9999'"

echo
echo "=== synapse_readonly: reads only ==="
must_succeed "SELECT on users" synapse_readonly "$SYNAPSE_READONLY_PASSWORD" \
  "SELECT count(*) FROM users"
must_fail "INSERT"  synapse_readonly "$SYNAPSE_READONLY_PASSWORD" \
  "INSERT INTO telemetry_events (event_name) VALUES ('role_probe')"
must_fail "UPDATE"  synapse_readonly "$SYNAPSE_READONLY_PASSWORD" \
  "UPDATE users SET display_name = 'x'"
must_fail "DELETE"  synapse_readonly "$SYNAPSE_READONLY_PASSWORD" \
  "DELETE FROM users"

echo
echo "=== synapse_backup: reads everything, writes nothing ==="
must_succeed "SELECT on user_credentials" synapse_backup "$SYNAPSE_BACKUP_PASSWORD" \
  "SELECT count(*) FROM user_credentials"
must_fail "INSERT" synapse_backup "$SYNAPSE_BACKUP_PASSWORD" \
  "INSERT INTO telemetry_events (event_name) VALUES ('role_probe')"

echo
echo "=== synapse_migrate: owns the schema, so it may change it ==="
must_succeed "CREATE then DROP TABLE" synapse_migrate "$SYNAPSE_MIGRATE_PASSWORD" \
  "CREATE TABLE role_probe_migrate (id int); DROP TABLE role_probe_migrate"

echo
echo "=== a table created by the NEXT migration must be writable by the app ==="
# This is the check the canary earned. Membership in synapse_owner is not
# ownership: a table created *as* synapse_migrate is owned by synapse_migrate,
# the default privileges recorded for synapse_owner do not apply to it, and the
# application gets "permission denied" the first time a migration adds a table.
# Everything that makes that impossible is asserted here rather than assumed.
must_succeed "migration creates a table" synapse_migrate "$SYNAPSE_MIGRATE_PASSWORD" \
  "CREATE TABLE role_probe_future (id bigserial primary key, note text)"
checks=$((checks + 1))
owner=$(as_role synapse_migrate "$SYNAPSE_MIGRATE_PASSWORD" \
  "SELECT pg_get_userbyid(relowner) FROM pg_class WHERE relname='role_probe_future'")
if [[ "$owner" == "synapse_owner" ]]; then
  echo "  ok:   new table is owned by synapse_owner (got: $owner)"
else
  echo "  FAIL: new table is owned by '$owner', expected synapse_owner"
  failures=$((failures + 1))
fi
must_succeed "app can INSERT into it"  synapse_app "$SYNAPSE_APP_PASSWORD" \
  "INSERT INTO role_probe_future (note) VALUES ('inherited grant')"
must_succeed "app can SELECT from it"  synapse_app "$SYNAPSE_APP_PASSWORD" \
  "SELECT count(*) FROM role_probe_future"
must_fail    "app still cannot ALTER it" synapse_app "$SYNAPSE_APP_PASSWORD" \
  "ALTER TABLE role_probe_future ADD COLUMN probe text"
must_succeed "migration drops it"      synapse_migrate "$SYNAPSE_MIGRATE_PASSWORD" \
  "DROP TABLE role_probe_future"

echo
echo "=== cleanup ==="
docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -q \
  -c "DELETE FROM telemetry_events WHERE event_name = 'role_probe'" >/dev/null 2>&1 || true
echo "  probe rows removed"

echo
echo "=== KNOWN GAP, reported rather than hidden ==="
rls=$(docker exec -i "$CONTAINER" psql -U "$SUPERUSER" -d "$DATABASE" -At -c \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relrowsecurity")
echo "  tables with row-level security enabled: $rls"
cat <<'NOTE'
  synapse_app can read every row of every tenant. Tenant isolation is enforced
  in the application (role -> permission -> ownership -> tenant -> scope), and
  backend/tests/test_access_control_negative.py covers it -- including a parent
  reaching for another family's child. It is NOT enforced by the database.

  Closing that gap means row-level security policies keyed off a per-request
  `SET LOCAL app.current_user_id`, which changes how every connection is checked
  out of the pool. It is a separate, reviewable change and is deliberately not
  bundled with the role split.
NOTE

echo
if (( failures )); then
  echo "=== $failures of $checks CHECKS FAILED ==="
  exit 1
fi
echo "=== ALL $checks CHECKS PASSED ==="
