# Preview Replacement Runbook

## Runtime ownership

- Target preview: 127.0.0.1:3011
- Unit: allchemist-preview.service
- Release selector: /opt/allchemist/preview/current
- Legacy fallback: 127.0.0.1:3010

Port 3010 is not a target slot. Do not stop, restart, modify, or reuse it until
the ALC-004B public-route verification authorizes retirement.

## Read-only status

    systemctl is-enabled allchemist-preview.service
    systemctl is-active allchemist-preview.service
    systemctl show allchemist-preview.service -p MainPID -p User -p Group
    ss -ltnp '( sport = :3011 )'
    curl --fail --silent --show-error http://127.0.0.1:3011/ >/dev/null
    npm run check:preview-replacement

The health command is read-only and targets only 127.0.0.1:3011.

## Safe restart

Record the existing PID and verify 3010 first:

    systemctl show allchemist-preview.service -p MainPID --value
    ss -ltnp '( sport = :3010 )'
    curl --fail --silent --show-error http://127.0.0.1:3010/ >/dev/null

Restart only the target unit:

    systemctl restart allchemist-preview.service
    systemctl is-active allchemist-preview.service
    npm run check:preview-replacement

The 3011 PID must change. Recheck that the 3010 PID and HTTP response did not
change.

## Logs

    journalctl -u allchemist-preview.service -n 100 --no-pager
    journalctl -u allchemist-preview.service --since '-10 minutes' -p err..alert --no-pager

Do not copy journal output into Git.

## Release integrity

    cd /opt/allchemist/preview/current
    sha256sum -c sha256sum.txt
    cmp BUILD_ID apps/web/.next/BUILD_ID

Expected result is 1399/1399 checksum entries and matching BUILD_ID files. Do
not edit the release in place and do not rebuild it on the server.

The protected environment file is /etc/allchemist/preview.env, mode 0640,
owner root:allchemist-preview. Display names only with:

    cut -d= -f1 /etc/allchemist/preview.env
