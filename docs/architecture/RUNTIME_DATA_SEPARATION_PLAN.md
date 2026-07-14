# Runtime Data Separation Plan

Task: ALC-002. No data is moved by this plan.

## Storage principles

- PostgreSQL is the candidate authoritative store for durable relational user, tenant, workflow, and audit-index data.
- Redis, if approved, is ephemeral only: cache, rate limits, short-lived coordination, and non-authoritative session/job metadata.
- Object storage, if approved, holds versioned media, release artifacts, and immutable/large archives with database indexes.
- Protected filesystem runtime storage is a transitional or host-local store, never Git and never the only backup.
- Logs/observability receive redacted events, not user-state snapshots or secrets.
- Security state requires least privilege, audit, retention, and protected backup.

These are recommendations pending ADR and owner approval.

## Current state inventory and target candidates

| Current state | Confirmed readers/writers | Classification | Target candidate | Retention/backup | Owner |
|---|---|---|---|---|---|
| `backend/data/user_state.json` | `user_state_store.py`, `admin_panel_service.py`, backend endpoints/tests | durable user/application state | PostgreSQL tables with tenant/user keys; Redis only as cache | versioned export and DB backup; retention by product/legal policy | backend + data + security |
| `backend/data/security/alerts_ack.json` | `admin_panel_service.py` | security acknowledgement/audit state | append-only PostgreSQL audit record; optional cached current view | security retention; immutable export | security + backend |
| backup dry-run history | `admin_panel_service.py` | operational history | durable operations/audit table or immutable archive with DB index | retain per operations policy; protected backup | operations + security |
| backup dry-run latest status | `admin_panel_service.py` | operational current status | PostgreSQL/runtime state; Redis cache may mirror after ADR | short current retention plus linked history | operations |
| go/no-go history | `admin_panel_service.py` | release/security decision history | append-only audit store; immutable export to object storage candidate | long retention and tamper evidence | release + security |
| handover archive | `admin_panel_service.py` | operational archive | encrypted/versioned object storage candidate plus relational index | policy-defined archive and restore test | operations + security |
| onboarding smoke status | `admin_panel_service.py` | test/operations status | CI artifact or protected runtime status; not product DB unless required | short retention; redact device/user details | mobile QA + operations |
| `content_packs/allchemist-apk-latest.json` | `content_readonly.py`, admin service, readiness/release tools | mutable public release pointer | signed/versioned object-storage manifest plus backend-served current pointer | retain every release manifest and artifact checksum | mobile release + backend |
| `backend/data_host_backup` copies | no active reader confirmed; historical backup class | backup snapshot | protected backup root, not runtime/source | retention and restore evidence | operations |
| service logs | service/process output | operational telemetry | centralized redacted log store or journald policy | time/size retention and incident hold | SRE/security |
| error/metrics/traces | integration not confirmed | observability | approved redacted telemetry backend | sampling/retention/privacy policy | SRE/security |

## PostgreSQL candidates

Durable candidates:

- user progress, assignment state, memberships, permissions, content workflow;
- runtime records currently keyed to users/tenants;
- security acknowledgements and release decisions when audit semantics are required;
- metadata indexes for object-stored media/archive/release objects;
- notification registration metadata only after consent/security design.

PostgreSQL migration is blocked by G5. No schema is proposed as final until production schema baseline, revision framework, and isolated restore are approved.

## Redis candidate responsibilities

Potentially valid:

- bounded TTL caches;
- rate-limit counters;
- short-lived coordination locks;
- ephemeral job status;
- revocation/session acceleration only when PostgreSQL or another durable authority remains canonical.

Prohibited:

- only copy of user progress, assignments, content, audit, or release history;
- secrets or provider credentials;
- state that cannot be reconstructed after flush;
- tenant authorization decisions without authoritative revalidation.

Redis is `NEEDS_VERIFICATION`; ALC-002 does not require or provision it.

## Object storage candidates

- versioned approved source media with provenance;
- release artifacts and signed/hash manifests;
- large immutable handover/audit exports;
- CI screenshots/evidence with retention;
- database backup objects after encryption and restore tests.

Public and private object classes must be separate. URLs, CDN caching, encryption, versioning, deletion policy, and restore must be defined in ADR-003.

## Protected filesystem

Use only for:

- host-local transitional state;
- restricted service sockets/status;
- protected backup staging;
- logs managed by service retention.

Required controls:

- dedicated service user/group;
- directories at most `0750`, sensitive files at most `0640`, secrets stricter;
- no world-readable runtime data;
- atomic writes and fsync where durable semantics are claimed;
- backup classification and restore owner;
- no location under the Git checkout.

## Migration strategy

1. Freeze schema and hash/export each source file without printing contents.
2. Document exact reader/writer behavior and concurrency semantics.
3. Create isolated target schema/store and import fixture copies.
4. Validate record counts, identifiers, tenant boundaries, and business invariants.
5. Add dual-read comparison; dual-write only if explicitly approved.
6. Backfill with resumable idempotent tooling.
7. Switch one state class at a time behind an operational gate.
8. Retain original read-only state and export until rollback window closes.
9. Remove source-tree state only in a later task after G5/G6 and restore proof.

## Rollback

- Stop the migration writer, not production services broadly.
- Revert the selected read/write adapter.
- Restore from pre-migration export or database backup.
- Reconcile writes made during dual-write window.
- Re-run tenant/security invariants.
- Preserve audit evidence of the rollback.

## Secret classification

| Class | Examples | Rule |
|---|---|---|
| Secret | credentials, signing material, provider tokens | secret manager only; never reports/Git/artifacts |
| Restricted | user/security state, device tokens, handover records | encrypted/ACL-controlled store; redacted logs |
| Internal | operational status without user data | protected runtime/observability |
| Public versioned | approved public media and signed release metadata | object storage/CDN after provenance |

No secret values or runtime payloads were read or copied for ALC-002.
