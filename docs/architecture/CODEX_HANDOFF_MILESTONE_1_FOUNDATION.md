# Codex Handoff — Milestone 1 Foundation

## 1. Executive summary

Milestone 1 created a non-production foundation for future approved UI implementation, science engines, content contracts, AI assistant state, progress contracts and QA planning. It did not switch production routes, did not edit `backend/app/web_admin/*`, did not edit `backend/app/web_public/*`, did not change `infra/docker-compose.yml`, did not add heavy Rive/Lottie/Three dependencies, and did not commit.

What is next: build the first non-production approved UI vertical slice around `approved_web_student_dashboard`, wire it to reusable primitives and typed demo/adapted data, then harden screenshot comparison before any production route switch.

## 2. Top-level project structure

Command: `pwd`

```text
/root/synapse
```

Command:

```bash
find . -maxdepth 2 -mindepth 1 \
  -not -path "./.git*" \
  -not -path "./node_modules*" \
  -not -path "./*/node_modules*" \
  -not -path "./.next*" \
  -not -path "./*/.next*" \
  -not -path "./dist*" \
  -not -path "./*/dist*" \
  -not -path "./build*" \
  -not -path "./*/build*" \
  -not -path "./__pycache__*" \
  -not -path "./*/__pycache__*" \
  -not -path "./.venv*" \
  -not -path "./venv*" \
  | sort \
  | head -400
```

