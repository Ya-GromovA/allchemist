#!/usr/bin/env bash
# Guarded deploy of the Allchemist backend container.
#
# WHY THIS EXISTS
# ---------------
# Deploying a backend image whose alembic revisions do not cover the revision
# the live database is stamped at produces a container that cannot start:
# the entrypoint runs `alembic upgrade head`, fails to locate the revision and
# exits 1, leaving allchemist.ru and api.allchemist.ru at 502. That happened on
# 2026-08-14. This script makes the check mandatory instead of remembered.
#
# It refuses to touch production unless, in order:
#   1. a fresh database dump exists and is restorable,
#   2. the candidate image contains every revision in the repo,
#   3. the candidate image contains the revision the live database is stamped at,
#   4. the migration chain is linear with a single head.
# After the swap it verifies health, control counts, and -- critically -- that
# the container survives a restart.
#
# Usage:
#   tools/db/deploy_backend.sh --image REF [--skip-backup] [--yes]
#   tools/db/deploy_backend.sh --build          # build from repo, then deploy
set -uo pipefail

REPO=${REPO:-/root/synapse}
COMPOSE="docker compose -f $REPO/infra/docker-compose.yml"
BACKEND_CONTAINER=${BACKEND_CONTAINER:-synapse-backend}
DB_CONTAINER=${DB_CONTAINER:-synapse-db}
DB_USER=${DB_USER:-synapse}
DB_NAME=${DB_NAME:-synapse}
LIVE_TAG=${LIVE_TAG:-infra-synapse-backend:latest}
BACKUP_DIR=${BACKUP_DIR:-/root/backups}
CHECK="$REPO/tools/db/check_migration_coverage.sh"

IMAGE_REF=""
DO_BUILD=0
SKIP_BACKUP=0
ASSUME_YES=0

step() { printf '\n=== %s ===\n' "$*"; }
ok()   { printf '  OK: %s\n' "$*"; }
abort(){ printf '\nDEPLOY ABORTED: %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --image)       IMAGE_REF=${2:-}; shift 2 ;;
    --build)       DO_BUILD=1; shift ;;
    --skip-backup) SKIP_BACKUP=1; shift ;;
    --yes|-y)      ASSUME_YES=1; shift ;;
    *) abort "unknown argument: $1" ;;
  esac
done

[ -x "$CHECK" ] || abort "migration coverage check not found or not executable: $CHECK"

# ---------------------------------------------------------------------------
step "0. Candidate image"

if [ "$DO_BUILD" -eq 1 ]; then
  IMAGE_REF="allchemist-backend:build-$(date +%Y%m%d-%H%M%S)"
  echo "building $IMAGE_REF from $REPO/backend"
  docker build -t "$IMAGE_REF" -f "$REPO/backend/Dockerfile" "$REPO/backend" >/dev/null \
    || abort "image build failed"
  ok "built $IMAGE_REF"
fi

[ -n "$IMAGE_REF" ] || abort "no image: pass --image REF or --build"
docker image inspect "$IMAGE_REF" >/dev/null 2>&1 || abort "no such image: $IMAGE_REF"
ok "candidate: $IMAGE_REF"

CURRENT_IMAGE=$(docker inspect "$BACKEND_CONTAINER" --format '{{.Image}}' 2>/dev/null || echo "")
[ -n "$CURRENT_IMAGE" ] && ok "currently running: $CURRENT_IMAGE"

# ---------------------------------------------------------------------------
step "1. Control counts before deploy"

counts_now() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "select count(*) from users" 2>/dev/null | tr -d '[:space:]'
}
COUNT_USERS_BEFORE=$(counts_now)
[ -n "$COUNT_USERS_BEFORE" ] || abort "cannot read control counts from $DB_CONTAINER"
DB_VERSION_BEFORE=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  'select version_num from alembic_version' | tr -d '[:space:]')
ok "users=$COUNT_USERS_BEFORE alembic_version=$DB_VERSION_BEFORE"

# ---------------------------------------------------------------------------
step "2. Backup"

if [ "$SKIP_BACKUP" -eq 1 ]; then
  echo "  SKIPPED by --skip-backup (only acceptable when a fresh dump already exists)"
else
  TS=$(date +%Y%m%d-%H%M%S)
  DUMP="$BACKUP_DIR/synapse-predeploy-$TS.dump"
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DUMP" \
    || abort "pg_dump failed"
  docker exec -i "$DB_CONTAINER" pg_restore -l < "$DUMP" >/dev/null \
    || abort "dump is not readable by pg_restore -- refusing to deploy without a usable backup"
  ok "backup verified: $DUMP ($(stat -c%s "$DUMP") bytes)"
fi

# ---------------------------------------------------------------------------
step "3. GATE: migration chain integrity"
"$CHECK" --chain "$REPO/backend/alembic/versions" || abort "migration chain is broken"

