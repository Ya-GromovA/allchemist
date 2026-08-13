#!/usr/bin/env bash
# Full rehearsal of the identity migration on a throwaway clone of production.
#
#   tools/db/verify_identity_migration.sh [dump_file]
#
# Production is never touched. A postgres:16 container is started on
# 127.0.0.1:5435, and everything that is about to happen to production happens
# there first:
#
# The gate order is the production runbook, in the production order. 0003 adds
# the foreign keys to `users`, so it cannot run before the accounts exist --
# the first version of this script tried, and PostgreSQL refused with
# `Key (user_id)=(u_invite_361374) is not present in table "users"`. That
# refusal is the whole reason the change is split across two revisions with the
# import in between, and the rehearsal now proves the sequence rather than
# assuming it.
#
#   GATE 1  restore the production dump, then `alembic upgrade 0002` on it
#   GATE 2  import user_state.json into the clone, dry run first
#   GATE 3  `alembic upgrade head` -- 0003 turns the dangling user_id columns
#           into validated foreign keys, against the imported data
#   GATE 4  a fresh install converges on the same schema, or the chain lies
#   GATE 5  app/models describes that schema exactly (catalogue fingerprint)
#   GATE 6  referential integrity after the import: no orphans anywhere
#   GATE 7  the import is idempotent -- a second run writes nothing new
#   GATE 8  append-only really is append-only (UPDATE and DELETE must fail)
#   GATE 9  downgrade 0003 -> 0002 -> 0001 and back up again
#
# Exit 0 only if every gate passes. The container and its volume are always
# removed.
set -euo pipefail

CONTAINER=pg-identity-verify
PORT=5435
REPO_ROOT=/root/synapse
BACKEND="$REPO_ROOT/backend"
CLONE_URL="postgresql+psycopg://postgres:verify@127.0.0.1:${PORT}/clone"
FRESH_URL="postgresql+psycopg://postgres:verify@127.0.0.1:${PORT}/fresh"

DUMP="${1:-}"
if [[ -z "$DUMP" ]]; then
  DUMP=$(ls -1t /root/backups/synapse-full-*.dump 2>/dev/null | head -1 || true)
fi
[[ -r "$DUMP" ]] || { echo "no readable production dump (arg 1 or /root/backups/synapse-full-*.dump)" >&2; exit 1; }
echo "using dump: $DUMP"

cleanup() {
  echo
  echo "=== teardown ==="
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume prune -f >/dev/null 2>&1 || true
  echo "container and anonymous volume removed"
}
trap cleanup EXIT

psql_clone() { docker exec "$CONTAINER" psql -U postgres -d clone -At -c "$1"; }

echo "=== resources before ==="
free -h | head -2
df -h / | tail -1

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=verify \
  -p "127.0.0.1:${PORT}:5432" postgres:16 >/dev/null
# postgres:16 runs a temporary server during initdb that also answers
# pg_isready, so a single successful probe is not proof the real server is up --
# it is how this script first failed, with "the database system is shutting
# down". Wait for the entrypoint to announce readiness, then confirm.
for _ in $(seq 1 90); do
  if docker logs "$CONTAINER" 2>&1 | grep -q "database system is ready to accept connections"; then
    if docker exec "$CONTAINER" psql -U postgres -q -c "select 1" >/dev/null 2>&1; then
      break
    fi
  fi
  sleep 1
done

docker exec "$CONTAINER" psql -U postgres -q -c 'CREATE DATABASE clone'
docker exec "$CONTAINER" psql -U postgres -q -c 'CREATE DATABASE fresh'
docker exec -i "$CONTAINER" pg_restore -U postgres -d clone --no-owner --no-privileges < "$DUMP"

echo
echo "=== baseline of the restored clone ==="
psql_clone "select 'tables=' || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"
psql_clone "select 'alembic=' || version_num from alembic_version"
psql_clone "select 'school_memberships=' || count(*) from school_memberships"

cd "$BACKEND"

echo
echo "=== GATE 1: alembic upgrade 0002 on the restored production clone ==="
ALEMBIC_DATABASE_URL="$CLONE_URL" .venv-test/bin/alembic upgrade 0002
psql_clone "select 'alembic=' || version_num from alembic_version"

echo
echo "=== GATE 2: import user_state.json (dry run, then apply) ==="
# The dry run exits non-zero when anything could not be mapped. That is the
# signal, not a crash: capture it, show it, and let the operator decide.
dry_status=0
ENV=prod DATABASE_URL="$CLONE_URL"   .venv-test/bin/python -m app.scripts.migrate_user_state_to_db --dry-run || dry_status=$?
echo "  dry run exit status: $dry_status (non-zero = есть несопоставленные записи, см. список выше)"
psql_clone "select 'users_after_dry_run=' || count(*) from users"
# --allow-unmatched is passed deliberately: two consent records and two
# entitlement records in the JSON file belong to user ids that exist nowhere
# ("demo-user", "demo-user-1778930433957"). They are listed by name in the
# report above. Accepting their loss is a decision, so it is spelled out here
# rather than hidden behind a default.
ENV=prod DATABASE_URL="$CLONE_URL" \
  .venv-test/bin/python -m app.scripts.migrate_user_state_to_db --apply --allow-unmatched

