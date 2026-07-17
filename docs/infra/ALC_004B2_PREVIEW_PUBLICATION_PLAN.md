# ALC-004B2 Preview Publication Plan

## Authorization boundary

This document is a future operational plan. ALC-004B1 executed none of these
state-changing commands. ALC-004B2 requires explicit authorization after the
owner confirms DNS propagation.

Target:

- hostname: preview.allchemist.ru
- upstream: 127.0.0.1:3011
- target unit: allchemist-preview.service
- access: Basic Auth + TLS + noindex
- legacy fallback: port 3010, retire only after full verification

## 1. Repeat preflight

Verify exact Git/template commit, production status, nginx digest, TLS digest,
nginx -t, backend/PostgreSQL health, disk, and both preview runtimes.

    systemctl is-active allchemist-preview.service
    curl --fail http://127.0.0.1:3011/ >/dev/null
    npm run check:preview-replacement
    ss -ltnp '( sport = :3010 )'
    curl --fail http://127.0.0.1:3010/ >/dev/null
    nginx -t

Abort if the 3010 PID is not 1603626, either HTTP check fails, nginx validation
fails, or production evidence differs unexpectedly. Do not restart either
preview process.

## 2. Confirm DNS

Confirm A=45.128.205.38 from the authoritative server, 1.1.1.1, and 8.8.8.8.
Confirm AAAA and CNAME are absent and Cloudflare proxy status remains DNS only.

## 3. Back up live configuration

Create a protected timestamped backup outside Git containing the exact nginx
files, symlinks, nginx -T output, nginx digest, TLS inventory, and service
metadata. Do not copy certificate private keys; existing LetsEncrypt storage is
already the authoritative protected source.

Record nginx master PID. Do not restart nginx.

## 4. Create Basic Auth credential

Create /etc/nginx/auth as root:www-data mode 0750. Read the username and
password interactively. Hash the password through stdin with:

    openssl passwd -6 -stdin

Write username and hash to a protected temporary file, unset password/hash
variables, then atomically install:

    /etc/nginx/auth/preview.allchemist.ru.htpasswd

Required owner/mode: root:www-data 0640. Never print the password, hash, file
content, or a command line containing the password.

## 5. Install an HTTP-only bootstrap

Install a dedicated preview server block that:

- listens on 80 for preview.allchemist.ru;
- serves only /.well-known/acme-challenge/ from a dedicated webroot;
- returns 404 for all other requests;
- has no proxy_pass.

Create the sites-enabled symlink only after checking for conflicts. Run
nginx -t. Do not manually reload yet; the authorized Certbot nginx challenge
may manage the temporary challenge reload.

## 6. Issue a separate certificate

After DNS and bootstrap checks:

    certbot certonly --nginx --cert-name preview.allchemist.ru -d preview.allchemist.ru

Abort if Certbot proposes changing allchemist.ru or admin.allchemist.ru. Record
the new certificate SAN, issuer, validity, and renewal file without exposing the
private key.

## 7. Render the canonical template

Render infra/nginx/preview.allchemist.ru.conf.template with:

- ACME webroot path;
- new preview fullchain path;
- new preview private-key path;
- protected Basic Auth file path.

Refuse any unresolved placeholder. Install the rendered file as the dedicated
preview site and replace only the preview bootstrap. Do not modify existing
allchemist/admin/API files.

## 8. Validate and reload

    nginx -t
    systemctl reload nginx

Never use restart. Confirm nginx master PID continuity and active state.

## 9. Access and TLS checks

Unauthenticated application routes must return 401 with a Basic challenge.
robots.txt must return 200 with Disallow: /. The HTTP endpoint must redirect to
HTTPS except the ACME challenge path.

Use curl interactive password prompting rather than placing the password in a
command argument or history. Confirm authenticated 200 responses.

Validate:

- certificate SAN exactly covers preview.allchemist.ru;
- valid Let's Encrypt chain and dates;
- no mixed content or redirect loop;
- X-Robots-Tag on application and asset responses;
- security headers;
- separate access/error logs without Authorization content.

## 10. Routes, assets, and PWA

Check all ALC-004A routes through the public hostname with authentication:

- /
- /dashboard/student
- /modules
- /modules/chemistry
- /modules/chemistry/lab/zinc-hcl
- /modules/physics
- /modules/biology
- /design-preview/student-dashboard
- /design-preview/platform-structure

Check every discovered JS/CSS asset, BUILD_ID asset, WebSocket behavior if used,
service worker/manifest if present, mobile browser authentication, cache
headers, HTTP 500 count, and missing assets.

## 11. Observation window

Observe nginx and allchemist-preview journals, HTTP status, memory, restarts,
and both preview ports for an explicitly recorded window. Do not include
credentials, Authorization headers, or sensitive query strings in evidence.

## 12. Rollback before legacy retirement

If any check fails:

1. Restore only the preview nginx backup or remove its enabled symlink.
2. Run nginx -t.
3. Reload nginx.
4. Confirm current production/admin/API routes and both local preview ports.
5. Revert or remove only the preview DNS record if public withdrawal is needed.
6. Leave allchemist-preview.service and the 3010 process untouched.

## 13. Retire port 3010

Only after every public, TLS, auth, route, asset, PWA, and observation check
passes:

1. Record final PID 1603626 evidence.
2. Stop and disable only allchemist-web-preview.service.
3. Confirm PID 1603626 exited and port 3010 is unbound.
4. Confirm 3011 and the protected public route still pass.
5. Mark port 3010 retired and prohibited from reuse.

Do not attempt to restart 3010. Its cwd is deleted and it is not a valid
rollback target. Rollback after retirement uses the verified 3011 service and
its immutable release selection.

## 14. Finalize evidence

Update runbooks, G3 evidence, remediation registers, certificate renewal
evidence, config hashes, rollback evidence, and the published task branch.
G3 may become PASS only after owner/operations approval and all exit criteria.
