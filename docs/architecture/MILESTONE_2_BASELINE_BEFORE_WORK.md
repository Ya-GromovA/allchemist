# Milestone 2 Baseline Before Work

Date/time: 2026-07-08 11:09:47 +03:00

## pwd

```text
/root/synapse
```

## Foundation file check

| path | exists |
| --- | --- |
| `package.json` | yes
 |
| `package-lock.json` | yes
 |
| `packages/design-tokens` | yes
 |
| `packages/ui` | yes
 |
| `packages/ai-assistant` | yes
 |
| `packages/content-core` | yes
 |
| `packages/science-core` | yes
 |
| `docs/architecture/MILESTONE_1_SAFETY_CHECKPOINT.md` | yes
 |
| `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_1_FOUNDATION.md` | yes
 |
| `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md` | yes
 |
| `tools/playwright-approved-ui-smoke.mjs` | yes |

## git status --short

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

## Top-level project structure

```text
./AGENTS.md
./apps
./apps/admin
./apps/web
./artifacts
./artifacts/checkpoints
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

## package.json scripts

```json
{
  "typecheck:tokens": "tsc -p packages/design-tokens/tsconfig.json --pretty false",
  "typecheck:ui": "tsc -p packages/ui/tsconfig.json --pretty false",
  "typecheck:web": "tsc -p apps/web/tsconfig.json --pretty false",
  "typecheck:admin": "tsc -p apps/admin/tsconfig.json --pretty false",
  "build:web": "next build apps/web",
  "build:admin": "next build apps/admin",
  "typecheck:ai-assistant": "tsc -p packages/ai-assistant/tsconfig.json --pretty false",
  "typecheck:content-core": "tsc -p packages/content-core/tsconfig.json --pretty false",
  "typecheck:content-qa-core": "tsc -p packages/content-qa-core/tsconfig.json --pretty false",
  "typecheck:science-core": "tsc -p packages/science-core/tsconfig.json --pretty false",
  "typecheck:chemistry-core": "tsc -p packages/chemistry-core/tsconfig.json --pretty false",
  "typecheck:chemistry-lab-engine": "tsc -p packages/chemistry-lab-engine/tsconfig.json --pretty false",
  "typecheck:physics-core": "tsc -p packages/physics-core/tsconfig.json --pretty false",
  "typecheck:physics-sim-engine": "tsc -p packages/physics-sim-engine/tsconfig.json --pretty false",
  "typecheck:biology-core": "tsc -p packages/biology-core/tsconfig.json --pretty false",
  "typecheck:microscope-viewer": "tsc -p packages/microscope-viewer/tsconfig.json --pretty false",
  "typecheck:progress-core": "tsc -p packages/progress-core/tsconfig.json --pretty false"
}
```

## Conclusion

Foundation file check passed. It is safe to start Milestone 2 with scoped non-production changes.