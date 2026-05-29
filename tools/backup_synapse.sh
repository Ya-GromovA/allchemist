#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-/root/synapse/backups}"
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

DB_DUMP="$OUT_DIR/synapse-db-$TS.sql.gz"
STATE_DUMP="$OUT_DIR/synapse-state-$TS.json"
MANIFEST="$OUT_DIR/synapse-backup-$TS.manifest.sha256"
STATE_PATH="${SYNAPSE_STATE_PATH:-/root/synapse/backend/data/user_state.json}"

docker exec synapse-db pg_dump -U synapse -d synapse | gzip -9 > "$DB_DUMP"
cp "$STATE_PATH" "$STATE_DUMP"
sha256sum "$DB_DUMP" "$STATE_DUMP" > "$MANIFEST"
chmod 600 "$DB_DUMP" "$STATE_DUMP" "$MANIFEST"

echo "Backup created:"
echo "  $DB_DUMP"
echo "  $STATE_DUMP"
echo "  $MANIFEST"
