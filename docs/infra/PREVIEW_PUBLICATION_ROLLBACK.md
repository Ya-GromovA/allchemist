# Protected Preview Publication Rollback

## Scope

This rollback affects only the `preview.allchemist.ru` nginx site. It must not
modify the public, admin, API, PostgreSQL, preview artifact, or DNS state unless
a separate action is explicitly authorized.

Protected backup:

`/root/backups/allchemist/ALC-004B2/20260717-234912`

The backup includes the pre-publication nginx state, the HTTP bootstrap, runtime
evidence, TLS inventory, and rollback manifest. Backup files are root-only.

## Rollback triggers

- preview nginx syntax or reload failure
- protected route exposes application content without authentication
- certificate/SAN/chain failure
- persistent 5xx or missing critical assets
- proxy target differs from `127.0.0.1:3011`
- production domain behavior changes
- unexpected nginx, 3011, or 3010 process restart

## Procedure

1. Record nginx, 3011, and 3010 PIDs and current HTTP status.
2. Verify the protected backup and select the latest known-good preview config.
3. Restore only `/etc/nginx/sites-available/preview.allchemist.ru.conf` or
   disable only its `sites-enabled` symlink when withdrawing publication.
4. Run `nginx -t`.
5. Only after syntax PASS, run `systemctl reload nginx`. Never restart nginx.
6. Confirm nginx master PID continuity.
7. Confirm direct 3011 and 3010 HTTP 200 without restarting either process.
8. Confirm public, admin, and API domain behavior remains unchanged.
9. Preserve certificate and credential evidence until separately authorized
   cleanup; do not print or copy their contents.
10. Record `ACTIVATION_ROLLBACK` and the exact non-secret reason.

If the final-config reload fails, restore the saved bootstrap config and reload
only after `nginx -t` passes.

## Prohibited rollback actions

- do not restart nginx
- do not restart `allchemist-preview.service`
- do not stop or restart legacy 3010
- do not rebuild or edit the immutable preview artifact
- do not modify PostgreSQL or run migrations
- do not reuse port 3010
- do not change public/admin/API configs or certificates
- do not print the Basic Auth file, password, bcrypt hash, or private key

## Legacy retirement boundary

Legacy 3010 remains available only as a temporary fallback pending recorded
owner acceptance. Its cwd is deleted, so it is not restart-safe and must never
be reused. Retirement is exclusively ALC-004B3 work and requires a fresh
preflight plus explicit authorization.