```text
./AGENTS.md
./apps
./apps/admin
./apps/web
./artifacts
./artifacts/figma-student-dashboard-layer-generator-fixed.zip
./artifacts/figma-student-dashboard-layer-generator.zip
./artifacts/ui-snapshots
./assistant_log.md
./assistant_log.md.bak_before_opencode_append_20260425192203
./backend
./backend/.dockerignore
./backend/.env
./backend/.pytest_cache
./backend/.venv-test
./backend/Dockerfile
./backend/app
./backend/data
./backend/data_host_backup
./backend/requirements-test.txt
./backend/requirements.txt
./backend/run_once.py
./backend/sql
./backend/tests
./backend/wheels
./backups
./backups/stage15-secret-rotation-20260527-174404
./backups/user_state_before_admin_demo_20260630234112.json
./backups/web_admin_20260630213423
./content_packs
./content_packs/allchemist-apk-latest.json
./content_packs/allchemist-apk-latest.json.bak-20260518-082441
./content_packs/allchemist-apk-latest.json.bak-20260524-163214
./content_packs/allchemist-release-20260504-1529-new-server.apk
./content_packs/allchemist-release-20260505-2152-web-hero-chemistry.apk
./content_packs/allchemist-release-20260505-2211-hero-web-chemistry-v2.apk
./content_packs/allchemist-release-20260506-0322-mobile-home-splash-v1.apk
./content_packs/allchemist-release-20260506-0335-mobile-iter2.apk
./content_packs/allchemist-release-20260506-0340-mobile-home-splash-v2.apk
./content_packs/allchemist-release-20260515-0915-restored-working-new-server.apk
./content_packs/allchemist-release-20260516-1342-emulator-verified.apk
./content_packs/allchemist-release-20260516-1615-signed-splash-emulator-verified.apk
./content_packs/allchemist-release-20260517-0035-v1.0.1-update-checker-emulator-verified.apk
./content_packs/allchemist-release-20260518-0326-v1.0.2-fullscreen-splash-role-check-emulator-verified.apk
./content_packs/allchemist-release-20260520-0310-v1.0.2-role-dashboards-emulator-verified.apk
./content_packs/allchemist-release-20260524-1630-v1.0.3-homeroom-profile-auth-smoke-verified.apk
./content_packs/allchemist-release-20260524-2208-v1.0.4-server-driven-auth-smoke-verified.apk
./content_packs/allchemist-release-20260524-2235-v1.0.5-login-scenarios-server-role-smoke-verified.apk
./content_packs/allchemist-release-20260524-2318-v1.0.6-invite-preview-role-switch-smoke-verified.apk
./content_packs/allchemist-release-20260525-1.0.7-mobile-layout-smoke-verified.apk
./content_packs/allchemist-release-20260525-1.0.8-splash-smoke-verified.apk
./content_packs/allchemist-release-20260525-1.0.9-stage7-learning-smoke-verified.apk
./content_packs/allchemist-release-20260527-1.0.10-periodic-table-smoke-verified.apk
./content_packs/allchemist-release-20260527-1.0.11-periodic-mass-smoke-verified.apk
./content_packs/allchemist-release-20260529-1.0.12-physics-content-v2-smoke-verified.apk
./content_packs/allchemist-release-20260601-1.0.13-stage3-auth-routes-smoke-verified.apk
./content_packs/allchemist-release-20260601-1.0.14-content-titles-smoke-verified.apk
./content_packs/allchemist-release-20260601-1.0.15-stage2-assets-complete-smoke-verified.apk
./content_packs/synapse-arm64-release-20260228-scrollfix.apk
./content_packs/synapse-arm64-release-20260301-phase2.apk
./desktop
./desktop/tauri-shell
./docs
./docs/architecture
./docs/codex
./docs/contracts
./docs/design
./docs/infra
./docs/migration
./docs/ops
./docs/product
./docs/production-readiness-gate-ru.md
./docs/qa
./docs/quality
./infra
./infra/.env
./infra/.env.bak_20260219230743
./infra/.env.bak_before_opencode_aihealth_20260425182329
./infra/docker-compose.yml
./infra/docker-compose.yml.bak_20260214232609
./infra/docker-compose.yml.bak_20260215112811
./infra/init_synapse_pg.sql
./infra/init_synapse_pg_full.sql
./infra/init_synapse_pg_full_v2.sql
./mobile
./mobile/App.tsx
./mobile/android
./mobile/app
./mobile/app.json
./mobile/assets
./mobile/babel.config.js
./mobile/eas.json
./mobile/index.ts
./mobile/package-lock.json
./mobile/package.json
./mobile/scripts
./mobile/src
./mobile/tsconfig.json
./package-lock.json
./package.json
./packages
./packages/ai-assistant
./packages/api-client
./packages/biology-core
./packages/chemistry-core
./packages/chemistry-lab-engine
./packages/content-core
./packages/content-qa-core
./packages/design-tokens
./packages/microscope-viewer
./packages/physics-core
./packages/physics-sim-engine
./packages/progress-core
./packages/science-core
./packages/types
./packages/ui
./secrets
./secrets/android
./synapse-migration-20260503.dump
./synapse-project.tar.gz
./synapse.db
./synapse_schema.sql
./tools
./tools/admin-manual-assets
./tools/admin-manual-assets-v2
./tools/admin-manual-ru-v2.docx
./tools/admin-manual-ru-v2.md
./tools/admin-manual-ru-v2.txt
./tools/admin-manual-ru-v3.docx
./tools/admin-manual-ru-v3.md
./tools/admin-manual-ru-v3.txt
./tools/admin-manual-ru.docx
./tools/admin-manual-ru.md
./tools/admin-manual-ru.txt
./tools/admin-one-page-ru-v3.html
./tools/admin-one-page-ru.html
./tools/ai-personalization-architecture-ru.md
./tools/android-release-checklist-ru.md
./tools/android-release-key-ownership-ru.md
./tools/apk-emulator-smoke.sh
./tools/assistant-continuity-rules-ru.md
./tools/backup_synapse.sh
./tools/biology-content-backlog-ru.md
./tools/capture-ui-snapshots.mjs
./tools/cdn_object_storage_readiness.py
./tools/check-layout-contract.mjs
./tools/check-student-dashboard-assets.mjs
./tools/check-student-dashboard-production-readiness.mjs
./tools/check-student-dashboard-quality.mjs
./tools/check-student-dashboard-zone-parity.mjs
./tools/check-visual-parity.mjs
./tools/chemistry-content-backlog-ru.md
./tools/chemistry-iterations-1-3-ru.md
./tools/chemistry-redesign-spec-ru.md
./tools/chemistry-redesign-tasks-ru.md
./tools/chemistry-task-bank-ru.md
./tools/chemistry_layers_a_b.md
./tools/content-architecture-allchemist-ru.md
./tools/content_quality_guard.py
./tools/create_admin_manual.py
./tools/create_admin_manual_v2.py
./tools/create_admin_manual_v3.py
./tools/delivery-plan-monetization-ru.md
./tools/desktop-production-ru.md
./tools/extract-student-dashboard-zones.mjs
./tools/figma-student-dashboard-layer-generator
./tools/generate_pubchem_molecules_pack.py
./tools/github_provider_setup.py
./tools/hardening-slo-alerts-backup-ru.md
./tools/launch-execution-board-ru.md
./tools/mobile-apk-manual-steps-ru.md
./tools/mobile-release-device-checklist-ru.md
./tools/mvp-backlog-ru.md
./tools/package-lock.json
./tools/package.json
./tools/physics-content-backlog-ru.md
./tools/platform-master-plan-ru.md
./tools/playwright-admin-auth-roles-smoke.mjs
./tools/playwright-approved-ui-smoke.mjs
./tools/playwright-authenticated-roles-smoke.mjs
./tools/playwright-visual-smoke.mjs
./tools/production_monitor_probe.py
./tools/profile-server.mjs
./tools/revoke_sessions.py
./tools/rustore-release-pipeline-ru.md
./tools/school_access_device_pg_schema.sql
./tools/snapshots
./tools/stage11-production-preflight.sh
./tools/stage13-periodic-table-smoke.mjs
./tools/stage15-production-hardening-check.sh
./tools/ui-foundation-smoke.mjs
./tools/user-scenarios-all-roles-ru.md
./tools/user-scenarios-roles-ru.md
./tools/verify-contract-layer.mjs
./tools/verify-ui-foundation.mjs
```

