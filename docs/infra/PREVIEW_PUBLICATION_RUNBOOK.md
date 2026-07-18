# Protected Preview Publication Runbook

## Current topology

- Public hostname: `preview.allchemist.ru`
- HTTP behavior: redirect to HTTPS, except the ACME challenge
- Access control: TLS plus preview-only Basic Auth
- Application upstream: `127.0.0.1:3011`
- Runtime unit: `allchemist-preview.service`
- Legacy fallback retained pending owner acceptance: `127.0.0.1:3010`
- Live preview config: `/etc/nginx/sites-available/preview.allchemist.ru.conf`
- Basic Auth file: `/etc/nginx/auth/preview.allchemist.ru.htpasswd`
- Certificate: separate `preview.allchemist.ru` Let's Encrypt lineage

Port 3010 is not a deployment slot. Do not stop, restart, modify, retire, or
reuse it outside an explicitly authorized ALC-004B3 operation.

## Read-only status checks

    systemctl is-active nginx
    systemctl show nginx -p MainPID --value
    systemctl is-active allchemist-preview.service
    systemctl show allchemist-preview.service -p MainPID -p NRestarts
    curl --fail --silent --show-error http://127.0.0.1:3011/ >/dev/null
    ss -ltnp '( sport = :3010 )'
    curl --fail --silent --show-error http://127.0.0.1:3010/ >/dev/null
    nginx -t

Expected direct HTTP status on both local preview ports is 200. A status check
does not authorize a restart.

## Public unauthenticated checks

    curl --silent --show-error --output /dev/null \
      --write-out '%{http_code}\n' http://preview.allchemist.ru/
    curl --silent --show-error --output /dev/null \
      --write-out '%{http_code}\n' https://preview.allchemist.ru/

Expected results are 301 and 401. Confirm `WWW-Authenticate` without copying
request or authorization headers into evidence.

`robots.txt` is intentionally public and must return a deny-all policy. The
ACME challenge must remain reachable over HTTP without authentication.

## Authenticated checks

Never place a password in a command argument, shell history, document, log, or
Git file. Retrieve the preview-only credential from the approved password
manager. If automated checking is required, create a root-only directory
`0700` and curl config `0600`, pass only the config path to curl, then securely
delete the config immediately after the check.

Check the nine canonical routes listed in
`docs/quality/ALC_004B2_ACCEPTANCE_REPORT.md`, discovered JS/CSS assets, and the
BUILD_ID manifest. Expected authenticated status is 200 with zero missing
assets or HTTP 500 responses.

The identifier `ulyashka_88` is not an application user, system credential, or
production account. This temporary preview-only credential must not be copied
into application authentication.

## TLS and renewal checks

    openssl x509 -in /etc/letsencrypt/live/preview.allchemist.ru/cert.pem \
      -noout -subject -issuer -dates -ext subjectAltName
    systemctl is-enabled certbot.timer

Verify a single preview SAN, a valid chain, and renewal registration. Never
print or copy the private key. Do not expand or replace the certificates for
the public, admin, or API domains.

## Logs and observation

Read only the dedicated preview logs and service metadata:

    journalctl -u allchemist-preview.service --since '-10 minutes' --no-pager
    tail -n 100 /var/log/nginx/preview.allchemist.ru.access.log
    tail -n 100 /var/log/nginx/preview.allchemist.ru.error.log

Do not record Authorization headers, credential values, sensitive query
strings, or private material. Investigate HTTP 500, missing Next assets, TLS
errors, credential verification failures, PID changes, or service restarts.

## Owner acceptance and credential rotation

Technical acceptance does not equal owner visual acceptance. The owner must
review `https://preview.allchemist.ru/` on desktop and mobile before ALC-004B3
is authorized.

The current credential is temporary and preview-only. Rotate it after owner
acceptance, after ALC-004B3, or earlier by explicit owner decision. Rotation
must use a separate authorized task, bcrypt, stdin-based password handling, and
atomic replacement. Do not migrate it into project user authentication.
