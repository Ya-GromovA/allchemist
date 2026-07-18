# ALC-005 Legacy Admin Repair Report

Date: 2026-07-18
Branch: `fix/alc-005-legacy-admin-javascript-20260718-124731`
Base: `32aef1ecc8f49cc21436954cbd479205450fa1bc`
Deployment: none

## Proven root cause

`backend/app/web_admin/app.js` contained six old renderer implementations and six later replacements in the block labelled `Final visual renderers for the reference-style admin dashboard.` Because the repository declares `type: module`, duplicate top-level declarations fail ESM syntax validation.

The duplicate set was:

- `renderAdminKpis`
- `renderAdminPlatformActivity`
- `renderAdminSubjects`
- `renderAdminSchoolsMap`
- `renderAdminEvents`
- `renderAdminQaSummaryHome`

An iterative `.mjs` diagnostic proved that removing only the first old function exposes the next duplicate. Syntax passes only after all six obsolete implementations are absent.

## Canonical implementation decision

The retained functions are the later implementations beneath the explicit final-renderer marker. Evidence:

- they preserve the existing DOM ids, including `adminDashboardKpis`;
- they preserve `data-jump-view` navigation;
- they use current CSS bindings such as `kpiIcon`, `kpiLabel`, trend classes, subject stacks, map points, and event icons;
- they consume the existing dashboard summary and related API payload fields;
- the surrounding comment explicitly describes them as final visual renderers preserving API contracts and DOM ids.

The earlier functions were not renamed because no caller selected them independently. They were obsolete same-name implementations shadowed by the final visual replacement block.

## Minimal repair

Only the six earlier function bodies were removed from `backend/app/web_admin/app.js`. No canonical renderer, caller, route, API contract, CSS, HTML, visual asset, auth behavior, or target application was changed.

A pure static regression test was added at `backend/tests/test_admin_web_javascript.py`. It checks:

- `node --check`;
- exactly one declaration for each renderer;
- canonical marker and KPI bindings;
- expected dashboard payload fields;
- the existing HTML/script binding.

## API and HTML evidence

`loadAdminDashboard()` still calls `renderAdminKpis(summary.body || {})`. The summary endpoint still supplies schools, users, licenses, materials, QA, errors, live lessons, and payment fields. `index.html` still owns `id="adminDashboardKpis"` and loads the same `app.js` URL.

## Safety boundary

Production checkout, nginx, systemd, preview 3011, legacy 3010, backend runtime, PostgreSQL, credentials, migrations, and design references were not changed. No deploy or route switch occurred.

## Remaining boundary

This branch proves source repair and isolated behavior only. G4 still requires approved integration, production admin workflow validation, owner acceptance, and rollback evidence before deployment.
