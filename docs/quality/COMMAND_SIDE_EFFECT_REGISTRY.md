# Command Side-Effect Registry

Updated by ALC-003 on 2026-07-14. Classification is based on inspected package manifests, tsconfig behavior, and called tool source. A command named “verify” is not assumed read-only.

## Classes

- `READ_ONLY_SAFE`: does not create project/runtime output in the inspected invocation.
- `WRITES_BUILD_OUTPUT`: writes dependencies, caches, tsbuildinfo, `.next`, dist, or screenshots.
- `WRITES_SOURCE`: edits source/docs/config.
- `WRITES_RUNTIME_STATE`: creates a process, log, browser/device state, or mutable app state.
- `MAY_ACCESS_DATABASE`: may read or write a configured database.
- `MAY_CHANGE_INFRA`: may alter services, images, routing, or deployment state.
- `UNKNOWN_UNSAFE`: safety was not proven; do not run.

## Root and Next workspace

| Command | Actual call / output | Class | Network / DB | Isolated | Production checkout |
|---|---|---|---|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | lock-based install to `node_modules` | `WRITES_BUILD_OUTPUT` | package registry; no DB path found | YES after lifecycle review | NO |
| `npm run check:repository-hygiene` | reads Git tracked paths, ignore decisions and directory names; emits path/class/status only | `READ_ONLY_SAFE` | none | YES | allowed read-only; no build/deploy composition |
| `npm run typecheck:tokens` | `tsc -p packages/design-tokens/tsconfig.json`; no emit/incremental | `READ_ONLY_SAFE` | none | YES | NO by ALC-001 policy |
| `npm run typecheck:ui` | UI package `tsc`; no emit | `READ_ONLY_SAFE` | none | YES | NO |
| `npm run typecheck:ai-assistant` | AI package `tsc`; no emit | `READ_ONLY_SAFE` | none | YES | NO |
| `npm run typecheck:web` | web `tsc` with incremental metadata | `WRITES_BUILD_OUTPUT` | none | YES | NO |
| `npm run typecheck:admin` | admin `tsc` with incremental metadata | `WRITES_BUILD_OUTPUT` | none | isolated only | NO |
| `npm run build:web` | Next web build to `apps/web/.next` | `WRITES_BUILD_OUTPUT` | possible build-time network; no DB call found | YES | PROHIBITED |
| `npm run build:admin` | Next admin build | `WRITES_BUILD_OUTPUT` | same caveat | isolated only | PROHIBITED |
| web/admin `dev` | starts Next dev and writes `.next` | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | local network | dev worktree only | NO |
| web/admin `start` | starts server from existing build | `WRITES_RUNTIME_STATE` | local network | temporary isolated smoke only | NO |

No `preinstall`, `install`, `postinstall`, or `prepare` lifecycle script exists in the root, web, admin, mobile, tools, or inspected package manifests.

## Verification and visual tools

| Command | Actual behavior | Class | Policy |
|---|---|---|---|
| `node tools/check-approved-references.mjs` | reads manifest and file metadata | `READ_ONLY_SAFE` | allowed |
| `node --check <javascript-file>` | parser only | `READ_ONLY_SAFE` | allowed |
| `node tools/verify-contract-layer.mjs` | typechecks, Vitest, scoped diff check | `WRITES_BUILD_OUTPUT` possible cache | isolated only |
| `node tools/verify-ui-foundation.mjs` | typechecks, two Next builds, process/browser smoke, screenshots | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | **prohibited in production; not run in ALC-001** |
| `node tools/ui-foundation-smoke.mjs` | starts Next on 3210/3211 and Chromium | `WRITES_RUNTIME_STATE`, possible cache | isolated only |
| `node tools/check-layout-contract.mjs` | may build/start server and write JSON/Markdown/artifacts | `WRITES_BUILD_OUTPUT`, `WRITES_SOURCE`, `WRITES_RUNTIME_STATE` | isolated only |
| `node tools/capture-ui-snapshots.mjs` | may build/start server and write screenshots/ZIP | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | isolated only |
| Playwright approved/visual/auth tools | starts browser, may authenticate, writes artifacts/screenshots | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE`; possible remote state | isolated target only after explicit review |
| uninspected tool | unknown | `UNKNOWN_UNSAFE` | do not run |

## Backend, database, and infrastructure

| Command family | Class | Production policy |
|---|---|---|
| `pytest` or scripts importing configured application state | `MAY_ACCESS_DATABASE`, `WRITES_RUNTIME_STATE` | prohibited without an isolated DB |
| Alembic, migrations, init/import scripts | `MAY_ACCESS_DATABASE`, `WRITES_RUNTIME_STATE` | prohibited |
| Docker build/up/down/restart | `WRITES_BUILD_OUTPUT`, `MAY_CHANGE_INFRA` | prohibited |
| `docker compose ps`, formatted `docker ps` | `READ_ONLY_SAFE` | allowed |
| nginx/systemd edit, reload, restart | `MAY_CHANGE_INFRA` | prohibited |
| `systemctl is-active/show`, `ss -ltnp`, process metadata | `READ_ONLY_SAFE` | allowed |
| safe HTTP GET/HEAD to known non-mutating routes | `READ_ONLY_SAFE` | allowed |

## Mobile commands

| Script | Class | Policy |
|---|---|---|
| `start`, `android`, `ios`, `web`, `web:remote` | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | isolated mobile workspace only |
| `web:export` | `WRITES_BUILD_OUTPUT` | isolated only |
| `smoke:migration` | `UNKNOWN_UNSAFE` | not run |
| `apk:preflight` | `UNKNOWN_UNSAFE` | not run |
| `apk:build:demo` | `WRITES_BUILD_OUTPUT`, external network | not run |
| `quality:content` | `UNKNOWN_UNSAFE` until complete guard path review | not run |

## ALC-001 executed commands

| Command | Location | Exit | Observed side effect |
|---|---|---:|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | isolated worktree | 0 | 91 packages in isolated `node_modules`; lock unchanged |
| `npm run typecheck:tokens` | isolated worktree | 0 | none |
| `npm run typecheck:ui` | isolated worktree | 0 | none |
| `npm run typecheck:ai-assistant` | isolated worktree | 0 | none |
| `npm run typecheck:web` | isolated worktree | 0 | ignored tsbuildinfo possible |
| `npm run build:web` | isolated worktree | 0 | isolated `.next` |
| direct standalone start with `HOSTNAME`/`PORT` names | release on `127.0.0.1:3011` | 0 | temporary process and protected log; process stopped |

No npm command was executed in `/root/synapse`. No global install, dependency update, migration, backend pytest, infra command, or `verify-ui-foundation.mjs` execution occurred.

## ALC-003 execution note

`npm ci`, the new hygiene check, four required typechecks, and `build:web` were run only in the normalization worktree and a disposable detached worktree. The disposable worktree was removed after evidence capture. No command was run in `/root/synapse`.