Command:

```bash
tree -L 2 -a -I ".git|node_modules|.next|dist|build|__pycache__|.venv|venv"
```

```text
tree is not installed
```

## 3. Created files

### Created by this milestone

```text
packages/ai-assistant/package.json
packages/ai-assistant/tsconfig.json
packages/ai-assistant/src/context.ts
packages/ai-assistant/src/events.ts
packages/ai-assistant/src/index.ts
packages/ai-assistant/src/reducer.ts
packages/ai-assistant/src/state.ts
packages/ai-assistant/src/types.ts
packages/content-core/package.json
packages/content-core/tsconfig.json
packages/content-core/src/content-block.ts
packages/content-core/src/curriculum.ts
packages/content-core/src/index.ts
packages/content-core/src/publication.ts
packages/content-core/src/source.ts
packages/content-core/src/types.ts
packages/content-core/src/validation.ts
packages/content-qa-core/package.json
packages/content-qa-core/tsconfig.json
packages/content-qa-core/src/checks.ts
packages/content-qa-core/src/events.ts
packages/content-qa-core/src/index.ts
packages/content-qa-core/src/types.ts
packages/content-qa-core/src/workflow.ts
packages/science-core/package.json
packages/science-core/tsconfig.json
packages/science-core/src/index.ts
packages/science-core/src/safety.ts
packages/science-core/src/types.ts
packages/science-core/src/units.ts
packages/science-core/src/verification.ts
packages/science-core/src/visualization.ts
packages/chemistry-core/package.json
packages/chemistry-core/tsconfig.json
packages/chemistry-core/src/demo.ts
packages/chemistry-core/src/index.ts
packages/chemistry-core/src/reactions.ts
packages/chemistry-core/src/substances.ts
packages/chemistry-core/src/types.ts
packages/chemistry-lab-engine/package.json
packages/chemistry-lab-engine/tsconfig.json
packages/chemistry-lab-engine/src/index.ts
packages/chemistry-lab-engine/src/reducer.ts
packages/chemistry-lab-engine/src/scenario.ts
packages/chemistry-lab-engine/src/types.ts
packages/physics-core/package.json
packages/physics-core/tsconfig.json
packages/physics-core/src/demo.ts
packages/physics-core/src/index.ts
packages/physics-core/src/types.ts
packages/physics-sim-engine/package.json
packages/physics-sim-engine/tsconfig.json
packages/physics-sim-engine/src/calculate.ts
packages/physics-sim-engine/src/index.ts
packages/physics-sim-engine/src/scenario.ts
packages/physics-sim-engine/src/types.ts
packages/biology-core/package.json
packages/biology-core/tsconfig.json
packages/biology-core/src/demo.ts
packages/biology-core/src/index.ts
packages/biology-core/src/types.ts
packages/microscope-viewer/package.json
packages/microscope-viewer/tsconfig.json
packages/microscope-viewer/src/index.ts
packages/microscope-viewer/src/state.ts
packages/microscope-viewer/src/types.ts
packages/progress-core/package.json
packages/progress-core/tsconfig.json
packages/progress-core/src/aggregate.ts
packages/progress-core/src/index.ts
packages/progress-core/src/types.ts
docs/architecture/DATA_STORAGE_DECISION.md
docs/architecture/BACKEND_SCHEMA_ROADMAP.md
docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md
docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md
tools/playwright-approved-ui-smoke.mjs
docs/architecture/CODEX_HANDOFF_MILESTONE_1_FOUNDATION.md
```

