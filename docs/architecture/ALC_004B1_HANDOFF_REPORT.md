# ALC-004B1 Handoff Report

## Git context

- Source commit: 654c3b2b1bcad7cd939df9321e7a182df4506580
- Branch: chore/alc-004b1-preview-domain-readiness-20260717-015220
- Worktree: /root/worktrees/allchemist-preview-domain-readiness-20260717-015220
- Production checkout: read-only

## Runtime

- Legacy fallback: 127.0.0.1:3010, PID 1603626, HTTP 200
- Target preview: 127.0.0.1:3011, PID 579532, HTTP 200
- allchemist-preview.service: enabled and active
- Complete ALC-004A health command: PASS

Neither service was stopped or restarted.

## DNS

- Provider: Cloudflare authoritative DNS
- Nameservers: arnold.ns.cloudflare.com, mina.ns.cloudflare.com
- Confirmed origin IPv4: 45.128.205.38
- Public IPv6: none
- preview A/AAAA/CNAME: absent
- wildcard: not observed
- Tailscale split route for preview: not observed

Owner action: create a DNS-only A record named preview with value
45.128.205.38 and TTL Auto/300. Do not add AAAA.

## Nginx and TLS

- Live nginx active and syntax-valid
- Existing preview live config: none
- Planned upstream: 127.0.0.1:3011 only
- Template: infra/nginx/preview.allchemist.ru.conf.template
- Isolated nginx syntax validation: PASS
- Certbot nginx plugin: confirmed
- CA: Let's Encrypt
- Dedicated preview certificate: not yet issued
- Existing certificates changed: no

## Access

BASIC AUTH + TLS + NOINDEX is selected. Tailscale remains an operator tunnel
fallback. Identity-aware access is deferred because no deployed provider was
confirmed.

No credential or hash was created.

## Safety boundary

- /root/synapse changed: no
- /etc/nginx changed: no
- nginx reload/restart: no
- DNS changed: no
- TLS changed: no
- firewall/Tailscale changed: no
- public route created: no
- preview services changed: no
- database/build/deploy: no

## Gate

G3 remains PARTIAL. The permanent service, immutable release, restart, health,
and rollback evidence exist. Remaining evidence is DNS propagation, protected
public TLS routing, public smoke/PWA verification, observation, and safe
retirement of 3010.

## Next action

The domain owner follows PREVIEW_DOMAIN_OWNER_ACTIONS.md and confirms only the
record and public resolver results. No credential or provider token is needed
by Codex.

ALC-004B2 must not begin until that confirmation. Port 3010 must not be stopped
or reused before ALC-004B2 public acceptance.
