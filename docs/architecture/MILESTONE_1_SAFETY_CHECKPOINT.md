# Milestone 1 Safety Checkpoint

## 1. Purpose

This checkpoint records the Milestone 1 foundation state before starting Milestone 2. It verifies that the expected packages, documents, scripts and root package files exist, captures git/diff snapshots, reruns validation commands, and documents what should or should not be included in a future manual commit.

## 2. Verified files

| path | exists yes/no | type | notes |
| --- | --- | --- | --- |
| `packages/ai-assistant` | yes | package | directory |
| `packages/content-core` | yes | package | directory |
| `packages/content-qa-core` | yes | package | directory |
| `packages/science-core` | yes | package | directory |
| `packages/chemistry-core` | yes | package | directory |
| `packages/chemistry-lab-engine` | yes | package | directory |
| `packages/physics-core` | yes | package | directory |
| `packages/physics-sim-engine` | yes | package | directory |
| `packages/biology-core` | yes | package | directory |
| `packages/microscope-viewer` | yes | package | directory |
| `packages/progress-core` | yes | package | directory |
| `docs/architecture/ARCHITECTURE_AUDIT_APPROVED_UI.md` | yes | doc | file |
| `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md` | yes | doc | file |
| `docs/architecture/CODEX_HANDOFF_MILESTONE_1_FOUNDATION.md` | yes | doc | file |
| `docs/architecture/DATA_STORAGE_DECISION.md` | yes | doc | file |
| `docs/architecture/BACKEND_SCHEMA_ROADMAP.md` | yes | doc | file |
| `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md` | yes | doc | file |
| `tools/playwright-approved-ui-smoke.mjs` | yes | script | file |
| `package.json` | yes | root | file |
| `package-lock.json` | yes | root | file |

## 3. Milestone 1 file set

### New packages

- `packages/ai-assistant`
- `packages/content-core`
- `packages/content-qa-core`
- `packages/science-core`
- `packages/chemistry-core`
- `packages/chemistry-lab-engine`
- `packages/physics-core`
- `packages/physics-sim-engine`
- `packages/biology-core`
- `packages/microscope-viewer`
- `packages/progress-core`

### Changed existing packages

- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`
- `packages/ui/src/styles.css`

### New docs

- `docs/architecture/ARCHITECTURE_AUDIT_APPROVED_UI.md`
- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/DATA_STORAGE_DECISION.md`
- `docs/architecture/BACKEND_SCHEMA_ROADMAP.md`
- `docs/architecture/MILESTONE_1_SAFETY_CHECKPOINT.md`
- `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md`

### New tools

- `tools/playwright-approved-ui-smoke.mjs`

### Root package files

- `package.json`
- `package-lock.json`

## 4. Current git status

Command: `git status --short`

