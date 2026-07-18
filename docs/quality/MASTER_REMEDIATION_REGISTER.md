# Master Remediation Register

Task: ALC-003
Latest evidence update: ALC-005 on 2026-07-18
Normalization source: `b7df19563be5df99dcde1b50d091d2d5335afbe6`
Normalization hygiene commit: `13e07a54589a42c0b70649b098dc883d80ed81ee`
Branch: `chore/alc-003-repository-normalization-20260714-140056`
Machine-readable source of truth: `docs/quality/master-remediation-register.json`

## Scope and evidence

This register consolidates confirmed findings from:

- `CURRENT_STATE_AUDIT.md`
- `CURRENT_RUNTIME_ROUTE_MAP.md`
- `LEGACY_AND_TARGET_MAP.md`
- `WORKTREE_AND_FILE_OWNERSHIP_PROPOSAL.md`
- `BASELINE_READINESS_REPORT.md`
- all six ALC-001 reports
- ALC-002 read-only inspection of Git, manifests, routes, package imports, CI, state consumers, infrastructure inventory, and running service metadata
- ALC-003 path-only secret/runtime/generated scan, duplicate hash/consumer review, source-control metadata inspection, isolated checks, and clean-checkout reproduction
- ALC-005 read-only legacy-admin renderer analysis, ESM syntax validation, isolated static/backend tests, and no-deploy invariant checks

`NEEDS_VERIFICATION` means the repository or runtime does not prove the condition strongly enough. It is not presented as fact. This register authorizes no production change or deletion.

## Counts

| Measure | Count |
|---|---:|
| Total issues | 40 |
| P0 | 2 |
| P1 | 27 |
| P2 | 10 |
| P3 | 1 |
| OPEN | 25 |
| NEEDS_VERIFICATION | 9 |
| PARTIAL | 3 |
| RESOLVED | 3 |

Category counts:

| Category | Count | Category | Count |
|---|---:|---|---:|
| REPOSITORY | 2 | SOURCE_CONTROL | 2 |
| GENERATED_ARTIFACTS | 1 | RUNTIME_STATE | 1 |
| LEGACY | 2 | PREVIEW_RUNTIME | 2 |
| BUILD_TOOLING | 2 | CI_CD | 1 |
| INFRASTRUCTURE | 2 | DATABASE | 1 |
| MIGRATIONS | 1 | CACHE_REDIS | 1 |
| OBJECT_STORAGE | 1 | BACKEND | 1 |
| FRONTEND | 2 | ADMIN | 1 |
| MOBILE_PWA | 2 | AUTH | 1 |
| RBAC | 1 | TENANT_ISOLATION | 1 |
| SECURITY | 2 | CONTENT | 2 |
| CONTENT_QA | 1 | SCIENCE_ENGINES | 1 |
| OBSERVABILITY | 1 | BACKUP_RESTORE | 1 |
| TESTING | 2 | DOCUMENTATION | 1 |
| DESIGN_INPUT_PENDING | 1 |  |  |

## Issue index

