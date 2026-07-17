# ALC-004B1 Preview Domain Readiness Report

Validation date: 2026-07-17 (Europe/Moscow)

## Scope and outcome

This task audited DNS, nginx, TLS, access protection, firewall, Tailscale, and
runtime readiness without changing public or production state. It created only
repository planning and template files.

The operational plan is ready. ALC-004B2 must not start until the domain owner
creates the recommended DNS record and public propagation is confirmed.

## Runtime preflight

- Source commit: 654c3b2b1bcad7cd939df9321e7a182df4506580
- Target unit: allchemist-preview.service, enabled and active
- Target runtime: 127.0.0.1:3011, PID 579532, HTTP 200
- Health command: PASS; BUILD_ID PASS; HTTP 500 count 0; missing assets 0
- Legacy fallback: port 3010, PID 1603626, deleted cwd, HTTP 200
- nginx: enabled, active, and nginx -t PASS
- backend container: healthy; HTTP documentation endpoint 200
- PostgreSQL container: healthy and accepting connections
- Free disk: approximately 20 GB

Neither preview process was stopped or restarted.

## DNS findings

Authoritative nameservers are arnold.ns.cloudflare.com and
mina.ns.cloudflare.com. The SOA also identifies Cloudflare.

allchemist.ru, admin.allchemist.ru, and api.allchemist.ru resolve through
Cloudflare proxy addresses with a 300-second answer TTL. Public HTTPS responses
also contain Cloudflare headers.

preview.allchemist.ru has no A, AAAA, or CNAME answer from the authoritative
server, Cloudflare public resolver, or the host default resolver. A randomized
subdomain also has no answer, so no wildcard was observed.

The origin IPv4 is 45.128.205.38. It was confirmed by the eth0 address and two
independent external address services. The host has no public IPv6 address or
IPv6 default route. Tailscale addresses are not public origin addresses.

Tailscale MagicDNS covers the tailnet suffix only. No split-DNS route for
allchemist.ru or preview.allchemist.ru was found.

## Nginx findings

- Version: nginx 1.18.0 with SSL, HTTP/2, realip, auth_request, and gzip support.
- Include model: conf.d plus sites-enabled.
- Existing sites: allchemist.ru and admin.allchemist.ru.
- Existing server names: allchemist.ru, www.allchemist.ru,
  admin.allchemist.ru, and api.allchemist.ru.
- No live preview hostname, port 3011 proxy, or port 3010 proxy exists.
- Existing proxy convention uses HTTP/1.1 and Host/X-Forwarded headers.
- Existing certificate convention uses /etc/letsencrypt/live paths.
- Existing global logs are under /var/log/nginx; preview receives separate logs.
- gzip is enabled; no brotli module was confirmed.
- No site-level rate limit or identity-aware access configuration was found.

The repository template proxies only to 127.0.0.1:3011 and explicitly forbids
fallback to port 3010, production, admin, or backend routes.

## TLS findings

Certbot 1.21.0 is installed with nginx and webroot plugins. Existing
certificates are issued by Let's Encrypt:

- admin.allchemist.ru: single-name certificate;
- allchemist.ru: SANs for allchemist.ru, www.allchemist.ru, api.allchemist.ru.

No wildcard or preview certificate exists. Renewal files use the nginx
authenticator and installer. certbot.timer is enabled, with a legacy cron entry
also present.

Preview should receive its own certificate after DNS propagation. Existing
certificates must not be expanded or replaced.

## Network findings

nginx listens publicly on ports 80 and 443. UFW is inactive and the observed
nftables input policy is accept. No firewall change is needed for the planned
hostname. No firewall or Tailscale ACL change was made.

## Access decision

BASIC AUTH + TLS + NOINDEX is recommended. Cloudflare is confirmed as DNS/proxy
provider, but Cloudflare Access or another identity-aware proxy is not
confirmed. Tailscale-only access would prevent ordinary mobile/PWA and public
TLS testing.

Credentials will be created only in ALC-004B2, interactively, under protected
/etc storage. No password or hash is stored in Git or this report.

## Template validation

The template was rendered only into a temporary directory. Safe temporary paths
and the existing certificate pair were used for syntax validation; no private
key content was read or printed. nginx -t passed. The temporary files were
removed. Live nginx files, PID, and digest were unchanged.

G3 remains PARTIAL because DNS, protected public routing, TLS issuance, and
retirement of legacy 3010 are not complete.
