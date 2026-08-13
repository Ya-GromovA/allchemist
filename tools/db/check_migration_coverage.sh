#!/usr/bin/env bash
# Migration coverage check.
#
# WHY THIS EXISTS
# ---------------
# On 2026-08-14 production reached a state where the database was stamped at
# revision 0004 while the backend image shipped only revision 0001. The
# container kept serving traffic because it had been started before the drift
# appeared, but ANY restart would have run the entrypoint's `alembic upgrade
# head`, hit "Can't locate revision identified by '0004'", exited 1, and taken
# allchemist.ru and api.allchemist.ru to 502. The drift went unnoticed for six
# hours.
#
# This check makes that class of failure detectable in under a minute and
# blocks it at deploy time.
#
# MODES
# -----
#   --image REF          revisions shipped in image REF must cover the live DB
#   --running            revisions in the RUNNING backend container must cover
#                        the live DB (cheap; used by the per-minute watchdog)
#   --repo PATH          every revision file in the repo must be present in the
#                        image (catches .dockerignore / stale-build drift; CI)
#   --chain PATH         revision chain must be linear with exactly one head (CI)
#
# --image/--running compare against the live database and therefore need
# --db-container. --repo/--chain are offline and run anywhere, including CI.
#
# EXIT CODES
#   0  coverage holds
#   1  coverage broken -- a restart would fail, or a deploy would break restarts
#   2  usage / environment error (could not determine one of the two sides)
set -uo pipefail

BACKEND_CONTAINER=${BACKEND_CONTAINER:-synapse-backend}
DB_CONTAINER=${DB_CONTAINER:-synapse-db}
DB_USER=${DB_USER:-synapse}
DB_NAME=${DB_NAME:-synapse}
VERSIONS_DIR=${VERSIONS_DIR:-/app/alembic/versions}

MODE=""
IMAGE_REF=""
REPO_PATH=""
CHAIN_PATH=""
QUIET=0

die()  { printf 'check_migration_coverage: %s\n' "$*" >&2; exit 2; }
say()  { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; }

usage() {
  sed -n '2,40p' "$0"
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --image)        MODE=image;   IMAGE_REF=${2:-}; shift 2 ;;
    --running)      MODE=running; shift ;;
    --repo)         MODE=repo;    REPO_PATH=${2:-}; shift 2 ;;
    --chain)        MODE=chain;   CHAIN_PATH=${2:-}; shift 2 ;;
    --image-ref)    IMAGE_REF=${2:-}; shift 2 ;;
    --db-container) DB_CONTAINER=${2:-}; shift 2 ;;
    --backend)      BACKEND_CONTAINER=${2:-}; shift 2 ;;
    --quiet|-q)     QUIET=1; shift ;;
    -h|--help)      usage ;;
    *)              die "unknown argument: $1" ;;
  esac
done

[ -n "$MODE" ] || usage

# --- helpers ---------------------------------------------------------------

# Revision ids declared inside a container image, one per line.
revisions_in_image() {
  docker run --rm --entrypoint sh "$1" -c \
    "grep -h '^revision' $VERSIONS_DIR/*.py 2>/dev/null" \
    | sed -E 's/.*=[[:space:]]*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' | sort -u
}

# Revision ids inside the running backend container (no new container spawned).
revisions_in_running() {
  docker exec "$BACKEND_CONTAINER" sh -c \
    "grep -h '^revision' $VERSIONS_DIR/*.py 2>/dev/null" \
    | sed -E 's/.*=[[:space:]]*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' | sort -u
}

