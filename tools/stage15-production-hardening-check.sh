#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/root/synapse}"
API_BASE="${API_BASE:-https://api.allchemist.ru/api/v1}"
TMP_DIR="${TMP_DIR:-/tmp/synapse-stage15-hardening}"

ok() { printf 'OK: %s\n' "$1"; }
warn() { printf 'WARN: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

test -d "$ROOT_DIR" || fail "ROOT_DIR not found: $ROOT_DIR"
test -x "$ROOT_DIR/tools/stage11-production-preflight.sh" || fail "stage11 preflight is missing or not executable"
test -x "$ROOT_DIR/tools/backup_synapse.sh" || fail "backup script is missing or not executable"
test -f "$ROOT_DIR/docs/production-readiness-gate-ru.md" || fail "production readiness gate doc is missing"
test -f "$ROOT_DIR/tools/hardening-slo-alerts-backup-ru.md" || fail "SLO/alerts/backup hardening doc is missing"

"$ROOT_DIR/tools/stage11-production-preflight.sh"

python3 - <<'PY'
import os
from pathlib import Path

root = Path(os.environ.get("ROOT_DIR", "/root/synapse"))
defaults = {
    "POSTGRES_PASSWORD": {"synapse_password", "postgres", "password", "change-me", "changeme"},
    "JWT_SECRET": {"dev-jwt-secret-change-before-prod", "change-me", "changeme", "secret"},
}
problems = []
for rel in ("infra/.env", "backend/.env"):
    path = root / rel
    if not path.exists():
        problems.append(f"missing env file: {rel}")
        continue
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    for key, weak_values in defaults.items():
        value = values.get(key, "")
        if not value:
            problems.append(f"{rel}: {key} is empty")
        elif value in weak_values or len(value) < 24:
            problems.append(f"{rel}: {key} is default or too short")

if problems:
    raise SystemExit("production secret gate failed: " + "; ".join(problems))
print("OK: production env secrets are not default placeholders")
PY

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
"$ROOT_DIR/tools/backup_synapse.sh" "$TMP_DIR" >/tmp/synapse-stage15-backup.log

DB_DUMP="$(ls "$TMP_DIR"/synapse-db-*.sql.gz | sort | tail -n 1)"
STATE_DUMP="$(ls "$TMP_DIR"/synapse-state-*.json | sort | tail -n 1)"
MANIFEST="$(ls "$TMP_DIR"/synapse-backup-*.manifest.sha256 | sort | tail -n 1)"

gzip -t "$DB_DUMP"
python3 - <<PY
import json
from pathlib import Path
json.loads(Path("$STATE_DUMP").read_text(encoding="utf-8"))
print("OK: backup state JSON is readable")
PY
(cd "$TMP_DIR" && sha256sum -c "$(basename "$MANIFEST")") >/tmp/synapse-stage15-manifest-check.log
ok "backup archive, state JSON and manifest are restorable"

python3 - <<PY
import json
import urllib.request

base = "${API_BASE}"
health = json.loads(urllib.request.urlopen(f"{base}/health", timeout=20).read().decode("utf-8"))
if health.get("status") != "ok":
    raise SystemExit("health endpoint is not ok")
print("OK: public health endpoint is ok")
PY

if [ ! -d "$ROOT_DIR/.github/workflows" ]; then
  warn "CI/CD workflows are not present in this server checkout; external repo/provider setup is still required"
else
  ok "CI/CD workflow directory exists"
fi

warn "External monitoring provider, CDN/Object Storage, payment provider E2E and legal sign-off remain owner/provider actions"
ok "stage15 production hardening check completed"
