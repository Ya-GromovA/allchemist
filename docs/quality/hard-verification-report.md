# Allchemist Hard Verification Report

Date: 2026-07-02
Main workspace: `/root/synapse`
Temporary clean workspace used during verification: `/tmp/allchemist-hard-verify-20260702231848`
Temporary workspace cleanup: removed after verification to reclaim about 4.4G of disk space.

## Scope

This verification covered only the current foundation and verification infrastructure:

- `packages/types`
- `packages/api-client`
- `packages/design-tokens`
- `packages/ui`
- `apps/web`
- `apps/admin`
- `tools/verify-contract-layer.mjs`
- `tools/verify-ui-foundation.mjs`
- `tools/ui-foundation-smoke.mjs`
- existing Playwright dependency setup under `tools`

No backend behavior, FastAPI routes, legacy `backend/app/web_admin`, legacy `backend/app/web_public`, production routing, or mobile behavior were intentionally changed.

## Main Workspace Commands

Run from `/root/synapse`:

```bash
node tools/verify-contract-layer.mjs
node tools/verify-ui-foundation.mjs
./mobile/node_modules/.bin/tsc -p packages/types/tsconfig.json --pretty false
./mobile/node_modules/.bin/tsc -p packages/api-client/tsconfig.json --pretty false
npm run typecheck:ui
npm run typecheck:tokens
npm run typecheck:web
npm run typecheck:admin
npm run build:web
npm run build:admin
node tools/ui-foundation-smoke.mjs
```

## Main Workspace Results

- `node tools/verify-contract-layer.mjs`: passed.
- `packages/types` typecheck: passed.
- `packages/api-client` typecheck: passed.
- `packages/api-client` Vitest runtime tests: passed, 3 files / 32 tests.
- `node tools/verify-ui-foundation.mjs`: passed.
- `packages/design-tokens` typecheck: passed.
- `packages/ui` typecheck: passed.
- `apps/web` typecheck: passed.
- `apps/admin` typecheck: passed.
- `apps/web` production build: passed.
- `apps/admin` production build: passed.
- Playwright UI smoke: passed.
- `git diff --check` inside the UI verification command: passed.

Generated route coverage from `next build`:

- `apps/web`: `/`, `/_not-found`, `/dashboard/student`, `/modules`, `/modules/biology`, `/modules/chemistry`, `/modules/physics`.
- `apps/admin`: `/`, `/_not-found`, `/analytics`, `/audit`, `/biology-microscope-packs`, `/content`, `/content-qa`, `/dashboard`, `/licenses-payments`, `/media-assets`, `/physics-simulations`, `/reaction-packs`, `/roles-access`, `/schools`, `/users`.

## Clean Workspace Procedure

The clean workspace was created by copying the current project state while excluding generated artifacts:

```bash
SRC=/root/synapse
TMP=/tmp/allchemist-hard-verify-20260702231848
mkdir -p "$TMP"
rsync -a "$SRC/" "$TMP/" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.tsbuildinfo' \
  --exclude='__pycache__' \
  --exclude='.pytest_cache' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='dist' \
  --exclude='build'
```

Dependencies were installed cleanly in the dependency roots needed by the current verification commands:

```bash
cd /tmp/allchemist-hard-verify-20260702231848
npm ci
(cd packages/api-client && npm ci)
(cd tools && npm ci)
(cd mobile && npm ci)
```

Then the same verification commands were run from the temp workspace.

## Clean Workspace Results

- Root `npm ci`: passed. npm audit reported 2 moderate findings in the root Next/React dependency tree.
- `packages/api-client npm ci`: passed, 0 vulnerabilities reported.
- `tools npm ci`: passed, 0 vulnerabilities reported.
- `mobile npm ci`: passed. npm audit reported 46 existing findings in the mobile dependency tree.
- Clean `node tools/verify-contract-layer.mjs`: passed after fixing temp workspace ownership.
- Clean `node tools/verify-ui-foundation.mjs`: passed.
- Clean explicit typechecks for `packages/types`, `packages/api-client`, `packages/ui`, `packages/design-tokens`, `apps/web`, `apps/admin`: passed.
- Clean `npm run build:web`: passed.
- Clean `npm run build:admin`: passed.
- Clean standalone `node tools/ui-foundation-smoke.mjs`: passed.

## Issues Found

1. The temp copy initially failed at `git diff --check` with Git `dubious ownership`.
   - Cause: `rsync -a` preserved the source owner IDs in `/tmp`, while verification ran as `root`.
   - Fix applied only to the temporary workspace: `chown -R root:root /tmp/allchemist-hard-verify-20260702231848`.
   - Product code was not changed.

2. One standalone smoke rerun failed because the Windows-to-SSH here-string passed a carriage return into the module path: `tools/ui-foundation-smoke.mjs\r`.
   - The same smoke had already passed inside `verify-ui-foundation`.
   - The standalone smoke was rerun through a direct SSH command and passed.
   - Product code was not changed.

3. `tools/ui-foundation-smoke.mjs` starts apps with `next start`, while both Next apps use `output: "standalone"`.
   - Current smoke still passes.
   - Next prints a warning that standalone output should be run with `node .next/standalone/server.js`.
   - Recommended follow-up: update the smoke harness to support standalone server startup explicitly.

4. `tools/verify-contract-layer.mjs` currently uses `./mobile/node_modules/.bin/tsc`.
   - Clean verification therefore requires `cd mobile && npm ci`, even when mobile behavior is not under test.
   - Recommended follow-up: move TypeScript execution for shared packages to a root/package-local dependency path so contract verification does not depend on mobile install state.

5. Playwright is declared in `tools/package.json`, not root `package.json`.
   - This is acceptable if documented.
   - Clean verification must run `cd tools && npm ci` before Playwright smoke.

## Hidden Dependency / Boundary Assessment

- No bad runtime imports were found in the current foundation after clean install.
- TypeScript path aliases work in typecheck.
- Next/Turbopack builds work for both apps.
- `@allchemist/ui` component imports work.
- Shared CSS is imported through a relative source path from app layouts; this avoids the earlier unresolved package CSS subpath issue.
- The foundation does not require backend environment variables for current static shell routes.
- The foundation does rely on a git repository context for whitespace checks.
- The current smoke checks detect blank pages and document-level horizontal overflow, but they do not yet capture screenshots or compare visual regressions.
- Existing older smoke tools under `tools/playwright-*.mjs` target legacy/authenticated flows and were not run as part of this frontend foundation scope.

## Readiness

The current frontend foundation is ready for the next step, with caveats:

- Ready for design-lock preparation: yes, for route shells, package boundaries, reproducible builds, and basic smoke coverage.
- Ready for final visual design lock: not yet. A screenshot baseline and stronger visual checks should be added first.
- Ready for production route switch: no. Production routes were intentionally not switched, and the apps are still non-production foundation shells.

Recommended next verification work before design-lock:

1. Update `tools/ui-foundation-smoke.mjs` to launch standalone output through `.next/standalone/server.js`.
2. Add screenshot capture for `apps/web` and `apps/admin` key routes at desktop and mobile widths.
3. Add a lightweight visual baseline directory for UI foundation screenshots.
4. Remove the mobile `tsc` coupling from `verify-contract-layer.mjs`.
