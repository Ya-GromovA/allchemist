# ALC-004B2 Protected Preview Acceptance Report

Validation date: 2026-07-18 (Europe/Moscow)
Result: **PASS**

## Acceptance boundary

This report covers the protected preview publication only. It does not approve
a production feature deployment, implement application authentication, record
owner visual acceptance, or authorize retirement of legacy port 3010.

## DNS, TLS, and access

| Check | Result |
|---|---|
| DNS A to `45.128.205.38` | PASS |
| AAAA and CNAME absent | PASS |
| Separate preview certificate | PASS |
| SAN exactly `preview.allchemist.ru` | PASS |
| Certificate chain and hostname | PASS |
| HTTP to HTTPS | 301 PASS |
| HTTPS without credential | 401 PASS |
| Basic challenge present | PASS |
| HTTPS with preview credential | 200 PASS |
| Application content hidden without auth | PASS |
| Proxy only to `127.0.0.1:3011` | PASS |
| References to port 3010 | 0 |
| Unresolved rendered placeholders | 0 |

The credential identifier is `ulyashka_88`. The credential is temporary,
preview-only, outside Git, and unrelated to application users. Neither its
value nor bcrypt hash is included in this report.

## Route matrix

| Route | Unauthenticated | Authenticated |
|---|---:|---:|
| `/` | 401 | 200 |
| `/dashboard/student` | 401 | 200 |
| `/modules` | 401 | 200 |
| `/modules/chemistry` | 401 | 200 |
| `/modules/chemistry/lab/zinc-hcl` | 401 | 200 |
| `/modules/physics` | 401 | 200 |
| `/modules/biology` | 401 | 200 |
| `/design-preview/student-dashboard` | 401 | 200 |
| `/design-preview/platform-structure` | 401 | 200 |

Result: **9/9 PASS**.

## Asset and browser-safety evidence

- 10 JavaScript assets: PASS
- 3 CSS assets: PASS
- BUILD_ID manifest asset: PASS
- referenced icon/manifest assets: PASS
- HTTP 500 count: 0
- missing asset count: 0
- mixed-content count: 0
- redirect-loop count: 0
- certificate error count: 0
- `robots.txt` deny-all: PASS
- `X-Robots-Tag: noindex, nofollow, noarchive`: PASS
- HSTS, nosniff, frame, and referrer headers: PASS
- nginx version disclosure: blocked
- upstream framework/version disclosure: blocked
- upstream address disclosure: absent

## Observation evidence

Window: `2026-07-18T01:13:55+03:00` to
`2026-07-18T01:19:03+03:00`, 308 seconds.

| Minute | nginx | 3011 | Public 401/200 | BUILD_ID | 3010 | Backend/DB | Errors/restarts |
|---:|---|---|---|---|---|---|---|
| 0 | active | 200 | PASS | 200 | 200 | healthy | 0 |
| 1 | active | 200 | PASS | 200 | 200 | healthy | 0 |
| 2 | active | 200 | PASS | 200 | 200 | healthy | 0 |
| 3 | active | 200 | PASS | 200 | 200 | healthy | 0 |
| 4 | active | 200 | PASS | 200 | 200 | healthy | 0 |
| 5 | active | 200 | PASS | 200 | 200 | healthy | 0 |

Final counters:

- HTTP 500: 0
- missing assets: 0
- TLS errors: 0
- authentication errors: 0
- critical nginx errors: 0
- unexpected restarts: 0

PID continuity:

- nginx: `2163555` unchanged
- preview 3011: `579532` unchanged
- legacy 3010: `1603626` unchanged

Backend and PostgreSQL remained running and healthy.

## Production invariants

`allchemist.ru`, `admin.allchemist.ru`, and `api.allchemist.ru/docs` retained
their expected responses. The production checkout, local main, and origin/main
were not changed by ALC-004B2.

## Decision

ALC-004B2 is **RESOLVED / PASS**. G3 remains **PARTIAL** until owner visual
acceptance is recorded and ALC-004B3 safely retires legacy 3010. Port 3010 must
remain untouched and must never be reused.
