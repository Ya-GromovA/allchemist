# Migration Gates

Task: ALC-003 update. A gate status is evidence-based and does not authorize the next production action by itself.

## Status summary

| Status | Count | Gates |
|---|---:|---|
| PASS | 1 | G0 |
| PARTIAL | 5 | G1, G2, G3, G6, G7 |
| FAIL | 3 | G4, G5, G8 |
| NOT_STARTED | 2 | G9, G10 |

## G0 — BACKUP_AND_BASELINE

- Required evidence: verified protected backup, source attribution, local baseline commit, clean isolated worktree.
- Owner: repository + operations.
- Blocking tasks: ALC-000/001.
- Entry: production evidence captured without cleanup.
- Exit: backup checksums pass; baseline commit and attribution exist.
- Rollback: retain original production checkout and protected backup.
- Current status: **PASS**.
- Evidence: ALC-001 backup 60/60, commit `c18b3d8`, attribution report; ALC-002 synchronized final reports.

## G1 — CLEAN_REPOSITORY

- Required evidence: approved tracked source, runtime/generated separation, all duplicate decisions, secret-free tree, reproducible clean clone.
- Owner: repository governance plus all path owners.
- Blocking tasks: approved publication follow-up; ALC-007/008 runtime decision; ALC-RM-001/003 and partial ALC-RM-004/005.
- Entry: G0 PASS and explicit path inventory.
- Exit: approved remote baseline; clean clone reproduces source/build inputs; no runtime/generated/secrets; duplicate inventory resolved or explicitly retained.
- Rollback: preserve ALC-001 local branch/archive and never clean production in place.
- Current status: **PARTIAL**.
- Evidence: normalization commit `13e07a5`; read-only hygiene check PASS; generated/runtime/secret tracked violations zero; all 23 duplicate groups/54 files reproduced and explicitly retained with follow-ups; install, required typechecks and web build PASS in both the working and a fresh detached checkout; fresh checkout initial/final status and tracked diff are zero.
- Remaining gap: no approved remote publication because push was explicitly prohibited; production remains dirty and untouched; mutable-state consumers still contain source-relative and `/root/synapse` paths pending G5/G6 and ALC-007/008.

## G2 — SAFE_TOOLCHAIN

- Required evidence: commands classified; check/test/build/deploy separated; no unexpected side effects; clean CI environment.
- Owner: quality + release/CI.
- Blocking tasks: ALC-006; ALC-RM-010/011/012/039.
- Entry: G1 source baseline available.
- Exit: guarded commands declare writes/network/DB; CI runs target checks in disposable workspace; unsafe command behavior repaired.
- Rollback: disable/revert workflow/tool entrypoint; retain explicit known-safe commands.
- Current status: **PARTIAL**.
- Evidence/gap: command registry exists and isolated typechecks/build passed; `verify-ui-foundation` remains mixed and CI omits target gates/lint.

## G3 — RESTART_SAFE_PREVIEW

- Required evidence: permanent immutable release, systemd/service ownership, restart test, health check, rollback, approved access/domain.
- Owner: operations + release.
- Blocking tasks: ALC-004; ALC-RM-008/009; ADR-013.
- Entry: verified artifact from clean baseline and change authorization.
- Exit: service survives restart; health/routes/static pass; rollback rehearsed; current process retired safely.
- Rollback: atomic selection of prior verified release and config backup.
- Current status: **PARTIAL**.
- Evidence/gap: recovered artifact has BUILD_ID, 1399/1399 checksums, cold-start smoke; no permanent service/switch/restart/rollback/domain.

## G4 — CRITICAL_LEGACY_STABILITY

- Required evidence: legacy admin parses, critical public/admin/API routes and workflows pass, production backup, no hidden blocker.
- Owner: legacy/backend + QA + operations.
- Blocking tasks: ALC-005; ALC-RM-013.
- Entry: G0 and focused repair plan.
- Exit: syntax and regression pass; auth/RBAC unchanged; rollback artifact verified.
- Rollback: restore exact previous legacy artifact and route.
- Current status: **FAIL**.
- Evidence/gap: public JavaScript parsed, but admin JavaScript has a confirmed duplicate declaration.

## G5 — DATA_AND_MIGRATIONS