| ID | Severity | Category | Status | Title | Proposed task | Gate | Parallel |
|---|---|---|---|---|---|---|---|
| ALC-RM-001 | P1 | REPOSITORY | OPEN | Production checkout is dirty | ALC-003 | G1 | NO |
| ALC-RM-002 | P1 | SOURCE_CONTROL | RESOLVED | Target architecture was previously untracked | ALC-003 | G1 | NO |
| ALC-RM-003 | P1 | SOURCE_CONTROL | OPEN | Baseline commit exists only locally | ALC-003 | G1 | NO |
| ALC-RM-004 | P1 | GENERATED_ARTIFACTS | PARTIAL | Generated output remains entangled with production history | ALC-003 | G1 | YES |
| ALC-RM-005 | P1 | RUNTIME_STATE | PARTIAL | Mutable runtime JSON lives under source paths | ALC-007 | G5 | NO |
| ALC-RM-006 | P2 | REPOSITORY | RESOLVED | 23 duplicate groups need consumer-aware decisions | ALC-003 | G1 | YES |
| ALC-RM-007 | P1 | LEGACY | OPEN | Legacy and target boundaries are incomplete | ALC-009 | G7 | YES |
| ALC-RM-008 | P0 | PREVIEW_RUNTIME | OPEN | Preview 3010 runs from deleted cwd | ALC-004 | G3 | NO |
| ALC-RM-009 | P1 | PREVIEW_RUNTIME | OPEN | Recovered artifact is not a permanent service | ALC-004 | G3 | NO |
| ALC-RM-010 | P1 | BUILD_TOOLING | OPEN | verify-ui-foundation has unexpected side effects | ALC-006 | G2 | YES |
| ALC-RM-011 | P1 | BUILD_TOOLING | OPEN | Tool commands are not uniformly separated by side effect | ALC-006 | G2 | YES |
| ALC-RM-012 | P1 | CI_CD | OPEN | CI does not gate the target monorepo | ALC-006 | G2 | YES |
| ALC-RM-013 | P0 | LEGACY | PARTIAL | Legacy admin JavaScript fails syntax parsing | ALC-005 | G4 | NO |
| ALC-RM-014 | P1 | MIGRATIONS | OPEN | No Alembic revision tree exists | ALC-008 | G5 | NO |
| ALC-RM-015 | P1 | DATABASE | OPEN | Database migrations and rollback are untested | ALC-008 | G5 | NO |
| ALC-RM-016 | P2 | CACHE_REDIS | NEEDS_VERIFICATION | Redis responsibility is not established | ALC-007 | G7 | YES |
| ALC-RM-017 | P2 | OBJECT_STORAGE | NEEDS_VERIFICATION | Object-storage runtime is not confirmed | ALC-007 | G7 | YES |
| ALC-RM-018 | P1 | TESTING | OPEN | Backend tests lack a current full isolated run | ALC-008 | G5 | YES |
| ALC-RM-019 | P1 | TENANT_ISOLATION | OPEN | School isolation is only partially proven | ALC-007 | G6 | NO |
| ALC-RM-020 | P1 | AUTH | NEEDS_VERIFICATION | Registration and session lifecycle are incomplete | ALC-007 | G6 | NO |
| ALC-RM-021 | P1 | RBAC | OPEN | RBAC parity lacks end-to-end verification | ALC-007 | G6 | NO |
| ALC-RM-022 | P1 | BACKUP_RESTORE | OPEN | Backup exists but restore is not proven | ALC-008 | G5 | NO |
| ALC-RM-023 | P1 | OBSERVABILITY | NEEDS_VERIFICATION | Production error tracking is not confirmed | ALC-007 | G7 | YES |
| ALC-RM-024 | P1 | SECURITY | NEEDS_VERIFICATION | Audit retention and immutability are unverified | ALC-007 | G6 | NO |
| ALC-RM-025 | P1 | FRONTEND | OPEN | Target web is demo-backed with no API wiring | ALC-009 | G9 | YES |
| ALC-RM-026 | P1 | ADMIN | OPEN | Target admin is placeholder-only and has no runtime | ALC-009 | G9 | NO |
| ALC-RM-027 | P2 | MOBILE_PWA | OPEN | Mobile/PWA offline migration is partial | ALC-007 | G7 | YES |
| ALC-RM-028 | P1 | SCIENCE_ENGINES | OPEN | Science engines are partial and mostly untested | ALC-009 | G9 | YES |
| ALC-RM-029 | P2 | FRONTEND | OPEN | Assignments workflow is partial | ALC-009 | G9 | YES |
| ALC-RM-030 | P2 | BACKEND | OPEN | Feature flags lack a managed lifecycle | ALC-007 | G6 | YES |
| ALC-RM-031 | P1 | CONTENT | OPEN | Content publication boundary is incomplete | ALC-009 | G7 | NO |
| ALC-RM-032 | P1 | CONTENT_QA | OPEN | Content QA target workflow is not E2E verified | ALC-009 | G9 | NO |
| ALC-RM-033 | P1 | DESIGN_INPUT_PENDING | OPEN | Seven of eight approved references are missing | ALC-010 | G8 | YES |
| ALC-RM-034 | P1 | INFRASTRUCTURE | NEEDS_VERIFICATION | Live infrastructure ownership/parity are unknown | ALC-007 | G7 | NO |
| ALC-RM-035 | P1 | SECURITY | NEEDS_VERIFICATION | Secret-management boundary is not proven | ALC-007 | G6 | NO |
| ALC-RM-036 | P2 | INFRASTRUCTURE | NEEDS_VERIFICATION | Queue/background-job boundary is undefined | ALC-007 | G7 | YES |
| ALC-RM-037 | P2 | MOBILE_PWA | NEEDS_VERIFICATION | Notification delivery readiness is unverified | ALC-007 | G6 | YES |
| ALC-RM-038 | P3 | DOCUMENTATION | RESOLVED | Final ALC-001 reports were stale or missing in baseline | ALC-002 | G0 | YES |
| ALC-RM-039 | P2 | TESTING | OPEN | No repository lint gate exists | ALC-006 | G2 | YES |
| ALC-RM-040 | P2 | CONTENT | OPEN | Media/design asset provenance is incomplete | ALC-010 | G8 | YES |

