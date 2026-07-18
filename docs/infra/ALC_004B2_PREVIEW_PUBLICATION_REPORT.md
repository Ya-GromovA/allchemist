# ALC-004B2 Protected Preview Publication Report

Validation date: 2026-07-18 (Europe/Moscow)
Task status: **RESOLVED / PASS**
Branch: `chore/alc-004b2-preview-publication-20260717-234655`
Source commit: `855ea2ad6763b75d3780c36462bb9c7f01ffadb7`

## Outcome

`preview.allchemist.ru` is published as a dedicated TLS and Basic Auth protected
preview endpoint. Its only application upstream is `127.0.0.1:3011`. The
production public, admin, and API routes were not changed.

DNS prerequisite checks passed for A `45.128.205.38` with no AAAA or CNAME
answer. The record was DNS-only during verification.

## Authorized operational changes

- Installed `apache2-utils 2.4.52-1ubuntu4.23` and its required `libapr1` and
  `libaprutil1` dependencies. No package upgrade, downgrade, removal, or service
  restart was performed.
- Created a preview-only bcrypt cost-12 credential for the non-secret identifier
  `ulyashka_88`. The Basic Auth file is outside Git at
  `/etc/nginx/auth/preview.allchemist.ru.htpasswd` with
  `0640 root:www-data` permissions.
- Created a protected operational backup under
  `/root/backups/allchemist/ALC-004B2/20260717-234912`.
- Issued a separate Let's Encrypt certificate whose SAN is exactly
  `preview.allchemist.ru`. The certificate is registered for webroot renewal.
- Installed and enabled only the dedicated preview nginx site. nginx was
  reloaded, never restarted.

No plaintext credential handoff file was created. The credential value and
bcrypt hash are not present in this repository or report.

## TLS evidence

- Subject/SAN: `preview.allchemist.ru` only
- Issuer: Let's Encrypt, YR2
- Validity: 2026-07-17 19:54:51 UTC through 2026-10-15 19:54:50 UTC
- Chain verification: PASS
- Certificate/private-key match: PASS, checked without displaying the key
- Renewal registration and `certbot.timer`: present/enabled
- Existing allchemist/admin certificates and renewal files: unchanged

## Nginx and access evidence

- HTTP root: `301` to HTTPS
- HTTPS without a credential: `401` with a Basic challenge
- HTTPS with the owner-selected preview credential: `200`
- ACME challenge: accessible without Basic Auth
- Application upstream: only `http://127.0.0.1:3011`
- Legacy port references in the preview config: `0`
- Production/admin/API upstream references: `0`
- Unresolved placeholders after render: `0`
- `robots.txt`: `Disallow: /`
- `X-Robots-Tag`: `noindex, nofollow, noarchive`
- HSTS, nosniff, frame, and referrer headers: PASS
- nginx version tokens and upstream framework headers: blocked
- Separate preview access/error logs: active

An initial activation attempt passed syntax validation but its immediate
post-reload probe reached a gracefully exiting bootstrap worker. The safety
gate restored the bootstrap automatically. A readiness-polled activation then
passed, and a later header-hardening reload also passed. nginx master PID
remained `2163555` throughout.

## Public acceptance

All nine protected routes returned `401` without authentication and `200` with
authentication:

1. `/`
2. `/dashboard/student`
3. `/modules`
4. `/modules/chemistry`
5. `/modules/chemistry/lab/zinc-hcl`
6. `/modules/physics`
7. `/modules/biology`
8. `/design-preview/student-dashboard`
9. `/design-preview/platform-structure`

Asset evidence:

- JavaScript assets: 10 PASS
- CSS assets: 3 PASS
- BUILD_ID manifest asset: PASS
- Referenced icon/manifest requests: PASS
- HTTP 500 count: 0
- Missing asset count: 0
- Mixed-content count: 0
- Redirect-loop count: 0
- Certificate error count: 0

`allchemist.ru`, `admin.allchemist.ru`, and `api.allchemist.ru/docs` continued
to return their expected successful responses.

## Observation

ALC-004B2-R3A observed six checkpoints from
`2026-07-18T01:13:55+03:00` through `2026-07-18T01:19:03+03:00`, a total of
308 seconds.

Every checkpoint passed:

- nginx active; master PID `2163555` unchanged
- `allchemist-preview.service` active; PID `579532` unchanged
- direct 3011 HTTP `200`
- public unauthenticated/authenticated responses `401`/`200`
- BUILD_ID asset `200`
- legacy 3010 PID `1603626` and HTTP `200` unchanged
- backend and PostgreSQL healthy
- HTTP 500, missing assets, TLS errors, authentication errors, critical nginx
  errors, and unexpected restarts: all zero

## Current gate state

ALC-004B2 is resolved and its technical acceptance is PASS. G3 remains
`PARTIAL` because owner visual acceptance is not yet recorded and legacy port
3010 has not been retired. Port 3010 must remain untouched and must never be
reused. Retirement requires the separate ALC-004B3 task.
