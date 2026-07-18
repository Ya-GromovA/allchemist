# ALC-005 Acceptance Report

Date: 2026-07-18
Scope: legacy admin JavaScript source repair only
Result: PASS for source and isolated acceptance; no deployment acceptance claimed

## Validation results

| Gate | Result | Evidence |
|---|---|---|
| JavaScript syntax | PASS | `node --check backend/app/web_admin/app.js` |
| Top-level duplicate scan | PASS | duplicate count `0` |
| Canonical renderer count | PASS | six functions, one declaration each, all after final-renderer marker |
| Static regression | PASS | `backend.tests.test_admin_web_javascript`, 4/4 |
| Isolated backend tests | PASS | 4/4 selected tests |
| Static admin smoke | PASS | admin index 200, app.js 200, six canonical renderers |
| Diff whitespace | PASS | `git diff --check` |
| Repository hygiene | PASS | zero violations |
| Secret scan | PASS | zero secret signatures or credential filenames |
| Runtime/generated artifacts | PASS | none added to Git status |

## Isolated backend tests

Executed tests:

- `tests.test_admin_web`
- `tests.test_admin_ui`
- `tests.test_admin_panel.AdminPanelTest.test_admin_dashboard_api_requires_system_admin_and_returns_real_state`
- `tests.test_admin_panel.AdminPanelTest.test_admin_web_stage8_markers`

All four passed. The first host-Python attempt did not execute tests because FastAPI was absent; this was classified as an environment failure, not a product failure. No dependency was installed.

The successful retry used the existing `infra-synapse-backend` image with:

- `--rm`;
- `--network none`;
- `--read-only`;
- worktree backend mounted at `/app:ro`;
- temporary `/tmp`;
- empty `DATABASE_URL`, `REDIS_URL`, and `CACHE_URL`;
- no production env file or production container attachment.

The container was removed and running container count returned to two.

## Smoke

A second disposable container used in-process FastAPI `TestClient` GET requests only. It proved:

- `/api/v1/admin/web` returns 200;
- `/api/v1/admin/web/assets/app.js` returns 200;
- `adminDashboardKpis` remains bound;
- the final-renderer marker remains present;
- all six renderer names occur exactly once.

## Not claimed

No production route, real credential, production database, production cache, or deployed admin workflow was exercised. G4 remains FAIL pending an approved release and rollback window.
