# Preview DNS Plan

## Confirmed state

- Zone: allchemist.ru
- Provider indicated by authoritative DNS: Cloudflare
- Authoritative nameservers: arnold.ns.cloudflare.com,
  mina.ns.cloudflare.com
- Origin IPv4: 45.128.205.38
- Public origin IPv6: none
- preview A/AAAA/CNAME: absent
- Observed wildcard: absent
- Nearby public answer TTL: 300 seconds
- Existing public hostnames: Cloudflare-proxied

## Exact owner action

In Cloudflare Dashboard, open the allchemist.ru zone and DNS Records, then add:

| Field | Value |
| --- | --- |
| Type | A |
| Name | preview |
| IPv4 address | 45.128.205.38 |
| Proxy status | DNS only initially |
| TTL | Auto, expected effective value 300 seconds |

Do not add an AAAA record. The server has no public IPv6 route. Do not use the
Tailscale address 100.67.164.12 and do not create a CNAME to another production
hostname.

DNS-only is required for the initial propagation, origin reachability, and
certificate issuance checks. Enabling Cloudflare proxy is a separate ALC-004B2
decision after origin TLS and Basic Auth are proven. If enabled later, repeat
TLS, authentication, client-address, cache, and WebSocket checks.

## Propagation checks

Run from at least two networks:

    dig @1.1.1.1 preview.allchemist.ru A +noall +answer
    dig @8.8.8.8 preview.allchemist.ru A +noall +answer
    dig preview.allchemist.ru AAAA +noall +answer
    dig preview.allchemist.ru CNAME +noall +answer

Required result before ALC-004B2:

- A equals 45.128.205.38;
- AAAA is absent;
- CNAME is absent;
- authoritative and public resolvers agree.

Do not treat a browser cache or local hosts-file result as propagation proof.

## Conflict checks

The exact preview name and a randomized wildcard name were absent during
ALC-004B1. If Cloudflare refuses the A record, inspect only the preview label
for an existing CNAME, AAAA, redirect, Worker route, or Access application.
Do not edit root, admin, API, or wildcard records to resolve a preview conflict.

## Incorrect-record rollback

If the value is wrong, edit or remove only the preview A record. Wait at least
the effective TTL, then repeat authoritative, 1.1.1.1, and 8.8.8.8 queries.
Removing preview returns the pre-task state and does not require changing
allchemist.ru, admin.allchemist.ru, or api.allchemist.ru.

No DNS change was performed by ALC-004B1.
