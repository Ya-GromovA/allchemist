#!/usr/bin/env bash
# Verify the Alembic revision chain against production WITHOUT touching
# production.
#
#   tools/db/verify_migration.sh [dump_file]
#
# Spins up a throwaway postgres:16 on 127.0.0.1:5434, restores a production dump
# into `clone`, runs `alembic upgrade head` into an empty `migrated`, and
# compares the two schemas two independent ways (pg_dump text + catalog
# fingerprint). Then exercises downgrade->upgrade and the autogenerate guard.
#
# Exit 0 only if every gate passes. Always tears the container down.
set -euo pipefail

CONTAINER=pg-verify
PORT=5434
REPO_ROOT=/root/synapse
BACKEND="$REPO_ROOT/backend"
URL="postgresql+psycopg://postgres:verify@127.0.0.1:${PORT}/migrated"

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

echo "=== resources before ==="
free -h | head -2
df -h / | tail -1

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=verify \
  -p "127.0.0.1:${PORT}:5432" postgres:16 >/dev/null
for _ in $(seq 1 60); do docker exec "$CONTAINER" pg_isready -U postgres -q && break; sleep 1; done

docker exec "$CONTAINER" psql -U postgres -q -c 'CREATE DATABASE clone'
docker exec "$CONTAINER" psql -U postgres -q -c 'CREATE DATABASE migrated'
docker exec -i "$CONTAINER" pg_restore -U postgres -d clone --no-owner --no-privileges < "$DUMP"

echo
echo "=== GATE 1: alembic upgrade head on an empty database ==="
cd "$BACKEND"
ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic upgrade head

echo
echo "=== GATE 2a: pending revisions applied to the production clone ==="
# The clone carries production's alembic_version, so `upgrade head` here runs
# exactly the revisions that are not yet in production -- against production
# data, with its real row counts and real constraint violations if any. This is
# the rehearsal; the diff below only proves the result is the same schema a
# from-scratch build produces.
before_rev=$(docker exec "$CONTAINER" psql -U postgres -d clone -At -c   "select version_num from alembic_version" 2>/dev/null || echo "<none>")
echo "clone is at revision: $before_rev"
CLONE_URL="postgresql+psycopg://postgres:verify@127.0.0.1:${PORT}/clone"
ALEMBIC_DATABASE_URL="$CLONE_URL" .venv-test/bin/alembic upgrade head
after_rev=$(docker exec "$CONTAINER" psql -U postgres -d clone -At -c   "select version_num from alembic_version")
echo "clone is now at revision: $after_rev"

echo
echo "=== GATE 2b: pg_dump structural diff (upgraded clone vs from-scratch) ==="
"$REPO_ROOT/tools/db/schema_diff.sh" "$CONTAINER" clone migrated postgres

echo
echo "=== GATE 3: runtime DDL in app/db/init_db.py must be a no-op on the baseline ==="
# ENV=prod only to silence SQLAlchemy statement echo, which is on when ENV=dev.
ENV=prod DATABASE_URL="postgresql+psycopg://postgres:verify@127.0.0.1:${PORT}/migrated" \
  .venv-test/bin/python -c 'from app.db.init_db import init_db; init_db(); print("init_db() completed")'
"$REPO_ROOT/tools/db/schema_diff.sh" "$CONTAINER" clone migrated postgres

echo
echo "=== GATE 4: downgrade base -> upgrade head round trip ==="
ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic downgrade base
docker exec "$CONTAINER" psql -U postgres -d migrated -At -c \
  "select count(*) || ' tables left after downgrade' from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"
ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic upgrade head
"$REPO_ROOT/tools/db/schema_diff.sh" "$CONTAINER" clone migrated postgres

echo
echo "=== GATE 5: offline (--sql) mode produces a full script ==="
ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic upgrade base:head --sql 2>/dev/null \
  | grep -c . | sed 's/$/ SQL lines emitted/'

echo
echo "=== GATE 6: --autogenerate is refused ==="
# Capture first: alembic exits non-zero here by design, and `set -o pipefail`
# would make `alembic | grep -q` report that failure instead of the match.
before=$(ls -1 alembic/versions/*.py | wc -l)
autogen_out=$(ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic revision --autogenerate -m refused 2>&1 || true)
after=$(ls -1 alembic/versions/*.py | wc -l)

if ! grep -q 'autogenerate is disabled' <<<"$autogen_out"; then
  echo "FAIL: autogenerate was not refused" >&2
  echo "$autogen_out" | tail -5 >&2
  exit 1
fi
if [[ "$before" != "$after" ]]; then
  echo "FAIL: autogenerate was refused but still wrote a revision file" >&2
  exit 1
fi
echo "OK: refused, and no revision file was written ($after revision(s) on disk)"

echo
echo "=== ALL GATES PASSED ==="
