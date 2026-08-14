#!/usr/bin/env bash
# Disposable PostgreSQL for the test-suite.
#
#   tools/db/test_db.sh up      # start, migrate to head, print the URL
#   tools/db/test_db.sh url     # print the URL of a running instance
#   tools/db/test_db.sh down    # remove the container and its volume
#   tools/db/test_db.sh run …   # start if needed, run "…" with DATABASE_URL set
#
# Why this exists
# ---------------
# The suite used to run against 127.0.0.1:5433 -- the production database -- and
# against backend/data/user_state.json, the production state file. That was
# survivable only while the write path was a JSON file nobody trusted. Now that
# registration, sessions and consents are real rows, a test run would create
# real accounts in production. So the suite gets its own server, on its own
# port, migrated from the same revision chain, and thrown away afterwards.
set -euo pipefail

CONTAINER=pg-test
PORT=5435
REPO_ROOT=/root/synapse
BACKEND="$REPO_ROOT/backend"
URL="postgresql+psycopg://postgres:test@127.0.0.1:${PORT}/synapse_test"

cmd="${1:-up}"
shift || true

case "$cmd" in
  url)
    echo "$URL"
    ;;

  down)
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker volume prune -f >/dev/null 2>&1 || true
    echo "test database removed"
    ;;

  up|run)
    if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1; then
      docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
      # 192 MB shared buffers is plenty for a schema-only database and keeps the
      # footprint inside the budget documented in the delivery contract.
      docker run -d --name "$CONTAINER" \
        -e POSTGRES_PASSWORD=test \
        -e POSTGRES_DB=synapse_test \
        --memory=512m \
        -p "127.0.0.1:${PORT}:5432" postgres:16 >/dev/null
      for _ in $(seq 1 60); do
        docker exec "$CONTAINER" pg_isready -U postgres -q && break
        sleep 1
      done
      ( cd "$BACKEND" && ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic upgrade head >/dev/null )
      echo "test database ready at revision $(docker exec "$CONTAINER" psql -U postgres -d synapse_test -At -c 'select version_num from alembic_version')" >&2
    fi

    if [[ "$cmd" == "up" ]]; then
      echo "$URL"
    else
      # A fresh schema for every run. The rate limiter, the OTP window and the
      # unique constraints are real now, so a database left over from the last
      # run makes the next one fail for reasons that have nothing to do with the
      # code under test. That is what a shared fixture database buys you.
      docker exec "$CONTAINER" psql -U postgres -d postgres -q \
        -c "DROP DATABASE IF EXISTS synapse_test WITH (FORCE)" >/dev/null
      docker exec "$CONTAINER" psql -U postgres -d postgres -q \
        -c "CREATE DATABASE synapse_test" >/dev/null
      ( cd "$BACKEND" && ALEMBIC_DATABASE_URL="$URL" .venv-test/bin/alembic upgrade head >/dev/null 2>&1 )
      cd "$BACKEND"
      DATABASE_URL="$URL" ALEMBIC_DATABASE_URL="$URL" ALLCHEMIST_TEST_DB=1 "$@"
    fi
    ;;

  *)
    echo "usage: $0 {up|url|down|run <command…>}" >&2
    exit 2
    ;;
esac