## Priority interpretation

- P0 items are not permission for immediate production mutation. They require protected rollback and explicit operational authorization.
- P1 items block their named migration gate.
- P2 items block only the affected capability or architecture decision.
- P3 is governance debt; ALC-RM-038 is resolved by the ALC-002 report synchronization.

## Complete issue fields

The JSON register contains, for every stable ID:

- title and source evidence;
- category, severity, and current status;
- affected paths/services and production impact;
- data-loss and security risk;
- dependency and remediation proposal;
- TASK-ID and owner/workstream;
- acceptance and validation evidence;
- rollback requirement and blocking gate;
- parallel-safety decision and notes.

No issue may be closed from a code diff alone. Closure requires its acceptance evidence and the corresponding gate update.

## ALC-003 status evidence

- `ALC-RM-002` is `RESOLVED` for the normalization branch: the recovered source is tracked, the branch builds from a zero-diff fresh checkout, and no production-only file is required. Remote durability remains a separate open issue under `ALC-RM-003` because push was prohibited.
- `ALC-RM-004` is `PARTIAL`: generated output is absent from the target tracked set, explicitly ignored, and reproduced only as ignored workspace output. The dirty production checkout/history was intentionally not normalized.
- `ALC-RM-005` is `PARTIAL`: runtime/user/security paths are untracked and ignored, and every confirmed consumer is documented. Source-relative and `/root/synapse` fallbacks remain, so storage migration is blocked for ALC-007/008 rather than claimed complete.
- `ALC-RM-006` is `RESOLVED` as a G1 classification item: all 23 groups/54 files reproduce the protected hash inventory, zero files were deleted, every group is explicitly retained, and each unresolved canonicalization has a follow-up ID. This does not authorize later consolidation.
- `ALC-RM-001` and `ALC-RM-003` remain `OPEN`: production is still dirty by design and no remote publication occurred.
- `ALC-RM-040` remains `OPEN`; inspection additionally found the tracked 14,341,981-byte `mobile/assets/content/chemistry_molecules_layer_b_v1.json`, which requires content/provenance and large-file policy review before any relocation.

## ALC-005 status evidence

- `ALC-RM-013` moves from `OPEN` to `PARTIAL`: six obsolete renderer implementations were removed while six canonical functions in `Final visual renderers` were retained.
- `node --check`, duplicate-declaration scanning, four static regression tests, four isolated backend tests, and an isolated TestClient smoke pass.
- The backend image tests ran with `--network none`, read-only source mount, read-only root filesystem, temporary `/tmp`, and empty database/Redis/cache URLs.
- G4 remains `FAIL` because this task performs no merge, production deployment, production admin workflow test, or rollback rehearsal.

## Update protocol

1. Stable IDs never change or get reused.
2. New evidence may change status or severity only with a dated note.
3. `NEEDS_VERIFICATION` becomes `OPEN` when a problem is confirmed, `RESOLVED` when disproven or remediated with evidence.
4. `PARTIAL` means an independently verifiable portion is corrected but the issue's complete acceptance evidence is not available.
5. A production-impacting item cannot become `RESOLVED` without rollback evidence.
6. Markdown and JSON counts must be validated together.
