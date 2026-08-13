#!/usr/bin/env bash
# Run alembic against the PRODUCTION database from the host.
#
#   tools/db/alembic_prod.sh current
#   tools/db/alembic_prod.sh history
#   tools/db/alembic_prod.sh stamp head
#
# The connection string is assembled in-process from infra/db.env and exported
# to alembic via ALEMBIC_DATABASE_URL. It is never printed and never written to
# a file.
#
# infra/db.env is the single source of truth for POSTGRES_* since 2026-08-13:
# the same file feeds infra/docker-compose.yml (env_file) and
# backend/app/core/config.py, so this script, the test suite and the running
# container all target the same database with the same credentials. The file
# holds the HOST view of the connection (synapse-db publishes 5432 as
# 127.0.0.1:5433); the container overrides only host and port.
set -euo pipefail

REPO_ROOT=/root/synapse
BACKEND="$REPO_ROOT/backend"
ENV_FILE="$REPO_ROOT/infra/db.env"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "cannot read $ENV_FILE" >&2
  exit 1
fi

cd "$BACKEND"

ALEMBIC_DATABASE_URL=$("$BACKEND/.venv-test/bin/python" - "$ENV_FILE" <<'PY'
import pathlib
import sys
import urllib.parse

env = {}
for line in pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    env[key.strip()] = value.strip().strip('"').strip("'")

required = ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_PORT")
missing = [key for key in required if not env.get(key)]
if missing:
    sys.exit("missing keys in env file: " + ", ".join(missing))

user = urllib.parse.quote(env["POSTGRES_USER"], safe="")
password = urllib.parse.quote(env["POSTGRES_PASSWORD"], safe="")
host = env["POSTGRES_HOST"]
port = env["POSTGRES_PORT"]
print(f"postgresql+psycopg://{user}:{password}@{host}:{port}/{env['POSTGRES_DB']}")
PY
)
export ALEMBIC_DATABASE_URL

exec "$BACKEND/.venv-test/bin/alembic" "$@"
