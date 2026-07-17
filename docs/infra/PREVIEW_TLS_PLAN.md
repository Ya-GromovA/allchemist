# Preview TLS Plan

## Existing mechanism

- Client: Certbot 1.21.0
- CA: Let's Encrypt ACME v2
- Confirmed plugins: nginx, webroot, standalone
- Existing renewal authenticator and installer: nginx
- Automatic renewal: enabled certbot.timer
- Additional legacy mechanism: /etc/cron.d/certbot exists

Existing certificates:

- admin.allchemist.ru, expiring 2026-10-01;
- allchemist.ru plus www and api SANs, expiring 2026-09-30.

Neither certificate covers preview.allchemist.ru. No wildcard certificate is
present.

## Issuance decision

Issue a separate certificate named preview.allchemist.ru. Do not modify,
replace, or expand either working certificate.

Prerequisites:

1. Public A record resolves directly to 45.128.205.38.
2. AAAA and CNAME remain absent.
3. Port 80 reaches this nginx.
4. A reviewed HTTP bootstrap server block for preview is active.
5. Both preview runtimes still pass their preflight.

Expected future command, to be executed only in ALC-004B2:

    certbot certonly --nginx --cert-name preview.allchemist.ru -d preview.allchemist.ru

This command is state-changing and may temporarily alter/reload nginx for the
HTTP-01 challenge. ALC-004B2 must back up live nginx first, capture Certbot
output without account secrets, and abort if Certbot proposes changing an
existing certificate.

Expected certificate paths after successful issuance:

    /etc/letsencrypt/live/preview.allchemist.ru/fullchain.pem
    /etc/letsencrypt/live/preview.allchemist.ru/privkey.pem

The private key path may be referenced by nginx but private key content must
never be printed or copied into Git.

## Final template render

Render these repository placeholders only after issuance:

- @@ACME_WEBROOT@@
- @@CERTIFICATE_FULLCHAIN@@
- @@CERTIFICATE_PRIVATE_KEY@@
- @@BASIC_AUTH_FILE@@

Then run:

    nginx -t
    systemctl reload nginx

Use reload, never restart. Validate certificate hostname, issuer, validity,
chain, and TLS negotiation from an external client.

## Renewal

The HTTP challenge location in the template is unauthenticated and limited to
the ACME webroot. All other HTTP requests redirect to HTTPS. After publication,
ALC-004B2 should perform an authorized dry-run and confirm the timer:

    systemctl list-timers --all | grep certbot
    certbot renew --dry-run --cert-name preview.allchemist.ru

The dry-run is stateful and must not be executed in ALC-004B1.

## Risks and rollback

- DNS not propagated: do not run Certbot.
- Cloudflare proxy enabled too early: return preview to DNS-only and recheck.
- Certbot proposes an existing cert change: abort.
- Issuance succeeds but final nginx validation fails: restore the nginx backup;
  retain the unused new certificate for later reviewed cleanup.
- Authentication or application checks fail: restore the nginx backup and
  reload; do not touch either preview process.

No certificate command or renewal was run in ALC-004B1.
