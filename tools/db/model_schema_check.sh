#!/usr/bin/env bash
# Prove that the SQLAlchemy model layer describes the migrated schema exactly.
#
#   tools/db/model_schema_check.sh <container> <migrated_db> [pg_user] [port]
#
# The model layer used to be a fiction: one class, on one of twenty-two tables,
# with columns that table has never had. A model layer nobody checks drifts
# within a week, so this is a gate rather than a convention.
#
# Method: create a scratch database, let `Base.metadata.create_all()` build the
# schema from the models alone, then compare the catalogue fingerprints
# (columns, constraints, indexes) of the scratch database and the migrated one.
# Exit 0 only if the fingerprints are byte-identical.
set -euo pipefail

CONTAINER="${1:?container name required}"
MIGRATED_DB="${2:?migrated database name required}"
PGUSER_ARG="${3:-postgres}"
PORT="${4:-5434}"

REPO_ROOT=/root/synapse
BACKEND="$REPO_ROOT/backend"
SCRATCH_DB=from_models

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

docker exec "$CONTAINER" psql -U "$PGUSER_ARG" -q -c "DROP DATABASE IF EXISTS $SCRATCH_DB"
docker exec "$CONTAINER" psql -U "$PGUSER_ARG" -q -c "CREATE DATABASE $SCRATCH_DB"

# The models use gen_random_uuid() (pgcrypto) and gin_trgm_ops (pg_trgm), which
# production already carries. The baseline revision installs them; create_all
# does not, so the scratch database gets them here.
docker exec "$CONTAINER" psql -U "$PGUSER_ARG" -d "$SCRATCH_DB" -q \
  -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto'

cd "$BACKEND"
ENV=prod DATABASE_URL="postgresql+psycopg://${PGUSER_ARG}:verify@127.0.0.1:${PORT}/${SCRATCH_DB}" \
  .venv-test/bin/python - <<'PY'
from sqlalchemy import create_engine

from app.core.config import resolve_database_url
from app.db.base import Base
import app.models  # noqa: F401  -- registers every table on Base.metadata

engine = create_engine(resolve_database_url())
Base.metadata.create_all(bind=engine)
engine.dispose()
print(f"create_all(): {len(Base.metadata.sorted_tables)} tables built from the model layer")
PY

fingerprint() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER_ARG" -d "$1" -X -q -f - \
    < "$REPO_ROOT/tools/db/catalog_fingerprint.sql"
}

fingerprint "$SCRATCH_DB" > "$WORKDIR/models.txt"
fingerprint "$MIGRATED_DB" > "$WORKDIR/migrated.txt"

echo "== models:   $(grep -c . "$WORKDIR/models.txt") catalogue entries"
echo "== migrated: $(grep -c . "$WORKDIR/migrated.txt") catalogue entries"

if diff -u "$WORKDIR/migrated.txt" "$WORKDIR/models.txt" > "$WORKDIR/diff.txt"; then
  echo "== MODEL/SCHEMA DIFF: EMPTY -- app/models describes the migrated schema exactly"
  docker exec "$CONTAINER" psql -U "$PGUSER_ARG" -q -c "DROP DATABASE $SCRATCH_DB"
  exit 0
fi

echo "== MODEL/SCHEMA DIFF: $(grep -c -E '^[+-][^+-]' "$WORKDIR/diff.txt") changed entries"
echo "   '-' = present in the migrated schema, missing or different in the models"
echo "   '+' = produced by the models, absent or different in the migrated schema"
cat "$WORKDIR/diff.txt"
docker exec "$CONTAINER" psql -U "$PGUSER_ARG" -q -c "DROP DATABASE $SCRATCH_DB"
exit 1