# Revision ids in a repository checkout.
revisions_in_repo() {
  grep -h '^revision' "$1"/*.py 2>/dev/null \
    | sed -E 's/.*=[[:space:]]*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' | sort -u
}

# The revision the live database is stamped at.
db_version() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    'select version_num from alembic_version' 2>/dev/null | tr -d '[:space:]'
}

# --- the live-database coverage check --------------------------------------

check_against_db() {
  local side_label=$1 revs=$2 dbv

  dbv=$(db_version)
  [ -n "$dbv" ] || die "could not read alembic_version from database container '$DB_CONTAINER'"
  [ -n "$revs" ] || die "could not read any alembic revisions from $side_label"

  say "database stamped at : $dbv"
  say "revisions in $side_label : $(echo "$revs" | paste -sd, -)"

  if echo "$revs" | grep -qx "$dbv"; then
    say "OK: revision $dbv is present -- a restart will find its migration."
    return 0
  fi

  fail "database is stamped at revision '$dbv', but $side_label does not contain it."
  fail "Revisions available there: $(echo "$revs" | paste -sd, -)"
  fail ""
  fail "A restart of $BACKEND_CONTAINER WILL FAIL: the entrypoint runs"
  fail "'alembic upgrade head' and will abort with"
  fail "  Can't locate revision identified by '$dbv'"
  fail "leaving allchemist.ru and api.allchemist.ru at 502."
  fail ""
  fail "Fix by rebuilding/shipping an image that contains revision '$dbv'"
  fail "BEFORE the container is restarted. Do not restart it first."
  return 1
}

case "$MODE" in
  image)
    [ -n "$IMAGE_REF" ] || die "--image requires an image reference"
    docker image inspect "$IMAGE_REF" >/dev/null 2>&1 || die "no such image: $IMAGE_REF"
    say "== migration coverage: candidate image vs live database =="
    check_against_db "image $IMAGE_REF" "$(revisions_in_image "$IMAGE_REF")"
    ;;

  running)
    docker inspect "$BACKEND_CONTAINER" >/dev/null 2>&1 || die "no such container: $BACKEND_CONTAINER"
    say "== migration coverage: running container vs live database =="
    check_against_db "running container $BACKEND_CONTAINER" "$(revisions_in_running)"
    ;;

  repo)
    [ -n "$REPO_PATH" ] || die "--repo requires a path to alembic/versions"
    [ -d "$REPO_PATH" ] || die "not a directory: $REPO_PATH"
    [ -n "$IMAGE_REF" ] || die "--repo also requires --image-ref REF (the built image to inspect)"
    docker image inspect "$IMAGE_REF" >/dev/null 2>&1 || die "no such image: $IMAGE_REF"

    say "== migration coverage: repo revisions vs built image =="
    repo_revs=$(revisions_in_repo "$REPO_PATH")
    img_revs=$(revisions_in_image "$IMAGE_REF")
    [ -n "$repo_revs" ] || die "no revisions found in $REPO_PATH"

    say "repo  : $(echo "$repo_revs" | paste -sd, -)"
    say "image : $(echo "$img_revs" | paste -sd, -)"

    missing=$(comm -23 <(echo "$repo_revs") <(echo "$img_revs"))
    if [ -n "$missing" ]; then
      fail "the built image is missing revisions that exist in the repo:"
      fail "  $(echo "$missing" | paste -sd, -)"
      fail "Usual cause: a stale build, or .dockerignore excluding alembic content."
      fail "Shipping this image means any database stamped at one of the missing"
      fail "revisions can never restart."
      exit 1
    fi
    say "OK: every repo revision is present in the image."
    ;;

  chain)
    [ -n "$CHAIN_PATH" ] || die "--chain requires a path to alembic/versions"
    [ -d "$CHAIN_PATH" ] || die "not a directory: $CHAIN_PATH"
    say "== migration chain integrity =="

    revs=$(revisions_in_repo "$CHAIN_PATH")
    downs=$(grep -h '^down_revision' "$CHAIN_PATH"/*.py 2>/dev/null \
      | sed -E 's/.*=[[:space:]]*(["'"'"'])?([^"'"'"']*)\1?.*/\2/' | sed 's/None//' | sort -u)

    [ -n "$revs" ] || die "no revisions found in $CHAIN_PATH"

    rc=0

    # Every down_revision must point at a revision that exists.
    for d in $downs; do
      [ -z "$d" ] && continue
      if ! echo "$revs" | grep -qx "$d"; then
        fail "down_revision '$d' does not correspond to any existing revision"
        rc=1
      fi
    done

    # Exactly one head: a revision that nothing else points down to.
    heads=""
    for r in $revs; do
      if ! echo "$downs" | grep -qx "$r"; then heads="$heads $r"; fi
    done
    head_count=$(echo $heads | wc -w)
    if [ "$head_count" -ne 1 ]; then
      fail "expected exactly one head, found $head_count:$heads"
      fail "Multiple heads mean 'alembic upgrade head' is ambiguous."
      rc=1
    else
      say "single head: $(echo $heads | tr -d ' ')"
    fi

    # Exactly one base.
    base_count=$(grep -h '^down_revision' "$CHAIN_PATH"/*.py 2>/dev/null | grep -c 'None')
    if [ "$base_count" -ne 1 ]; then
      fail "expected exactly one base (down_revision = None), found $base_count"
      rc=1
    else
      say "single base: ok"
    fi

    [ $rc -eq 0 ] && say "OK: chain is linear, one base, one head."
    exit $rc
    ;;
esac
