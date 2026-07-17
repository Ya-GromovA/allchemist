# ALC-004B1 Acceptance Report

Validation date: 2026-07-17 (Europe/Moscow)

| Criterion | Result | Evidence |
| --- | --- | --- |
| Branch/worktree from exact ALC-004A commit | PASS | Parent 654c3b2b1bcad7cd939df9321e7a182df4506580 |
| Production checkout unchanged | PASS | Same HEAD, branch, dirty counts and status digest |
| Legacy 3010 unchanged | PASS | PID 1603626 and HTTP 200 |
| Target 3011 unchanged and healthy | PASS | Same PID, HTTP 200, health PASS |
| Live nginx unchanged | PASS | Same digest and master PID |
| DNS unchanged | PASS | Read-only queries only |
| TLS unchanged | PASS | Same LetsEncrypt digest; no Certbot action |
| Public route absent | PASS | No live preview server_name or proxy |
| DNS state confirmed | PASS | Authoritative/public/default answers agree |
| Exact owner DNS action | PASS | PREVIEW_DOMAIN_OWNER_ACTIONS.md |
| TLS mechanism confirmed | PASS | Certbot nginx plugin and timer verified |
| Access model selected | PASS | Basic Auth + TLS + noindex |
| Template contains no secrets | PASS | Placeholder-only credentials/certificates |
| Isolated template validation | PASS | nginx -t succeeded without live apply |
| ALC-004B2 plan | PASS | Sequenced publication and rollback plan |
| Public/production mutation | PASS | None performed |
| G3 status | PASS | Remains PARTIAL |

## Validation limits

The future preview certificate does not exist, so syntax validation substituted
the existing confirmed certificate paths in a temporary isolated configuration.
This proves nginx structure and directive compatibility, not future certificate
issuance, DNS ownership, authentication behavior, or public application
behavior.

## Remaining prerequisites

The domain owner must add the preview A record and confirm propagation. ALC-004B2
must then create the credential, issue a dedicated certificate, install the
rendered config, reload nginx, and perform public verification.

## Commands classified

- dig, read-only curl/HEAD, nginx -t, systemctl show/is-active, ss, openssl x509,
  Docker status, and certificate metadata inspection: READ_ONLY_SAFE.
- isolated temporary nginx rendering and syntax test: WRITES_TEMPORARY_OUTPUT,
  deleted after validation; no live apply.
- DNS edits, credential creation, Certbot issuance/renewal, nginx install/reload,
  and stopping 3010: MAY_CHANGE_INFRA and prohibited in ALC-004B1.

## Decision

ALC-004B1 planning acceptance: PASS.

Ready to execute ALC-004B2 now: NO, pending manual DNS propagation.

Ready to retire 3010: NO.
