# Codex Handoff — Milestone 2 Visual QA

## Summary

Real visual QA was completed for `approved_web_student_dashboard` using a local `apps/web` server and Playwright screenshots.

The routes render and screenshot successfully:

- `/design-preview/student-dashboard`
- `/dashboard/student`

One real mobile layout bug was found and fixed. The implementation now passes smoke checks across desktop/tablet/mobile, but it is not visually close enough to the approved golden reference to be considered ready for the next approved UI milestone.

## Approved reference

Reference found:

- `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`

Related:

- `apps/web/public/design-preview/student-dashboard/approved-student-dashboard.png`
- `apps/web/public/design-preview/student-dashboard/zones/*.png`
- `docs/design/figma-approved-references.md`

## Screenshot artifact paths

- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-dashboard.png`

## Visual result

Smoke result:

```text
PASS
```

Manual visual parity result:

```text
NOT READY
```

Reason:

- The screen is functional and responsive after fixes.
- It has the correct general direction: deep-blue sidebar, light workspace, cyan/blue accents, cards, Russian text, and AI assistant.
- It still does not closely match the approved golden reference composition: missing approved topbar search/profile cluster, quick access strip, image-backed cards, denser zone layout, and floating assistant behavior.

Automated comparison:

```text
COMPARISON_SKIPPED
```

Reason: the existing `tools/check-visual-parity.mjs` is bound to an older scaffold screenshot path and writes `docs/design` reports. Running it as-is would not be a clean comparison of the new Milestone 2 slice.

## Fixes applied

Modified:

- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `tools/playwright-approved-ui-smoke.mjs`

Fixes:

- added `min-width: 0` / `max-width: 100vw` constraints for mobile shell/sidebar/main;
- changed mobile nav to a two-column grid to remove horizontal overflow;
- updated smoke script to check both student routes;
- added desktop/tablet/mobile screenshot capture;
- added route status, screenshot paths, viewport output, and PASS/FAIL reporting;
- fixed overbroad mojibake detection;
- added hidden wide-element overflow detection.

## Created files

- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_2_VISUAL_QA.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_2_VISUAL_QA.md`

## Modified files

- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `tools/playwright-approved-ui-smoke.mjs`

## Commands and results

| command | result |
| --- | --- |
| approved/reference asset search | PASS |
| `npm run typecheck:tokens` | PASS |
| `npm run typecheck:ui` | PASS |
| `npm run typecheck:ai-assistant` | PASS |
| `npm run typecheck:web` | PASS |
| `npm run build:web` | PASS |
| `setsid /root/synapse/node_modules/.bin/next start /root/synapse/apps/web -p 3010 ...` | PASS |
| `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` | PASS |
| `fuser -k 3010/tcp` | PASS |

Full final smoke result:

```text
Route status:
PASS 200 http://127.0.0.1:3010/design-preview/student-dashboard
PASS 200 http://127.0.0.1:3010/dashboard/student
Screenshot results:
PASS /design-preview/student-dashboard desktop 1440x1100 -> artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-preview.png
PASS /design-preview/student-dashboard tablet 1024x1200 -> artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-preview.png
PASS /design-preview/student-dashboard mobile 390x844 -> artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-preview.png
PASS /dashboard/student desktop 1440x1100 -> artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-dashboard.png
PASS /dashboard/student tablet 1024x1200 -> artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-dashboard.png
PASS /dashboard/student mobile 390x844 -> artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-dashboard.png
PASS approved_web_student_dashboard visual smoke.
```

Full errors:

No remaining errors.

Transient errors fixed:

```text
Potential mojibake detected in rendered Russian text.
```

This was a smoke-script false positive caused by an overbroad regex.

```text
Horizontal overflow detected: {"documentOverflow":false,"viewportWidth":390,"scrollWidth":390,"wideElements":[...]}
```

This was a real mobile nav overflow issue and was fixed in CSS.

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

## Blockers

- Dirty worktree remains large and pre-existing.
- `apps/`, `docs/architecture/`, `packages/`, and `tools/playwright-approved-ui-smoke.mjs` are under untracked top-level paths, so normal `git diff` does not isolate Milestone 2 files cleanly.
- Visual parity against the golden reference is not close enough.
- Automated pixel/zone comparison needs a safe new tool or update scoped to the new Milestone 2 slice.

## Next recommended step

Do not start the next approved UI screen yet.

Recommended next task:

```text
Milestone 2B — student dashboard visual convergence against golden-approved-web-student-dashboard.png, without production route switch.
```

Focus:

- approved topbar search/profile/actions;
- quick access strip;
- image-backed hero/live cards from existing clean assets;
- denser desktop zones;
- floating assistant behavior;
- mobile first-viewport lock.