### Already existed before and were edited

```text
package.json
package-lock.json
packages/design-tokens/src/index.ts
packages/ui/src/index.tsx
packages/ui/src/styles.css
```

### Untracked files that existed before milestone

Cannot reliably distinguish pre-existing untracked files from newly created files without a complete baseline. From the pre-milestone audit, broad untracked directories/files already included `apps/`, `packages/`, `docs/architecture/`, `docs/design/`, `docs/contracts/`, `docs/quality/`, `package.json`, `package-lock.json`, multiple `tools/*` files, and visual artifacts. The list above reflects files explicitly created or edited during Milestone 1 by Codex.

## 4. Modified files

Modified by Milestone 1:

```text
package.json
package-lock.json
packages/design-tokens/src/index.ts
packages/ui/src/index.tsx
packages/ui/src/styles.css
```

Note: `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md` was created and then updated with final check results.

## 5. Deleted/renamed files

No deleted or renamed files.

## 6. Package/dependency changes

- `package.json`: changed through `npm pkg set`.
- `package-lock.json`: changed through `npm install --package-lock-only --ignore-scripts`.
- Workspaces added: `apps/*`, `packages/*`.
- Scripts added: `typecheck:ai-assistant`, `typecheck:content-core`, `typecheck:content-qa-core`, `typecheck:science-core`, `typecheck:chemistry-core`, `typecheck:chemistry-lab-engine`, `typecheck:physics-core`, `typecheck:physics-sim-engine`, `typecheck:biology-core`, `typecheck:microscope-viewer`, `typecheck:progress-core`.
- Existing scripts verified: `typecheck:web`, `typecheck:admin`, `typecheck:ui`, `typecheck:tokens`, `build:web`, `build:admin`.
- No new external dependencies were added.
- `npm install --package-lock-only --ignore-scripts` reported 2 moderate npm audit vulnerabilities. No `npm audit fix --force` was run.

## 7. Commands executed

