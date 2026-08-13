#!/usr/bin/env bash
# Structural schema diff between two databases living in the same container.
#
#   schema_diff.sh <container> <db_a> <db_b> [pg_user]
#
# Exit 0 = schemas are structurally identical. Exit 1 = they differ, and the
# unified diff is printed. `alembic_version` is excluded, since it exists only
# in the migrated database by construction.
set -euo pipefail

CONTAINER="${1:?container name required}"
DB_A="${2:?first database required}"
DB_B="${3:?second database required}"
PGUSER_ARG="${4:-postgres}"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

normalize() {
  # Drop everything that legitimately differs between two dumps of the same
  # structure: psql restrict tokens (random per dump), the header comment block,
  # and blank-line noise.
  grep -v -E '^\\(un)?restrict ' \
    | grep -v -E '^-- (Dumped|Name: EXTENSION|PostgreSQL database dump)' \
    | grep -v -E '^-- Name: [^;]*; Type: [A-Z ]+; Schema: [^;]*; Owner:' \
    | grep -v -E '^--$' \
    | grep -v -E '^\s*$'
}

dump_schema() {
  docker exec "$CONTAINER" pg_dump \
    -U "$PGUSER_ARG" \
    -d "$1" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --exclude-table=alembic_version \
  | normalize
}

dump_schema "$DB_A" > "$WORKDIR/a.sql"
dump_schema "$DB_B" > "$WORKDIR/b.sql"

echo "== $DB_A: $(wc -l < "$WORKDIR/a.sql") normalized DDL lines"
echo "== $DB_B: $(wc -l < "$WORKDIR/b.sql") normalized DDL lines"

if diff -u "$WORKDIR/a.sql" "$WORKDIR/b.sql" > "$WORKDIR/diff.txt"; then
  echo "== STRUCTURAL DIFF: EMPTY -- $DB_A and $DB_B are identical"
  exit 0
fi

echo "== STRUCTURAL DIFF: $(grep -c -E '^[+-][^+-]' "$WORKDIR/diff.txt") changed lines"
cat "$WORKDIR/diff.txt"
exit 1
