# ALC-006 Safe Command Matrix

## Classification totals

| Classification | Count | CI permitted |
|---|---:|---|
| READ_ONLY_SAFE | 25 | yes |
| ISOLATED_BUILD_SAFE | 7 | only explicit build job |
| ISOLATED_TEST_SAFE | 4 | yes, isolated checkout |
| REQUIRES_ISOLATED_DB | 1 | no; ALC-008 |
| OPERATIONAL_MUTATION | 12 | no |
| PRODUCTION_UNSAFE | 13 | no |
| UNKNOWN_UNSAFE | 3 | no |
| **Total** | **65** | |

## Entry-point matrix

The following rows cover every audited entry point. A comma-separated command family means every named member has the same side-effect contract.

| Entry points | Class | Reads | Creates/deletes | Build / migration | Network/secrets/runtime | CI |
|---|---|---|---|---|---|---|
| root `check:*`, `verify:*`, `typecheck:*`; contract/hygiene/UTF-8/secret/generated tools | READ_ONLY_SAFE | tracked source/config and Git index | no intentional output; TypeScript may create ignored cache only if configured | no / no | no / no / no | yes |
| root `build:web`, `build:web:isolated`, `build:admin`; app `build`; mobile `web:export`; desktop `tauri:build` | ISOLATED_BUILD_SAFE | source and dependencies | generated build output; may replace its own ignored output | yes / no | package tooling may resolve build-time resources; no secrets expected; no live runtime | only `build:web:isolated` |
| root `test:unit:safe`, api-client `test`, approved static smoke/contract tests | ISOLATED_TEST_SAFE | fixtures/source | temporary ignored test output possible | no / no | no production network/secrets/runtime | safe unit subset only |
| former workflow backend regression | REQUIRES_ISOLATED_DB | backend tests/schema | isolated DB rows and test caches | no / possible schema setup | local test DB credentials/runtime | no; ALC-008 |
| app/mobile/desktop `dev`, `start`, `web`, `android`, `ios`, `tauri:dev`; Playwright/snapshot/profile tools | OPERATIONAL_MUTATION | source and target runtime | `.next`, browser, screenshots, device/build/runtime state; cleanup possible | possible / no | local/remote network; sometimes auth; starts/uses runtime | no |
| backup, stage preflight/hardening, production monitor, revoke sessions, GitHub/provider setup, APK/release pipeline and production-release workflow | PRODUCTION_UNSAFE | operational/config/production state | backups, releases, provider/session/runtime changes; deletion possible | possible deploy / possible | network and secrets likely; production impact possible | no |
| content generators, manual generators, extraction/layer generator commands without a declared output contract | UNKNOWN_UNSAFE | source/external data | generated files and replacement/deletion unknown | unknown / no evidence | network/secrets/runtime unknown | no; never executed |

## Explicit safe commands

`npm run verify:ui-foundation` is read-only and never calls build, Playwright, snapshots, deploy, migration, nginx/systemd, a database, or runtime-state writers. `npm run build:web:isolated` is the sole CI build command. `npm run test:unit:safe` is the sole CI test command.
