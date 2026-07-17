# Project Gate Register

Task: ALC-004B1
Detailed criteria: `docs/architecture/MIGRATION_GATES.md`

## Current register

| Gate | Status | Owner | Primary blocking tasks | Current evidence | Missing evidence |
|---|---|---|---|---|---|
| G0 BACKUP_AND_BASELINE | PASS | repository + operations | complete ALC-000/001 | verified backup, attribution, local commit, clean isolated baseline | approved remote publication belongs to G1 |
| G1 CLEAN_REPOSITORY | PARTIAL | repository + path owners | ALC-007/008 runtime migration | published clean normalization branch; hygiene PASS; recovery commit is in durable remote ancestry; fresh detached checkout checks/build PASS | production remains dirty; runtime consumers still use source-relative and `/root/synapse` fallbacks pending G5/G6 |
| G2 SAFE_TOOLCHAIN | PARTIAL | quality + CI/release | ALC-006 | side-effect registry, safe isolated build evidence | repaired mixed tool, target CI, lint/check-mode guarantees |
| G3 RESTART_SAFE_PREVIEW | PARTIAL | operations + release | ALC-004B2; ALC-RM-008 | immutable 3011 release; unprivileged enabled service; health, restart and rollback PASS; DNS/TLS/access plan validated | owner DNS action, preview certificate, Basic Auth, public route/PWA verification, observation, retirement of 3010 |
| G4 CRITICAL_LEGACY_STABILITY | FAIL | legacy/backend + QA | ALC-005 | public route health and public JS parse evidence | admin JS syntax and critical workflow regression |
| G5 DATA_AND_MIGRATIONS | FAIL | database + backend + ops | ALC-008 | production schema inventory and backup presence | revision tree, isolated DB, migration/rollback/restore |
| G6 SECURITY_FOUNDATION | PARTIAL | security + backend/product | ALC-007 | auth/RBAC/tenant contracts and selected tests | full lifecycle, adversarial tenant/RBAC, secrets, immutable audit |
| G7 TARGET_ARCHITECTURE_APPROVAL | PARTIAL | architecture + domain owners | ALC-007/009 | bounded-context proposal and ADR backlog | formal decisions and owner approval |
| G8 DESIGN_FOUNDATION_IMPORT | FAIL | design + product | ALC-010 | manifest and student-dashboard golden | 7 references, including 3 critical science goldens; provenance |
| G9 IMPLEMENTATION_READY | NOT_STARTED | product + engineering + QA/security | ALC-003–010 | planning documents only | prerequisite gates, CI and approved workstreams |
| G10 PRODUCTION_ROUTE_SWITCH | NOT_STARTED | product + operations + security + QA | post-G9 migration task | legacy remains active and healthy | full parity, E2E, security, monitoring, rollback, approval |

## Counts

- PASS: 1
- PARTIAL: 5
- FAIL: 3
- NOT_STARTED: 2

## Evidence rules

1. Evidence must identify commit/artifact/config hash and environment.
2. Test evidence must identify whether state is isolated and whether commands write.
3. HTTP 200 alone is not feature parity.
4. File existence alone is not runtime readiness.
5. A backup checksum alone is not restore proof.
6. A local commit alone is not durable repository publication.
7. A design screenshot outside the canonical manifest is not an approved reference.
8. No secret/runtime payload may be embedded in evidence.

## Status update protocol

Each update records:

- TASK-ID and date;
- old/new status;
- exact acceptance evidence;
- owner approval;
- remaining exceptions;
- rollback evidence when production/data/security is involved.

No task may mark G10 PASS implicitly. Production switching always requires a separate explicit approval.

## ALC-003 update

G1 remains `PARTIAL`, not because clean-source reproduction or remote durability failed, but because production remains dirty and runtime consumers still require approved separation. The normalization ref at `32aef1e` is published and contains recovery commit `c18b3d8` in its ancestry.

## ALC-004B1 update

G3 remains `PARTIAL`. ALC-004A established an immutable, restart-safe 3011 service with health and rollback evidence. ALC-004B1 confirmed Cloudflare DNS ownership, origin IPv4, Certbot nginx issuance, and the Basic Auth + TLS + NOINDEX decision; it validated the repository nginx template without applying it.

Remaining blockers are the manual preview A record, dedicated certificate, protected credential, public route verification, observation window, and safe retirement of legacy 3010. This planning evidence authorizes no public change by itself.