```text
 M assistant_log.md
 M backend/app/api/v1/endpoints/admin_panel.py
 M backend/app/api/v1/endpoints/public_web.py
 M backend/app/api/v1/endpoints/system.py
 M backend/app/services/admin_panel_service.py
 M backend/app/web_admin/app.js
 M backend/app/web_admin/index.html
 M backend/app/web_admin/styles.css
 M backend/app/web_public/app.js
 M backend/app/web_public/index.html
 M backend/app/web_public/styles.css
 M backend/data/security/alerts_ack.json
 M backend/data/security/backup_dry_run_history.json
 M backend/data/security/backup_dry_run_status.json
 M backend/data/security/go_no_go_history.json
 M backend/data/security/handover_archive.json
 M backend/data/security/mobile_onboarding_smoke_status.json
 M backend/data/user_state.json
 M backend/tests/test_admin_panel.py
 M backend/tests/test_admin_web.py
 M backend/tests/test_public_web.py
 M content_packs/allchemist-apk-latest.json
 M docs/qa/stage-ledger.md
 M mobile/App.tsx
 M mobile/android/app/build.gradle
 M mobile/app/components/AppBackground.tsx
 M mobile/app/screens/OnboardingRoleScreen.tsx
 M mobile/app/screens/PeriodicTableScreen.tsx
 M mobile/app/screens/WebFallbackShell.tsx
 M mobile/assets/content/chemistry_pack_v1.json
 M mobile/assets/content/physics_pack_v1.json
 M tools/playwright-admin-auth-roles-smoke.mjs
 M tools/playwright-authenticated-roles-smoke.mjs
 M tools/playwright-visual-smoke.mjs
?? AGENTS.md
?? apps/
?? artifacts/
?? backend/app/web_public/alchemist-hero.png
?? backend/app/web_public/alchemist-hero.webp
?? backend/app/web_public/fon-2.png
?? backend/app/web_public/fon-2.webp
?? backend/app/web_public/main-bg-science.png
?? backend/app/web_public/main-bg-science.webp
?? backend/app/web_public/periodic-table-reference.png
?? backend/app/web_public/periodic-table-reference.webp
?? backend/app/web_public_react/
?? docs/architecture/
?? docs/codex/
?? docs/contracts/
?? docs/design/
?? docs/infra/
?? docs/migration/
?? docs/product/
?? docs/quality/
?? mobile/assets/backgrounds/
?? mobile/assets/brand/
?? mobile/assets/periodic-table/
?? package-lock.json
?? package.json
?? packages/
?? tools/capture-ui-snapshots.mjs
?? tools/check-layout-contract.mjs
?? tools/check-student-dashboard-assets.mjs
?? tools/check-student-dashboard-production-readiness.mjs
?? tools/check-student-dashboard-quality.mjs
?? tools/check-student-dashboard-zone-parity.mjs
?? tools/check-visual-parity.mjs
?? tools/extract-student-dashboard-zones.mjs
?? tools/figma-student-dashboard-layer-generator/
?? tools/playwright-approved-ui-smoke.mjs
?? tools/profile-server.mjs
?? tools/ui-foundation-smoke.mjs
?? tools/verify-contract-layer.mjs
?? tools/verify-ui-foundation.mjs
```

## 5. Milestone 1 diff snapshot

Created checkpoint directory: `artifacts/checkpoints`.

Created files:

```text
-rw-r--r-- 1 root root 1.3K Jul  8 03:25 artifacts/checkpoints/milestone-1-diff-name-only.txt
-rw-r--r-- 1 root root 2.2K Jul  8 03:25 artifacts/checkpoints/milestone-1-diff-stat.txt
-rw-r--r-- 1 root root 1.2M Jul  8 03:25 artifacts/checkpoints/milestone-1-tracked.diff
-rw-r--r-- 1 root root 123K Jul  8 03:25 artifacts/checkpoints/milestone-1-untracked-files.txt
-rw-r--r-- 1 root root 4.9K Jul  8 03:24 artifacts/checkpoints/milestone-1-validation-results.txt
```

Commands executed:

```bash
git diff --stat > artifacts/checkpoints/milestone-1-diff-stat.txt
git diff --name-only > artifacts/checkpoints/milestone-1-diff-name-only.txt
git ls-files --others --exclude-standard > artifacts/checkpoints/milestone-1-untracked-files.txt
git diff > artifacts/checkpoints/milestone-1-tracked.diff
```

Important: untracked files are not included in `git diff` or `artifacts/checkpoints/milestone-1-tracked.diff`. They are captured separately in `artifacts/checkpoints/milestone-1-untracked-files.txt`.

Current `git diff --stat` snapshot:

```text
 assistant_log.md                                   |   273 +
 backend/app/api/v1/endpoints/admin_panel.py        |    91 +
 backend/app/api/v1/endpoints/public_web.py         |    96 +-
 backend/app/api/v1/endpoints/system.py             |     5 +
 backend/app/services/admin_panel_service.py        |   410 +
 backend/app/web_admin/app.js                       |   440 +-
 backend/app/web_admin/index.html                   |   227 +-
 backend/app/web_admin/styles.css                   |  1798 +++
 backend/app/web_public/app.js                      |   376 +-
 backend/app/web_public/index.html                  |    69 +-
 backend/app/web_public/styles.css                  |   218 +-
 backend/data/security/alerts_ack.json              |     4 +-
 backend/data/security/backup_dry_run_history.json  |   168 +
 backend/data/security/backup_dry_run_status.json   |     4 +-
 backend/data/security/go_no_go_history.json        |  1663 +++
 backend/data/security/handover_archive.json        |   252 +
 .../security/mobile_onboarding_smoke_status.json   |     4 +-
 backend/data/user_state.json                       | 12868 +++++++++++++++----
 backend/tests/test_admin_panel.py                  |    81 +-
 backend/tests/test_admin_web.py                    |     7 +-
 backend/tests/test_public_web.py                   |   131 +-
 content_packs/allchemist-apk-latest.json           |    25 +-
 docs/qa/stage-ledger.md                            |   685 +-
 mobile/App.tsx                                     |     6 +-
 mobile/android/app/build.gradle                    |     4 +-
 mobile/app/components/AppBackground.tsx            |     4 +-
 mobile/app/screens/OnboardingRoleScreen.tsx        |    70 +-
 mobile/app/screens/PeriodicTableScreen.tsx         |    37 +-
 mobile/app/screens/WebFallbackShell.tsx            |    57 +-
 mobile/assets/content/chemistry_pack_v1.json       |     6 +-
 mobile/assets/content/physics_pack_v1.json         |  3528 ++++-
 tools/playwright-admin-auth-roles-smoke.mjs        |     8 +-
 tools/playwright-authenticated-roles-smoke.mjs     |    63 +-
 tools/playwright-visual-smoke.mjs                  |    25 +-
 34 files changed, 20775 insertions(+), 2928 deletions(-)
```

Current `git diff --name-only` snapshot:

```text
assistant_log.md
backend/app/api/v1/endpoints/admin_panel.py
backend/app/api/v1/endpoints/public_web.py
backend/app/api/v1/endpoints/system.py
backend/app/services/admin_panel_service.py
backend/app/web_admin/app.js
backend/app/web_admin/index.html
backend/app/web_admin/styles.css
backend/app/web_public/app.js
backend/app/web_public/index.html
backend/app/web_public/styles.css
backend/data/security/alerts_ack.json
backend/data/security/backup_dry_run_history.json
backend/data/security/backup_dry_run_status.json
backend/data/security/go_no_go_history.json
backend/data/security/handover_archive.json
backend/data/security/mobile_onboarding_smoke_status.json
backend/data/user_state.json
backend/tests/test_admin_panel.py
backend/tests/test_admin_web.py
backend/tests/test_public_web.py
content_packs/allchemist-apk-latest.json
docs/qa/stage-ledger.md
mobile/App.tsx
mobile/android/app/build.gradle
mobile/app/components/AppBackground.tsx
mobile/app/screens/OnboardingRoleScreen.tsx
mobile/app/screens/PeriodicTableScreen.tsx
mobile/app/screens/WebFallbackShell.tsx
mobile/assets/content/chemistry_pack_v1.json
mobile/assets/content/physics_pack_v1.json
tools/playwright-admin-auth-roles-smoke.mjs
tools/playwright-authenticated-roles-smoke.mjs
tools/playwright-visual-smoke.mjs
```

## 6. Validation commands