- Required evidence: migration framework, isolated test DB, production schema baseline, forward/dry run, rollback, restore rehearsal.
- Owner: database + backend + operations/security.
- Blocking tasks: ALC-008; ALC-RM-005/014/015/018/022; ADR-001/018.
- Entry: G1 baseline and protected backups.
- Exit: revisions reproduce schema; isolated migration/rollback/restore and invariants pass; runtime state plan approved.
- Rollback: tested database restore and state reconciliation.
- Current status: **FAIL**.
- Evidence/gap: PostgreSQL healthy and schema inventoried; no revision tree, current full isolated tests, migration run, rollback, or restore proof.

## G6 — SECURITY_FOUNDATION

- Required evidence: auth policy, session lifecycle, RBAC matrix, tenant adversarial tests, secret management, durable audit.
- Owner: security + backend + product.
- Blocking tasks: ALC-007; ALC-RM-019/020/021/024/030/035/037.
- Entry: G1 plus isolated test environment design.
- Exit: positive/negative auth/RBAC/tenant tests pass; secrets and audit owners/retention/rotation approved.
- Rollback: retain legacy enforcement, revoke test credentials/tokens, restore prior policy adapters.
- Current status: **PARTIAL**.
- Evidence/gap: backend policies/routes/tests exist; tenant coverage, registration/session E2E, secret store, audit immutability, and notifications remain open.

## G7 — TARGET_ARCHITECTURE_APPROVAL

- Required evidence: bounded contexts, ADR decisions, ownership, dependency rules, migration sequence.
- Owner: architecture council plus domain owners.
- Blocking tasks: ALC-007 and ALC-009; ADR-001 through ADR-018 as applicable.
- Entry: G0 and evidence-backed current-state audit.
- Exit: this plan and required ADRs approved; owners accept boundaries; repository/data/deployment sequence agreed.
- Rollback: reject/supersede ADRs before implementation; no runtime rollback because planning only.
- Current status: **PARTIAL**.
- Evidence/gap: bounded contexts and backlog exist, but ADRs and ownership are not approved.

## G8 — DESIGN_FOUNDATION_IMPORT

- Required evidence: approved documents, canonical storage, manifest, provenance, all critical references present.
- Owner: design + product + content provenance.
- Blocking tasks: ALC-010; ALC-RM-033/040; ADR-015.
- Entry: G1 source boundary and approved design authority.
- Exit: manifest checker passes; critical references and hashes/provenance are complete; generated screenshots are separated.
- Rollback: revert unapproved import and retain previous manifest/goldens.
- Current status: **FAIL**.
- Evidence/gap: only 1/8 references present; chemistry, physics, and biology critical references are missing.

## G9 — IMPLEMENTATION_READY

- Required evidence: G1/G2/G5/G6/G7/G8 pass as applicable; contracts/acceptance approved; isolated workstreams and CI gates active.
- Owner: product + architecture + engineering + QA/security.
- Blocking tasks: ALC-003 through ALC-010 and ALC-RM-025/026/028/029/031/032.
- Entry: all foundation gates for the scoped capability pass.
- Exit: task scope, owner, paths, tests, design/data/security contracts, and rollback are approved.
- Rollback: close/revert feature worktree; no route switch.
- Current status: **NOT_STARTED**.

## G10 — PRODUCTION_ROUTE_SWITCH

- Required evidence: feature/data/visual parity, E2E, security, observability, backup, rollback rehearsal, explicit product/operations approval.
- Owner: product + operations + security + QA.
- Blocking tasks: completed scoped migration after G9; legacy retention plan.
- Entry: target runs in approved preview/staging with stable evidence.
- Exit: bounded production switch passes health/monitoring and rollback window; legacy remains archived.
- Rollback: immediate atomic route/release rollback to verified legacy artifact.
- Current status: **NOT_STARTED**.

## Gate discipline

- FAIL or NOT_STARTED blocks dependent work.
- PARTIAL never permits a production route switch or legacy deletion.
- Evidence paths and owner approval must be recorded in `PROJECT_GATE_REGISTER.md`.
- Gate status changes require a dedicated TASK-ID; ALC-002 itself changes no operational gate beyond documenting evidence.