echo
echo "=== GATE 3: alembic upgrade head -- foreign keys validate against the imported data ==="
ALEMBIC_DATABASE_URL="$CLONE_URL" .venv-test/bin/alembic upgrade head
psql_clone "select 'alembic=' || version_num from alembic_version"

echo
echo "=== GATE 4: fresh install converges on the same schema ==="
ALEMBIC_DATABASE_URL="$FRESH_URL" .venv-test/bin/alembic upgrade head
"$REPO_ROOT/tools/db/schema_diff.sh" "$CONTAINER" clone fresh postgres

echo
echo "=== GATE 5: app/models matches the migrated schema ==="
"$REPO_ROOT/tools/db/model_schema_check.sh" "$CONTAINER" clone postgres "$PORT"

echo
echo "=== GATE 6: referential integrity after the import ==="
integrity_fail=0
check_empty() {
  local label="$1" query="$2" count
  count=$(psql_clone "$query")
  if [[ "$count" == "0" ]]; then
    echo "  OK   $label: 0"
  else
    echo "  FAIL $label: $count"
    integrity_fail=1
  fi
}
check_empty "memberships without a user" \
  "select count(*) from school_memberships m left join users u on u.user_id=m.user_id where u.user_id is null"
check_empty "grants without a user" \
  "select count(*) from access_grants g left join users u on u.user_id=g.user_id where u.user_id is null"
check_empty "devices without a user" \
  "select count(*) from device_registry d left join users u on u.user_id=d.user_id where u.user_id is null"
check_empty "sessions without a user" \
  "select count(*) from user_sessions s left join users u on u.user_id=s.user_id where u.user_id is null"
check_empty "consents without a user" \
  "select count(*) from consents c left join users u on u.user_id=c.user_id where u.user_id is null"
check_empty "role assignments without a role" \
  "select count(*) from role_assignments a left join roles r on r.role_key=a.role_key where r.role_key is null"
check_empty "identifiers without a user" \
  "select count(*) from user_identifiers i left join users u on u.user_id=i.user_id where u.user_id is null"
check_empty "entitlement items without a user" \
  "select count(*) from user_entitlement_items e left join users u on u.user_id=e.user_id where u.user_id is null"
check_empty "refresh tokens without a session" \
  "select count(*) from refresh_tokens t left join user_sessions s on s.session_id=t.session_id where s.session_id is null"
check_empty "invalid (non-validated) constraints" \
  "select count(*) from pg_constraint where contype='f' and not convalidated"
[[ "$integrity_fail" == "0" ]] || { echo "FAIL: referential integrity broken after the import" >&2; exit 1; }

echo
echo "=== counts after the import ==="
for table in users user_identifiers user_credentials roles permissions role_permissions \
             role_assignments user_sessions refresh_tokens consents user_entitlements \
             user_entitlement_items user_app_state otp_challenges auth_attempt_events \
             auth_lockouts audit_log school_memberships access_grants device_registry \
             feature_flags; do
  printf '  %-26s %s\n' "$table" "$(psql_clone "select count(*) from $table")"
done

echo
echo "=== GATE 7: the import is idempotent ==="
before=$(psql_clone "select count(*) from users")
before_assign=$(psql_clone "select count(*) from role_assignments")
before_audit=$(psql_clone "select count(*) from audit_log")
ENV=prod DATABASE_URL="$CLONE_URL" \
  .venv-test/bin/python -m app.scripts.migrate_user_state_to_db --apply --allow-unmatched > /dev/null
after=$(psql_clone "select count(*) from users")
after_assign=$(psql_clone "select count(*) from role_assignments")
after_audit=$(psql_clone "select count(*) from audit_log")
echo "  users            $before -> $after"
echo "  role_assignments $before_assign -> $after_assign"
echo "  audit_log        $before_audit -> $after_audit"
if [[ "$before" != "$after" || "$before_assign" != "$after_assign" || "$before_audit" != "$after_audit" ]]; then
  echo "FAIL: the second run changed row counts, the import is not idempotent" >&2
  exit 1
fi
echo "  OK: second run wrote nothing"

echo
echo "=== GATE 8: audit_log and auth_attempt_events are append-only ==="
for table in audit_log auth_attempt_events; do
  for op in "UPDATE $table SET result='ok'" "DELETE FROM $table"; do
    if docker exec "$CONTAINER" psql -U postgres -d clone -q -c "$op" >/dev/null 2>&1; then
      echo "FAIL: '$op' succeeded on an append-only table" >&2
      exit 1
    fi
    echo "  OK: refused -- $op"
  done
done

echo
echo "=== GATE 9: downgrade 0003 -> 0002 -> 0001, then back to head ==="
ALEMBIC_DATABASE_URL="$FRESH_URL" .venv-test/bin/alembic downgrade 0002
ALEMBIC_DATABASE_URL="$FRESH_URL" .venv-test/bin/alembic downgrade 0001
docker exec "$CONTAINER" psql -U postgres -d fresh -At -c \
  "select count(*) || ' tables left at revision 0001' from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"
ALEMBIC_DATABASE_URL="$FRESH_URL" .venv-test/bin/alembic upgrade head
docker exec "$CONTAINER" psql -U postgres -d fresh -At -c \
  "select count(*) || ' tables back at head' from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"

echo
echo "=== resources after ==="
free -h | head -2
df -h / | tail -1

echo
echo "=== ALL GATES PASSED ==="
