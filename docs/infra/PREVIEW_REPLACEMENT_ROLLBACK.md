# Preview Replacement Rollback

This procedure removes only the replacement runtime on port 3011 from service.
It does not change nginx, DNS, TLS, PostgreSQL, the production checkout, or the
legacy fallback on port 3010.

## Immediate rollback

    systemctl stop allchemist-preview.service
    systemctl is-active allchemist-preview.service
    ss -ltnp '( sport = :3011 )'

Expected state: the unit is inactive and port 3011 is unbound.

Confirm the independent fallback without manipulating it:

    ss -ltnp '( sport = :3010 )'
    curl --fail --silent --show-error http://127.0.0.1:3010/ >/dev/null

## Restore the replacement

    systemctl start allchemist-preview.service
    systemctl is-active allchemist-preview.service
    npm run check:preview-replacement

Expected state: port 3011 is bound on loopback, every required route and asset
returns HTTP 200, the BUILD_ID check passes, and both HTTP 500 and missing asset
counts are zero.

Future release rollback must select a separately verified immutable release by
atomically changing /opt/allchemist/preview/current, followed by a restart and
the complete health check. Never edit a release in place.

No previous 3011 release existed during ALC-004A, so its rehearsal consisted of
stopping only the new unit, proving 3010 remained available, starting the new
unit, and rerunning the complete smoke check.

ALC-004B owns routing preview.allchemist.ru to 3011, access protection, public
verification, and retirement of legacy 3010. Retirement does not make 3010
reusable.
