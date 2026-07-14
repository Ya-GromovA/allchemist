# ALC-001 — Command Side-Effect Registry

Дата: 2026-07-14. Registry основан на `package.json`, workspace manifests, tsconfig options и фактическом call graph scripts. Команды с `UNKNOWN_UNSAFE` не запускаются.

## Classification meanings

- `READ_ONLY_SAFE`: не создаёт project/runtime output при указанной форме.
- `WRITES_BUILD_OUTPUT`: пишет dependencies, caches, `*.tsbuildinfo`, `.next`, dist или screenshots.
- `WRITES_SOURCE`: изменяет source/docs/config.
- `WRITES_RUNTIME_STATE`: создаёт процесс, лог, device/app state или иное runtime state.
- `MAY_ACCESS_DATABASE`: может читать/писать DB в зависимости от environment.
- `MAY_CHANGE_INFRA`: может менять services, images, routing or deployment state.
- `UNKNOWN_UNSAFE`: side effects не доказаны безопасными.

## Root and Next workspace commands

| Command | Calls | Classification | Writes | Network / DB | Isolated worktree | Production checkout |
|---|---|---|---|---|---|---|
| `npm ci` | npm installer from root lock | `WRITES_BUILD_OUTPUT` | `node_modules` | package registry; no DB | YES after lifecycle review | NO |
| `npm run typecheck:tokens` | `tsc -p packages/design-tokens/tsconfig.json` | `READ_ONLY_SAFE` | none (`noEmit`, no incremental) | none | YES | NO by ALC-001 policy |
| `npm run typecheck:ui` | UI `tsc` | `READ_ONLY_SAFE` | none | none | YES | NO |
| `npm run typecheck:ai-assistant` | AI package `tsc` | `READ_ONLY_SAFE` | none | none | YES | NO |
| other subject/core typechecks | corresponding package `tsc` | `READ_ONLY_SAFE` | none in inspected configs | none | YES | NO |
| `npm run typecheck:web` | Next-aware `tsc` | `WRITES_BUILD_OUTPUT` | `apps/web/tsconfig.tsbuildinfo` because `incremental: true` | none | YES | NO |
| `npm run typecheck:admin` | Next-aware `tsc` | `WRITES_BUILD_OUTPUT` | admin tsbuildinfo | none | YES | NO |
| `npm run build:web` / `npm --prefix apps/web run build` | `next build` | `WRITES_BUILD_OUTPUT` | `apps/web/.next/**` | may perform build-time network if source requests it; no DB found | YES | PROHIBITED |
| `npm run build:admin` | admin `next build` | `WRITES_BUILD_OUTPUT` | `apps/admin/.next/**` | same caveat | isolated only | PROHIBITED |
| `npm --prefix apps/web run dev` | `next dev` | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | `.next`, listening process | local network | development worktree only | NO |
| `npm --prefix apps/web run start` | `next start` | `WRITES_RUNTIME_STATE` | process/log; consumes `.next` | local network | YES for temporary smoke | NO |

No `preinstall`, `install`, `postinstall` or `prepare` lifecycle script exists in root, web, admin, mobile, tools or inspected package manifests.

## Verification and visual tools

| Command | Actual behavior | Classification | Isolated | Production |
|---|---|---|---|---|
| `node tools/verify-contract-layer.mjs` | types/api-client tsc, Vitest, scoped `git diff --check` | `WRITES_BUILD_OUTPUT` (possible test/dependency cache) | YES | NO |
| `node tools/verify-ui-foundation.mjs` | contract checks, web/admin typechecks, both Next builds, Playwright smoke, screenshot capture | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | YES only when all outputs are owned | **NO** |
| `node tools/check-approved-references.mjs` | manifest/file metadata reads | `READ_ONLY_SAFE` | YES | YES |
| `node --check <file.js>` | parser only | `READ_ONLY_SAFE` | YES | YES |
| `node tools/ui-foundation-smoke.mjs` | starts Next on 3210/3211, launches Chromium | `WRITES_RUNTIME_STATE`, possible browser caches | YES with free ports | NO |
| `node tools/check-layout-contract.mjs` | may build, starts Next, writes JSON/Markdown/artifacts | `WRITES_BUILD_OUTPUT`, `WRITES_SOURCE`, `WRITES_RUNTIME_STATE` | YES | NO |
| `node tools/capture-ui-snapshots.mjs` | may build, starts Next, writes screenshots/ZIP | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | YES | NO |
| `node tools/playwright-approved-ui-smoke.mjs` | creates artifact dirs and screenshots; accesses configured base URL | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE` | YES against isolated URL | NO |
| `node tools/playwright-visual-smoke.mjs` | defaults to port 8000, writes screenshots | `WRITES_BUILD_OUTPUT`, may access production | isolated URL only | NO |
| uninspected tool | unknown | `UNKNOWN_UNSAFE` | NO until classified | NO |

`verify-ui-foundation.mjs` is classified by behavior, not name. It is not a read-only verification command.

## Backend, database and infrastructure commands

| Command family | Classification | Production policy |
|---|---|---|
| `pytest`, FastAPI tests, scripts importing application state | `MAY_ACCESS_DATABASE`, `WRITES_RUNTIME_STATE` | prohibited against production DB/state |
| Alembic/migration/init/import scripts | `MAY_ACCESS_DATABASE`, `WRITES_RUNTIME_STATE` | prohibited |
| Docker build/up/down/restart | `WRITES_BUILD_OUTPUT`, `MAY_CHANGE_INFRA` | prohibited |
| `docker compose ps`, formatted `docker ps` | `READ_ONLY_SAFE` | allowed |
| nginx/systemd edit/reload/restart | `MAY_CHANGE_INFRA` | prohibited |
| `systemctl show`, `ss -ltnp`, process metadata | `READ_ONLY_SAFE` | allowed |
| safe HTTP GET/HEAD health probes | `READ_ONLY_SAFE` at known non-mutating routes | allowed |

## Mobile npm commands

| Script | Classification | Reason / policy |
|---|---|---|
| `start`, `android`, `ios`, `web`, `web:remote` | `WRITES_BUILD_OUTPUT`, `WRITES_RUNTIME_STATE`, network/device access | isolated mobile workspace only |
| `web:export` | `WRITES_BUILD_OUTPUT` | writes export/dist |
| `smoke:migration` | `UNKNOWN_UNSAFE` | migration/device-state semantics; do not run until separately classified |
| `apk:preflight` | `UNKNOWN_UNSAFE` | do not run during ALC-001 |
| `apk:build:demo` | `WRITES_BUILD_OUTPUT`, network/external EAS | prohibited in ALC-001 |
| `quality:content` | `UNKNOWN_UNSAFE` until Python guard's complete `--check` path is reviewed | not run during ALC-001 |

## Commands approved for ALC-001 isolated build

After successful backup, explicit baseline commit and lifecycle review:

1. `npm ci`
2. `npm run typecheck:tokens`
3. `npm run typecheck:ui`
4. `npm run typecheck:ai-assistant`
5. `npm run typecheck:web`
6. `npm run build:web`
7. direct cold start of the copied standalone artifact on `127.0.0.1:3011`

All build output must stay in the isolated worktree or `/root/allchemist-runtime/preview/releases/<timestamp>`. Production `/root/synapse` is not an allowed cwd for these commands.
