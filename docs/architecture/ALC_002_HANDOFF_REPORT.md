# ALC-002 Handoff Report

Date: 2026-07-14 (Europe/Moscow)

## Summary

ALC-002 consolidates remediation, repository/runtime/legacy separation, target bounded contexts, ADR candidates, migration gates, and the ALC-003–010 roadmap. It changes documentation only in the isolated baseline. It performs no build, install, test against production, migration, deletion, service switch, or production write.

## Preflight

| Check | Result |
|---|---|
| Isolated worktree | `/root/worktrees/allchemist-recovery-20260714-112717` |
| Branch | `baseline/allchemist-recovery-20260714-112717` |
| Starting HEAD | `c18b3d89c38e28b47f46816326981720fb30e253` |
| Starting status | clean |
| Production HEAD | `d3106a0df8bfe5da2fad87602c13fd9beeddedaa` |
| Production status | 34 modified tracked, 1375 untracked |
| Production tracked-path hash | `1968f137f9bd343f73957d987a89b135de5e76204201e53291b989c93400bb21` |
| ALC-001 backup | exists, mode 0700, 60/60 checksums |
| Recovered artifact | exists, BUILD_ID and server entry; 1399/1399 checksums |
| Preview | PID 1603626, port 3010, deleted cwd, HTTP 200 |
| Production services | nginx active; backend and PostgreSQL healthy |

## Audit report synchronization

All sources were Markdown/text. Credential-pattern count was zero. No runtime/user payload was copied.

| Path | Production SHA-256 | Baseline SHA-256 before sync | Action | Reason |
|---|---|---|---|---|
| `CURRENT_STATE_AUDIT.md` | `4bb7f8a22fe5f6974d0ba7f533a538cb954005062116283992e22ba615f0b062` | `4bb7f8a22fe5f6974d0ba7f533a538cb954005062116283992e22ba615f0b062` | none | identical ALC-000 final report |
| `CURRENT_RUNTIME_ROUTE_MAP.md` | `85c984f7c473bceefb757dd8049837ad75c8f4459219b6e87ef0630ad0daa791` | `85c984f7c473bceefb757dd8049837ad75c8f4459219b6e87ef0630ad0daa791` | none | identical ALC-000 final report |
| `LEGACY_AND_TARGET_MAP.md` | `e524d1ee1889041dd37889007c999a029d7056305539fe41876ba0ab94ecc297` | `e524d1ee1889041dd37889007c999a029d7056305539fe41876ba0ab94ecc297` | none | identical ALC-000 final report |
| `WORKTREE_AND_FILE_OWNERSHIP_PROPOSAL.md` | `e14a6a2c31368870ad294fc7cb22c554f3dc82d46ba6abfb42e3ca84c2607721` | `e14a6a2c31368870ad294fc7cb22c554f3dc82d46ba6abfb42e3ca84c2607721` | none | identical ALC-000 final report |
| `BASELINE_READINESS_REPORT.md` | `445b4f11d7a83006733ea4d801f913e5b659f5a488948973fb40b109cb1ba6a4` | `601719b5df9d3b02b0f10c270785445714ef10a45739f5dd3101b2b17cf06897` | updated | production contains the final ALC-001 readiness update |
| `ALC_001_REPOSITORY_BASELINE_REPORT.md` | `5887ff255a03919c942a35b68d95f28bf2fa4662e7ab3e46a85a8834c3afe841` | MISSING | copied | final report was created after the ALC-001 baseline commit |
| `ALC_001_FILE_ATTRIBUTION.md` | `ecb77e616f10ec415776189c418ea7fd2d7c581d80cceaa78c600ff2114151e9` | `3eac2889c6a226406ca84c86071dc0b7b7f6f0f6dd1c946518a07f75749f1660` | updated | final counts include reviewed design-token false positives |
| `ALC_001_ISOLATED_WORKTREE_REPORT.md` | `a95a4d50c5dbaba752413334ac356db56b36e78f69f2f84688137dfec925ac96` | MISSING | copied | final report was created after the ALC-001 baseline commit |
| `COMMAND_SIDE_EFFECT_REGISTRY.md` | `2cf3b79b1fbdd792cccb2c6c7d7c2912ef75b2d82562bbf10960cece4f64b764` | `9c0172f3b6260134f9869c6ced734cf636f4564126b51d955875bddeddca98d3` | updated | final version records actual ALC-001 commands/results |
| `ALC_001_PREVIEW_RECOVERY_REPORT.md` | `bab346fd1fc4864152970eee73ba71436f55feed9fe9103344e376e8f8282c61` | MISSING | copied | final artifact/smoke report post-dates the baseline commit |
| `ALC_001_ACCEPTANCE_REPORT.md` | `08a4e5e6d94784f7287ee1fbaf4ec87fbb9c2fa09e30d113f4849c4acc949178` | MISSING | copied | final acceptance matrix post-dates the baseline commit |

## Master register

- Total: 40.
- Severity: P0 2, P1 27, P2 10, P3 1.
- Status: OPEN 30, NEEDS_VERIFICATION 9, RESOLVED 1.
- Complete issue fields are stored in `master-remediation-register.json`.

## Architecture and cleanup conclusions

- Source stays tracked; generated/dependency output stays reproducible outside Git.
- Runtime/user/security state moves only through tested storage migrations.
- All 23 non-empty duplicate groups remain retained until consumer proof.
- Legacy public/admin remain active behavior/rollback references until G10.
- Target architecture is proposed through 18 bounded contexts.
- Eighteen ADR candidates capture unresolved technology/ownership decisions.

## Gate status

- PASS: G0.
- PARTIAL: G1, G2, G3, G6, G7.
- FAIL: G4, G5, G8.
- NOT_STARTED: G9, G10.

## Validation and commit

Required before the local commit:

- all 13 required reports exist;
- JSON parses and count/index parity passes;
- only Markdown/JSON documentation is changed;
- no secret/runtime/generated payload patterns;
- `git diff --check` passes;
- explicit path staging only.

Planned commit subject:

`docs(architecture): add remediation and migration gate plan`

The commit hash cannot be embedded in a file inside the same commit without a self-reference. The final external handoff must report `git rev-parse HEAD`.

## Blockers

- P0: preview 3010 deleted cwd; legacy admin syntax failure.
- G5: no migration chain, isolated migration/rollback/restore proof.
- G8: seven missing references, including three critical science references.
- G6/G7: tenant/RBAC/secrets/audit and major ADR approvals remain incomplete.
- Production changes remain unauthorized.

## Recommendation

Next task: `ALC-003 — SAFE REPOSITORY NORMALIZATION`.

Ready for ALC-003 after this document set is committed and the isolated worktree is clean: **YES**.
Ready for production changes: **NO**.
