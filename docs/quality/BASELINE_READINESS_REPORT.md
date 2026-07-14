# ALC-000 — Baseline Readiness Report

Date: 2026-07-14 (Europe/Moscow)

Verdict: **not ready for implementation or route migration**. Architecture planning is blocked until preview recovery and repository baseline stabilization.

## Build and test inventory

| Category | Existing command / evidence | Audit result |
|---|---|---|
| Contract typecheck/tests | `node tools/verify-contract-layer.mjs` | PASS; types/api-client typechecks, 3 Vitest files and 32 tests passed, contract diff check passed |
| UI foundation gate | `node tools/verify-ui-foundation.mjs` | UNSAFE / TIMEOUT; completed contract checks and tokens/UI/web/admin typechecks, then invoked `next build apps/web` |
| Approved references | `node tools/check-approved-references.mjs` | FAIL as expected: 1/8 present, 7 missing; three missing critical |
| Legacy public JS syntax | `node --check backend/app/web_public/app.js` | PASS |
| Legacy admin JS syntax | `node --check backend/app/web_admin/app.js` | FAIL: duplicate `renderAdminKpis` declaration at line 2805 |
| Root typechecks | root scripts for tokens, UI, web, admin, AI/content/science subject packages | inventory confirmed; broad direct batch exceeded timeout and is not claimed as a result |
| Backend unit/integration | pytest files under `backend/tests`; CI focused command | NOT RUN on production; tests may write cache/application state and require isolated DB/env |
| API client tests | `npm test` in `packages/api-client` via contract gate | PASS, selected 32 tests |
| Lint | no lint script/config found in inspected manifests | NOT AVAILABLE |
| Build web/admin | root `build:web`, `build:admin` | NOT approved for production audit; existing UI gate unexpectedly started web build and was stopped |
| Playwright/e2e | four `tools/playwright-*.mjs`; Playwright 1.60.0 | NOT RUN; scripts may authenticate, mutate state and write screenshots |
| Smoke | multiple tools/mobile scripts | NOT RUN unless proven side-effect-free; current classification is insufficient |
| Storybook | none found | ABSENT / UNKNOWN |

The backend pytest cache contained 41 nodeids and an empty `lastfailed` map, timestamped 2026-06-30. This is historical cache evidence only, not a current test pass.

## CI/CD inventory

`.github/workflows/ci.yml` contains:

- backend dependency installation and focused pytest for auth sync, public web and content snapshot;
- `node --check` for legacy public/admin JavaScript;
- Python/shell tool syntax checks;
- mobile `npm ci` and `npx tsc --noEmit`.

`.github/workflows/production-release-gate.yml` repeats focused backend/static gates. No root Next web/admin build, root workspace typecheck, approved-reference check or Playwright visual gate was found in these workflow commands.

## Approved references

Canonical manifest: `docs/design/approved-references.manifest.json`. Canonical storage convention: `apps/web/public/design-preview/<reference-id>/golden-*.png`.

| Expected screen | Manifest status | Actual evidence |
|---|---|---|
| Student dashboard | PRESENT | `golden-approved-web-student-dashboard.png`, 1672x941, SHA-256 `32f4b7788bcd36ddc1a40bad9a32b59053987d0a81cba30916c6ca0d1e86a9d0` |
| Chemistry lab | MISSING | implementation screenshots exist under `artifacts/ui-snapshots/ui-science-1`, but no canonical golden at expected path |
| Physics simulation | MISSING | no canonical golden |
| Biology microscope | MISSING | no canonical golden |
| AI assistant | MISSING | student-dashboard zone crop/asset exists, but no canonical assistant golden |
| Admin dashboard | MISSING | no canonical golden |
| Content QA | MISSING | no canonical golden |
| Landing | MISSING | no canonical golden |

Only the manifest-declared golden is approved. Generated implementation screenshots and legacy images are not substitutes.

## Design and visual tooling

- Design preview routes: internal Next `/design-preview/student-dashboard` and `/design-preview/platform-structure`.
- Screenshot tooling: `tools/capture-ui-snapshots.mjs` and Playwright smoke scripts.
- Comparison tooling: `check-visual-parity.mjs`, student-dashboard quality/layout/zone tools.
- Many comparison/capture tools contain write, screenshot, mkdir or process-spawn operations and are not read-only audit commands.
- `check-approved-references.mjs` itself is read-only and accurately reported 1/8.

## Runtime readiness

- Legacy public/admin and FastAPI health remained HTTP 200 throughout the audit.
- Backend and Postgres containers remained healthy; no restart occurred.
- Internal Next preview continued HTTP 200 from the existing process, but its cwd is `(deleted)` and the current build tree lacks `BUILD_ID` after the aborted existing gate. Restart readiness is **NO**.
- New admin has no active runtime.

## Quality risks

1. Production checkout is dirty and target architecture is mostly untracked.
2. Existing `verify-ui-foundation.mjs` is named like a verification command but performs builds; it is unsafe for read-only audits.
3. Preview artifact loss is not visible as a simple tracked Git modification because `apps/` is untracked.
4. Legacy admin JavaScript does not parse.
5. Critical approved goldens for chemistry, physics and biology are missing.
6. Backend test execution was not isolated from production state.
7. No error-tracking integration was found.
8. Backup presence is not restore proof.
9. No migration revision chain was found.

## Confirmed reusable quality assets

- Contract-layer typechecks and selected Vitest suite.
- Backend pytest tests as an isolated-environment suite.
- Legacy static `node --check` commands.
- Approved-reference manifest checker.
- Existing visual tooling after side-effect classification and output isolation.

## Blockers

- Restore restartable preview artifact with explicit authorization.
- Establish an attributable Git baseline and file ownership.
- Fix or consciously baseline legacy admin syntax failure in a separate approved task.
- Supply missing critical approved references before science UI claims.
- Move builds/tests that write state to isolated CI/worktrees.

## Recommended next task

`ALC-001 — PREVIEW ARTIFACT RECOVERY AND REPOSITORY BASELINE STABILIZATION`.

Required output: restart-safety proof, owner-approved file manifest, isolated worktree, and read-only/write-capable command classification. Do not implement screens, migrate routes or touch the database in that task unless separately authorized.

Ready for architecture planning: **NO**.

---

# ALC-001 Readiness Update

Date: 2026-07-14 (Europe/Moscow)

ALC-001 resolved the repository-baseline and restart-artifact blockers without changing production:

- protected backup `/root/backups/allchemist/ALC-001/20260714-112717` verified 60/60 checksum entries;
- local baseline branch `baseline/allchemist-recovery-20260714-112717`;
- clean local commit `c18b3d89c38e28b47f46816326981720fb30e253`;
- dependency install and build performed only in the isolated worktree;
- restart-safe artifact `/root/allchemist-runtime/preview/releases/20260714-112717`, BUILD_ID `foMZhxf6qk1kQrn7k-Y4I`;
- artifact checksum 1399/1399;
- cold-start smoke on 3011 passed 9/9 routes and 12/12 referenced static assets;
- temporary 3011 process stopped;
- production preview PID `1603626`, nginx, backend, PostgreSQL, routing, and DNS unchanged;
- no push, migration, production test, service restart, reset, clean, or production build.

Residual risks remain: the active 3010 process still has a deleted cwd; the recovered artifact is not switched into service; the baseline is local only; seven approved golden references are missing; and the legacy admin JavaScript parse failure remains.

Recommended next task: `ALC-002 — TARGET ARCHITECTURE PLAN AND MIGRATION GATES`.

Ready for architecture planning: **YES**.
Ready for preview service switch: **NO**.
