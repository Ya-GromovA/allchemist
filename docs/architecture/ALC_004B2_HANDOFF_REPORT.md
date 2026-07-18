# ALC-004B2 Protected Preview Handoff

## Result

ALC-004B2 is **RESOLVED / PASS**. A protected public preview is available at
`https://preview.allchemist.ru/` and proxies only to the immutable preview
runtime on `127.0.0.1:3011`.

## Repository context

- Branch: `chore/alc-004b2-preview-publication-20260717-234655`
- Source commit: `855ea2ad6763b75d3780c36462bb9c7f01ffadb7`
- Production checkout: read-only throughout
- Canonical nginx template:
  `infra/nginx/preview.allchemist.ru.conf.template`
- Rendered template validation: zero unresolved placeholders, zero 3010
  references, and no forbidden upstream

## Operational state

- nginx: active; master PID `2163555`
- `allchemist-preview.service`: active; PID `579532`
- direct 3011: HTTP 200
- legacy 3010: PID `1603626`; HTTP 200; unchanged
- backend: running/healthy
- PostgreSQL: running/healthy
- package tool: `apache2-utils 2.4.52-1ubuntu4.23`
- Basic Auth identifier: `ulyashka_88`
- Basic Auth storage: outside Git, `0640 root:www-data`
- certificate: separate Let's Encrypt certificate for
  `preview.allchemist.ru` only
- renewal: registered and timer-enabled

Credential values, bcrypt hashes, Certbot account metadata, and private keys
are intentionally excluded.

## Public behavior

- HTTP root redirects to HTTPS with 301
- HTTPS application routes return 401 without auth
- HTTPS application routes return 200 with auth
- all 9 canonical routes pass
- JS, CSS, BUILD_ID, and referenced icon/manifest assets pass
- noindex and robots deny pass
- security headers pass
- nginx/framework version disclosure is blocked
- HTTP 500, missing assets, mixed content, redirect loops, and certificate
  errors are all zero

## Observation

Six checkpoints over 308 seconds passed. nginx, 3011, and 3010 PIDs were
unchanged. No TLS, authentication, critical nginx, missing-asset, HTTP 500, or
restart errors were observed.

## Rollback

The protected backup is under
`/root/backups/allchemist/ALC-004B2/20260717-234912`. Rollback changes only the
preview nginx site, requires `nginx -t` before reload, and never restarts nginx,
3011, or 3010. See `docs/infra/PREVIEW_PUBLICATION_ROLLBACK.md`.

## Remaining ownership actions

1. The owner reviews `https://preview.allchemist.ru/` on desktop and mobile.
2. The owner records visual acceptance.
3. A separate authorized ALC-004B3 task retires legacy 3010.
4. The temporary preview credential is rotated in a separately authorized
   operation.

G3 remains **PARTIAL** until steps 1 through 3 are complete. Technical
acceptance does not constitute owner acceptance. Port 3010 must never be reused,
and no production feature deployment is authorized by this handoff.
