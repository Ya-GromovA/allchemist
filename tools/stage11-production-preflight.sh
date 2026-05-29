#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/root/synapse}"
API_BASE="${API_BASE:-https://api.allchemist.ru/api/v1}"

ok() { printf 'OK: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

test -d "$ROOT_DIR" || fail "ROOT_DIR not found: $ROOT_DIR"
test -f "$ROOT_DIR/infra/docker-compose.yml" || fail "docker compose file missing"
test -f "$ROOT_DIR/content_packs/allchemist-apk-latest.json" || fail "APK latest metadata missing"

python3 - <<'PY'
import json
from pathlib import Path
path = Path('/root/synapse/content_packs/allchemist-apk-latest.json')
data = json.loads(path.read_text(encoding='utf-8'))
required = ['versionName', 'versionCode', 'apkFile', 'sha256', 'size']
missing = [key for key in required if not data.get(key)]
if missing:
    raise SystemExit('missing APK metadata keys: ' + ', '.join(missing))
apk = path.parent / data['apkFile']
if not apk.exists():
    raise SystemExit('APK artifact missing: ' + str(apk))
if apk.stat().st_size != int(data['size']):
    raise SystemExit('APK size mismatch')
print('OK: APK metadata file is consistent')
PY

python3 - <<PY
import json, urllib.request
health = json.loads(urllib.request.urlopen('${API_BASE}/health', timeout=20).read().decode('utf-8'))
if health.get('status') != 'ok':
    raise SystemExit('health status is not ok: ' + repr(health))
print('OK: production health endpoint')
meta = json.loads(urllib.request.urlopen('${API_BASE}/content/downloads/apk/latest/metadata', timeout=30).read().decode('utf-8'))
for key in ['versionName', 'versionCode', 'fileName', 'sizeBytes', 'sha256']:
    if not meta.get(key):
        raise SystemExit('missing public APK metadata key: ' + key)
print('OK: public APK metadata endpoint')
PY

python3 - <<'PY'
import subprocess
cmd = ['docker', 'inspect', '-f', '{{.State.Health.Status}}', 'synapse-backend']
try:
    status = subprocess.check_output(cmd, text=True).strip()
except Exception as exc:
    raise SystemExit('cannot inspect synapse-backend health: ' + str(exc))
if status != 'healthy':
    raise SystemExit('synapse-backend is not healthy: ' + status)
print('OK: docker health is healthy')
PY

ok "production preflight completed"