step "4. GATE: image contains every repo revision"
"$CHECK" --repo "$REPO/backend/alembic/versions" --image-ref "$IMAGE_REF" \
  || abort "candidate image does not ship every revision in the repo"

step "5. GATE: image covers the revision the live database is stamped at"
"$CHECK" --image "$IMAGE_REF" --db-container "$DB_CONTAINER" \
  || abort "candidate image cannot migrate the live database -- this is the 2026-08-14 failure; do NOT restart the container"

# ---------------------------------------------------------------------------
step "6. Canary against the live database (read-only)"
NET=$(docker inspect "$BACKEND_CONTAINER" \
  --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null)
[ -n "$NET" ] || NET=infra_default

CANARY_OUT=$(docker run --rm --network "$NET" \
  --env-file "$REPO/infra/db.env" --env-file "$REPO/infra/.env" \
  -e POSTGRES_HOST="$DB_CONTAINER" -e POSTGRES_PORT=5432 \
  --entrypoint sh "$IMAGE_REF" -c 'alembic current' 2>&1 | tail -1)
echo "  canary says: $CANARY_OUT"
echo "$CANARY_OUT" | grep -q '(head)' \
  || abort "canary did not report a head revision: $CANARY_OUT"
ok "canary reports head"

# ---------------------------------------------------------------------------
if [ "$ASSUME_YES" -ne 1 ]; then
  step "All gates passed. Proceed with the swap?"
  printf '  type yes to continue: '
  read -r answer
  [ "$answer" = "yes" ] || abort "operator declined"
fi

# ---------------------------------------------------------------------------
step "7. Swap"
ROLLBACK_TAG="allchemist-backend:rollback-$(date +%Y%m%d-%H%M%S)"
if [ -n "$CURRENT_IMAGE" ]; then
  docker tag "$CURRENT_IMAGE" "$ROLLBACK_TAG"
  ok "previous image tagged $ROLLBACK_TAG"
  echo "  rollback: docker tag $ROLLBACK_TAG $LIVE_TAG && $COMPOSE up -d --no-build --force-recreate $BACKEND_CONTAINER"
fi
docker tag "$IMAGE_REF" "$LIVE_TAG"
$COMPOSE up -d --no-build --force-recreate "$BACKEND_CONTAINER" >/dev/null 2>&1 \
  || abort "compose failed to recreate the container"

for _ in $(seq 1 40); do
  st=$(docker inspect "$BACKEND_CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null)
  [ "$st" = "healthy" ] && break
  sleep 2
done
[ "$st" = "healthy" ] || {
  docker logs --tail 30 "$BACKEND_CONTAINER"
  abort "container did not become healthy -- roll back with the command printed above"
}
ok "container healthy"

# ---------------------------------------------------------------------------
step "8. Post-deploy verification"

VER_AFTER=$(docker exec "$BACKEND_CONTAINER" alembic current 2>/dev/null | tail -1)
echo "  alembic current: $VER_AFTER"

for probe in \
  "http://127.0.0.1:8000/api/v1/health|local api"; do
  url=${probe%%|*}; name=${probe##*|}
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  echo "  $name: $code"
  [ "$code" = "200" ] || abort "$name returned $code"
done

for host in allchemist.ru api.allchemist.ru; do
  path=/; [ "$host" = "api.allchemist.ru" ] && path=/api/v1/health
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" -k "https://127.0.0.1$path")
  echo "  $host$path: $code"
  [ "$code" = "200" ] || abort "$host returned $code"
done

COUNT_USERS_AFTER=$(counts_now)
echo "  users before=$COUNT_USERS_BEFORE after=$COUNT_USERS_AFTER"
[ "$COUNT_USERS_BEFORE" = "$COUNT_USERS_AFTER" ] \
  || abort "control count changed: users $COUNT_USERS_BEFORE -> $COUNT_USERS_AFTER"
ok "control counts unchanged"

# ---------------------------------------------------------------------------
step "9. Restart survival (the check that was missing on 2026-08-14)"
docker restart "$BACKEND_CONTAINER" >/dev/null
for _ in $(seq 1 40); do
  st=$(docker inspect "$BACKEND_CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null)
  [ "$st" = "healthy" ] && break
  sleep 2
done
[ "$st" = "healthy" ] || {
  docker logs --tail 30 "$BACKEND_CONTAINER"
  abort "container does NOT survive a restart -- the deployed image is unsafe"
}
code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/v1/health)
[ "$code" = "200" ] || abort "health returned $code after restart"
ok "container survives a restart and serves 200"

step "DEPLOY COMPLETE"
echo "  image:    $IMAGE_REF"
echo "  rollback: docker tag $ROLLBACK_TAG $LIVE_TAG && $COMPOSE up -d --no-build --force-recreate $BACKEND_CONTAINER"
