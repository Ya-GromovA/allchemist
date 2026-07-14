# UI-PROD-1 Baseline Before Work

## Date/Time

2026-07-09T15:39:17+03:00

## Scope

Milestone UI-PROD-1: Production-grade Approved Student Shell + exact visual parity repair for `/design-preview/student-dashboard`.

No production route switch. No commit. No `git add`, `git reset`, or `git clean`.

## Verified Inputs

| Path | Exists | Notes |
| --- | --- | --- |
| `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png` | yes | Approved reference, PNG `1672 x 941` |
| `apps/web/components/approved/ApprovedStudentDashboard.tsx` | yes | Current dashboard component |
| `apps/web/components/approved/ApprovedStudentDashboard.module.css` | yes | Current CSS module |
| `apps/web/lib/demo/approved-student-dashboard.ts` | yes | Static typed demo source |
| `apps/web/lib/adapters/student-dashboard.ts` | yes | Adapter/types |
| `tools/playwright-approved-ui-smoke.mjs` | yes | Visual/UX smoke script |

## Approved Reference Path

`apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`

## Current Screenshot Paths

Existing pre-UI-PROD-1 screenshots:

- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-preview-top.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-preview-scrolled.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-visualization-open.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-reference-open.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/mobile-preview.png`

## Current Git Status

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

## Factual Problems Before UI-PROD-1

- Sidebar fixed behavior is still reported as not accepted by the user; it must be re-verified against actual page/window scrolling and main scrolling.
- The sidebar shell is close to production behavior but still implemented inside the approved dashboard rather than extracted into a shared shell.
- Current visual parity is materially below the approved reference:
  - overall density differs;
  - sidebar width, item rhythm, glow, and lower license area are not exact enough;
  - background tone is softer/less reference-like;
  - topbar/search/profile cluster differs from the reference;
  - hero and grid card proportions differ;
  - AI assistant placement and proportion differ.
- Some dashboard cards have typed demo data, but the future real-domain data mapping is not fully documented yet.
- Existing smoke screenshots are under `milestone-2-3`; UI-PROD-1 requires a new `ui-prod-1` artifact set.
- The local `127.0.0.1:3010` tunnel has repeatedly become unavailable even while the remote preview server remains healthy.

## UX Issues To Verify During UI-PROD-1

- Sidebar must not move when main content scrolls.
- Body/window scroll must not carry the sidebar away on desktop.
- `Визуализация` and `Справочники` must open/close and expose submenus.
- No horizontal overflow on desktop/tablet/mobile.
- Floating assistant, quick access, active `Главная`, and first viewport density must be visible and stable.

## Baseline Verdict

Ready to start UI-PROD-1 implementation with constraints. Current dashboard is not accepted as final approved shell.
