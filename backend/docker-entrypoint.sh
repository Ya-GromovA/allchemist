#!/bin/sh
# Container entrypoint for the Allchemist backend.
#
# The schema is brought to head by Alembic BEFORE the application starts. If the
# migration fails, the container exits non-zero and never serves traffic; it
# does not come up half-migrated. `python -m app.db.migrate` takes a PostgreSQL
# advisory lock, so two containers starting at the same time cannot overlap.
set -eu

echo "[entrypoint] applying database migrations (alembic upgrade head)"
python -m app.db.migrate

echo "[entrypoint] schema is at head, starting application: $*"
exec "$@"
