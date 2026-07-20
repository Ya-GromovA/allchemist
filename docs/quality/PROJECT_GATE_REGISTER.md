# Project Gate Register

Task: ALC-003
Detailed criteria: `docs/architecture/MIGRATION_GATES.md`

## Current register

| Gate | Status | Owner | Primary blocking tasks | Current evidence | Missing evidence |
|---|---|---|---|---|---|
| G0 BACKUP_AND_BASELINE | PASS | repository + operations | complete ALC-000/001 | verified backup, attribution, local commit, clean isolated baseline | approved remote publication belongs to G1 |
| G1 CLEAN_REPOSITORY | PARTIAL | repository + path owners | ALC-003 publication follow-up; ALC-007/008 runtime migration | clean normalization branch; hygiene PASS; secret/runtime/generated tracked scans zero; 23 duplicate groups explicitly retained; fresh detached checkout install/typechecks/build PASS with zero diff | approved remote publication is prohibited/not done; production remains dirty; runtime consumers still use source-relative and `/root/synapse` fallbacks pending G5/G6 |
| G2 SAFE_TOOLCHAIN | PARTIAL | quality + CI/release | ALC-006 | side-effect registry, safe isolated build evidence | repaired mixed tool, target CI, lint/check-mode guarantees |
| G3 RESTART_SAFE_PREVIEW | PASS | operations + release | completed by ALC-001/007A evidence | canonical 3011 enabled/active, nine-route and asset smoke, protected ingress, rollback; obsolete 3010 retired | none for restart-safe preview |
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

G1 remains `PARTIAL`, not because clean-source reproduction failed, but because its full exit criteria require approved remote durability and completed/approved runtime separation. ALC-003 proved the local clean-source portion at hygiene commit `13e07a5`; it did not have permission to push or migrate production/runtime data.

## ALC-007 gate update

- G5 DATA_AND_MIGRATIONS: **FAIL** — catalog baseline exists, but no revision tree, isolated DB, restore proof or environment separation.
- G6 SECURITY_FOUNDATION: **PARTIAL** — controls exist, but P0 exposure/permissions and tenant/auth/secrets evidence gaps remain.
- G7 TARGET_ARCHITECTURE_APPROVAL: **PARTIAL** — target decisions documented; owner/architect/vendor/privacy approvals absent.
- G9 IMPLEMENTATION_READY: **NOT_STARTED** — ALC-007 is planning evidence only; prerequisite gates remain incomplete.

## ALC-007A final gate update

G3 is PASS. G6 remains PARTIAL, but its ALC-007 P0 network and repository-permission findings are RESOLVED. Repository deploy-key publication and owner manual Basic Auth acceptance passed. ALC-008 is ready to begin under its isolated database/migration scope; G5 remains FAIL until ALC-008 evidence exists.