```text
ssh -o BatchMode=yes root@100.67.164.12 "cd /root/synapse && pwd && ls -la && docker compose -f infra/docker-compose.yml ps"
ssh -o BatchMode=yes root@100.67.164.12 "cd /root/synapse && find ..."
ssh -o BatchMode=yes root@100.67.164.12 "cd /root/synapse && sed -n ... package and source files"
scp work/milestone1/... root@100.67.164.12:/root/synapse/...
npm pkg set 'workspaces[0]=apps/*' 'workspaces[1]=packages/*' ...
npm install --package-lock-only --ignore-scripts
npm run typecheck:tokens
npm run typecheck:ui
npm run typecheck:ai-assistant
npm run typecheck:content-core
npm run typecheck:content-qa-core
npm run typecheck:science-core
npm run typecheck:chemistry-core
npm run typecheck:chemistry-lab-engine
npm run typecheck:physics-core
npm run typecheck:physics-sim-engine
npm run typecheck:biology-core
npm run typecheck:microscope-viewer
npm run typecheck:progress-core
npm run typecheck:web
npm run typecheck:admin
npm run build:web
npm run build:admin
node tools/playwright-approved-ui-smoke.mjs
git status --short
git diff --stat
git diff --name-only
pwd
find . -maxdepth 2 -mindepth 1 ... | sort | head -400
if command -v tree >/dev/null 2>&1; then tree -L 2 -a -I ...; else echo 'tree is not installed'; fi
```

Implementation also used local file staging plus `scp` to transfer generated package/docs files to `/root/synapse`. Failed intermediate shell quoting attempts were corrected and rerun; final verification commands passed.

## 8. Check results

| Command | Status | Notes |
| --- | --- | --- |
| npm run typecheck:tokens | PASS | Final run passed. |
| npm run typecheck:ui | PASS | Final run passed. |
| npm run typecheck:ai-assistant | PASS | Initial strict optional typing issue was fixed; final run passed. |
| npm run typecheck:content-core | PASS | Final run passed. |
| npm run typecheck:content-qa-core | PASS | Initial audit payload/actor typing issue was fixed; final run passed. |
| npm run typecheck:science-core | PASS | Final run passed. |
| npm run typecheck:chemistry-core | PASS | Final run passed. |
| npm run typecheck:chemistry-lab-engine | PASS | Final run passed. |
| npm run typecheck:physics-core | PASS | Final run passed. |
| npm run typecheck:physics-sim-engine | PASS | Final run passed. |
| npm run typecheck:biology-core | PASS | Final run passed. |
| npm run typecheck:microscope-viewer | PASS | Final run passed. |
| npm run typecheck:progress-core | PASS | Final run passed. |
| npm run typecheck:web | PASS | Final run passed. |
| npm run typecheck:admin | PASS | Final run passed. |
| npm run build:web | PASS | Final run passed. |
| npm run build:admin | PASS | Final run passed. |
| node tools/playwright-approved-ui-smoke.mjs | PASS | Skeleton ran without live targets and did not touch production routes. |
| tree -L 2 ... | SKIPPED | tree is not installed; not installed per instruction. |

No final FAIL remains. The final required checks passed. `tree` was skipped because it is not installed and was not installed per instruction.

## 9. Git status

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

## 10. Git diff summary

Command: `git diff --stat`

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

Command: `git diff --name-only`

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

Note: `git diff` does not include untracked files such as the new foundation packages/docs while they remain untracked.

## 11. Reports created

- `docs/architecture/ARCHITECTURE_AUDIT_APPROVED_UI.md`
- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_1_FOUNDATION.md`
- `docs/architecture/DATA_STORAGE_DECISION.md`
- `docs/architecture/BACKEND_SCHEMA_ROADMAP.md`
- `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md`

## 12. Risks and blockers

- The worktree is heavily dirty from pre-existing tracked and untracked changes; future tasks should avoid cleanup and touch only scoped files.
- New packages are foundation contracts only; they are not wired into production UI/backend behavior yet.
- Next apps are still non-production surfaces and do not have production auth/protected route switching.
- Backend schema is still roadmap-only; no Alembic migrations were created in this milestone.
- Visual QA is currently a skeleton and must be expanded into real screenshot capture/comparison before route switch.
- `tree` is not installed on the server.
- npm audit reports 2 moderate vulnerabilities; dependency remediation was intentionally not performed in this milestone.

## 13. Recommended next task

Build the first non-production approved UI vertical slice for `approved_web_student_dashboard`: use the expanded tokens/UI primitives, keep production routes unchanged, wire typed demo/adapted data, include the AI assistant visual wrapper/state, then add live Playwright screenshot capture and visual comparison artifacts for desktop/mobile.