| Command | Status | Notes |
| --- | --- | --- |
| npm run typecheck:tokens | PASS | Passed in checkpoint rerun. |
| npm run typecheck:ui | PASS | Passed in checkpoint rerun. |
| npm run typecheck:ai-assistant | PASS | Passed in checkpoint rerun. |
| npm run typecheck:content-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:content-qa-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:science-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:chemistry-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:chemistry-lab-engine | PASS | Passed in checkpoint rerun. |
| npm run typecheck:physics-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:physics-sim-engine | PASS | Passed in checkpoint rerun. |
| npm run typecheck:biology-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:microscope-viewer | PASS | Passed in checkpoint rerun. |
| npm run typecheck:progress-core | PASS | Passed in checkpoint rerun. |
| npm run typecheck:web | PASS | Passed in checkpoint rerun. |
| npm run typecheck:admin | PASS | Passed in checkpoint rerun. |
| npm run build:web | PASS | Passed in checkpoint rerun. |
| npm run build:admin | PASS | Passed in checkpoint rerun. |
| node tools/playwright-approved-ui-smoke.mjs | PASS | Skeleton ran without live targets and did not change production routes. |

Full command output is saved at `artifacts/checkpoints/milestone-1-validation-results.txt`.

## 7. Commit recommendation

Do not commit automatically. A manual commit can be prepared safely for Milestone 1 only if it stages only the foundation files and excludes pre-existing/unrelated dirty files.

Recommended include list:

- `package.json`
- `package-lock.json`
- `packages/ai-assistant/**`
- `packages/content-core/**`
- `packages/content-qa-core/**`
- `packages/science-core/**`
- `packages/chemistry-core/**`
- `packages/chemistry-lab-engine/**`
- `packages/physics-core/**`
- `packages/physics-sim-engine/**`
- `packages/biology-core/**`
- `packages/microscope-viewer/**`
- `packages/progress-core/**`
- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`
- `packages/ui/src/styles.css`
- `docs/architecture/ARCHITECTURE_AUDIT_APPROVED_UI.md`
- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/DATA_STORAGE_DECISION.md`
- `docs/architecture/BACKEND_SCHEMA_ROADMAP.md`
- `docs/architecture/MILESTONE_1_SAFETY_CHECKPOINT.md`
- `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md`
- `tools/playwright-approved-ui-smoke.mjs`
- optionally `artifacts/checkpoints/milestone-1-diff-stat.txt`, `artifacts/checkpoints/milestone-1-diff-name-only.txt`, `artifacts/checkpoints/milestone-1-untracked-files.txt`, `artifacts/checkpoints/milestone-1-tracked.diff`, `artifacts/checkpoints/milestone-1-validation-results.txt` if checkpoint artifacts should be versioned.

Do not include pre-existing or unrelated dirty files, including:

- `backend/app/web_admin/*`
- `backend/app/web_public/*`
- `backend/app/api/v1/*`
- `backend/app/services/*`
- `backend/data/*`
- `backend/tests/*`
- `mobile/*`
- `content_packs/*`
- unrelated `tools/playwright-admin-auth-roles-smoke.mjs`, `tools/playwright-authenticated-roles-smoke.mjs`, `tools/playwright-visual-smoke.mjs`
- unrelated docs such as `docs/qa/stage-ledger.md`
- existing visual artifacts outside `artifacts/checkpoints`.

Suggested commit message:

```text
Milestone 1 foundation: add shared UI, science and content cores
```

## 8. Risk before Milestone 2

- The dirty worktree contains many pre-existing tracked and untracked changes; without a checkpoint, Milestone 2 could accidentally mix unrelated backend/mobile/legacy changes into the UI slice.
- New foundation packages are untracked as part of broad `packages/`, so staging needs path-level precision.
- `git diff` does not include untracked files; relying only on diff would miss most Milestone 1 package/docs files.
- Visual QA remains a skeleton and should be expanded during Milestone 2 before any production route discussion.
- npm audit still reports 2 moderate vulnerabilities from package-lock state; remediation was not part of this checkpoint.

## 9. Next step

Next step after this checkpoint: Milestone 2 — `approved_web_student_dashboard` vertical slice, still non-production and without production route switch.