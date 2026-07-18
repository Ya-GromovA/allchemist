#!/usr/bin/env bash
set -euo pipefail
fail=0
check_port(){ if ss -lntH | awk -v p=":$1" '$4 ~ p"$" && $4 !~ /^127\.0\.0\.1:/ && $4 !~ /^\[::1\]:/ {x=1} END{exit !x}'; then echo "FAIL non-loopback $1"; fail=1; else echo "PASS loopback/absent $1"; fi; }
mode=$(stat -c '%a' /root/synapse); (( (8#$mode & 2) == 0 )) && echo 'PASS repository not other-writable' || fail=1
check_port 8000; check_port 5433; check_port 3010
systemctl is-active --quiet nginx || fail=1
systemctl is-active --quiet allchemist-preview.service || fail=1
docker inspect -f '{{.State.Health.Status}}' synapse-backend | grep -qx healthy || fail=1
docker inspect -f '{{.State.Health.Status}}' synapse-db | grep -qx healthy || fail=1
ufw status | grep -q '^Status: active' || fail=1
exit "$fail"
