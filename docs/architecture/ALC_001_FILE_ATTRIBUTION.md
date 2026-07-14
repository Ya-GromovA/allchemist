# ALC-001 — File Attribution and Baseline Selection

Дата классификации: 2026-07-14 (Europe/Moscow)

Источник: production checkout `/root/synapse`, HEAD `d3106a0df8bfe5da2fad87602c13fd9beeddedaa`. Классификация выполнена после проверенного защищённого snapshot `/root/backups/allchemist/ALC-001/20260714-112717`.

Авторство существующих изменений не предполагается. `PRE-ALC-000` означает только то, что путь уже присутствовал в baseline-аудите; это не имя автора.

## Primary category counts

Категории ниже образуют полный preflight-набор из 1403 путей.

| Category | Count | Baseline action | Attribution |
|---|---:|---|---|
| `TRACKED_SOURCE_MODIFIED` | 18 | перенести как source | PRE-ALC-000 |
| `TRACKED_TEST_MODIFIED` | 6 | перенести как tests | PRE-ALC-000 |
| `TRACKED_DOC_MODIFIED` | 1 | перенести как documentation | PRE-ALC-000 |
| `TRACKED_RUNTIME_STATE` | 8 | только protected backup; не переносить | PRE-ALC-000 |
| `UNTRACKED_TARGET_SOURCE` | 163 | перенести | PRE-ALC-000 |
| `UNTRACKED_TARGET_CONFIG` | 41 | перенести после secret/lifecycle checks | PRE-ALC-000 |
| `UNTRACKED_TARGET_TEST` | 37 | перенести | PRE-ALC-000 |
| `UNTRACKED_TARGET_DOC` | 111 | перенести; пять ALC-000 reports помечены отдельно | PRE-ALC-000 / ALC-000 |
| `UNTRACKED_TARGET_ASSET` | 90 | перенести необходимые product/design assets | PRE-ALC-000 |
| `GENERATED_BUILD_ARTIFACT` | 921 | только backup inventory; не переносить | PRE-ALC-000 / ALC-000 side effect / UNKNOWN |
| `CACHE_OR_TEMPORARY` | 3 | не переносить | PRE-ALC-000 / ALC-000 side effect |
| `POSSIBLE_SECRET` | 4 | исключить; protected path list only | UNKNOWN |
| `UNKNOWN_OR_QUARANTINED` | 0 | автоматического переноса нет | — |

Cross-cutting tags, не добавляемые повторно к итогу: `LEGACY_EXISTING` — 14 значимых current/legacy web paths; `DUPLICATED` — 23 hash-identical groups / 54 safe candidate files.

## Modified tracked source, tests and docs

### `TRACKED_SOURCE_MODIFIED` — 18

- Backend current source: `backend/app/api/v1/endpoints/{admin_panel,public_web,system}.py`, `backend/app/services/admin_panel_service.py`.
- Legacy runtime web source: `backend/app/web_admin/{app.js,index.html,styles.css}`, `backend/app/web_public/{app.js,index.html,styles.css}`. Эти файлы одновременно имеют tag `LEGACY_EXISTING` и должны сохраняться без визуального копирования в target UI.
- Mobile source/config/assets: `mobile/App.tsx`, `mobile/android/app/build.gradle`, `mobile/app/components/AppBackground.tsx`, три screen files, два content pack JSON.

Назначение подтверждено путями, импортами/manifest и ALC-000 runtime map. Эти файлы используются current backend/legacy/mobile code paths. В baseline: YES. Риск: HIGH для legacy/backend behavior, MEDIUM для mobile.

### `TRACKED_TEST_MODIFIED` — 6

- `backend/tests/test_admin_panel.py`
- `backend/tests/test_admin_web.py`
- `backend/tests/test_public_web.py`
- `tools/playwright-admin-auth-roles-smoke.mjs`
- `tools/playwright-authenticated-roles-smoke.mjs`
- `tools/playwright-visual-smoke.mjs`

В baseline: YES. Выполнение против production: NO. Playwright scripts пишут screenshots и могут использовать auth/state.

### `TRACKED_DOC_MODIFIED` — 1

- `docs/qa/stage-ledger.md`

В baseline: YES. Содержимое не цитируется в отчёте. Риск: содержит operational history; review required.

## Runtime/security state — backup only

Содержимое не читалось и не переносится в Git baseline.

| Path | Size | SHA-256 | Category |
|---|---:|---|---|
| `backend/data/security/alerts_ack.json` | 176 | `1b6682be72ed2a54d580a0b76edbde9e562be7f70ff68ac19c519a42cd2ed471` | runtime/security |
| `backend/data/security/backup_dry_run_history.json` | 12014 | `31309365529f2b9cfd3a1ef8d8e9916b9f618dff89f4f63e62d1a8bac5eeb232` | runtime/security |
| `backend/data/security/backup_dry_run_status.json` | 1315 | `dc6c77acbac8f228b7990d2e4c70f7d668c6f6e2e180fdf1ba795bed923e57ea` | runtime/security |
| `backend/data/security/go_no_go_history.json` | 121863 | `6339bd7531b013b40887066178d2277e865c7955480127aefa259ff7d652e658` | runtime/security |
| `backend/data/security/handover_archive.json` | 13457 | `4103a5795c854924d3a8fb718f66d0ca5726daa88c866343b9313ae0b2035ab8` | runtime/security |
| `backend/data/security/mobile_onboarding_smoke_status.json` | 138 | `c9a5d9586a05d2f1f105430ac7e0004d4cb6187effd5b1d62e584a5523f5a7ad` | runtime/security |
| `backend/data/user_state.json` | 900114 | `2aa66d891ffda7f01ad3d26a5fd035bb4023040d9d58f544d632c0a4c0d51c5d` | runtime/user data |
| `content_packs/allchemist-apk-latest.json` | 892 | `089d5d914ddf6f2ba6de9d9539933920dd4363db6a1ef1cecf7800b2126a3bf0` | mutable release metadata |

Protected copy: `runtime-state.tar.gz` inside the ALC-001 backup. Baseline: NO. Risk: HIGH.

## Untracked target candidate groups

| Category | Count | Top-level distribution | Runtime use | Baseline |
|---|---:|---|---|---|
| Source | 163 | apps 52, content 8, packages 97, tools 6 | target/preview and shared code | YES |
| Config | 41 | apps 7, packages 29, infra 2, root 2, tools 1 | build/workspace config; infra examples not applied | YES |
| Tests | 37 | packages 27, tools 10 | contract/science/visual checks | YES |
| Docs | 111 | docs 107, packages 2, tools 1, AGENTS 1 | architecture/design/quality history | YES |
| Assets | 90 | apps 79, backend 8, mobile 3 | preview/product/legacy assets | YES |

The selected candidate set totals 442 files. It excludes `.next`, `node_modules`, build/dist, caches, `*.tsbuildinfo`, screenshots/artifacts, built `web_public_react`, logs, database files, runtime state and possible-secret names/types.

The five ALC-000 reports under `docs/architecture` and `docs/quality` are attributed `ALC-000`; other selected untracked candidates are `PRE-ALC-000` unless their provenance remains unknown.

## Generated and cache exclusions

- `GENERATED_BUILD_ARTIFACT`: 921 paths, primarily `apps/*/.next`, snapshot artifacts and built static output.
- `CACHE_OR_TEMPORARY`: 3 paths, including tracked `assistant_log.md` and untracked cache/tsbuildinfo paths.
- Current `apps/web/.next` is specifically excluded: it is incomplete after ALC-000 and is not a recoverable source artifact.
- `node_modules`, Android build/cache, Python venv/cache and generated screenshots are excluded even where ignored files do not appear in `git status`.

## Possible secrets and quarantine

- Four status-visible paths matched filename/type secret heuristics.
- Their values were not opened, copied into source archive or listed here.
- Protected path-only list: `/root/backups/allchemist/ALC-001/20260714-112717/possible-secret-paths.txt`, mode `0600`.
- Unknown untracked quarantine count: 0.
- The tracked `assistant_log.md` is backed up separately and excluded from baseline as cache/log material.

## Duplicates

23 hash-identical groups covering 54 selected files were detected. Most are intentional-looking shared icons, mirrored design-preview assets, repeated tsconfig/Next config files and legacy/mobile images. No duplicate was deleted. Duplicate status is informational and does not grant cleanup permission.

## Baseline inclusion decision

Include only the 25 modified tracked source/test/doc files plus 442 safe untracked source/config/test/doc/asset candidates. Exclude all runtime state, possible secrets, generated artifacts, caches, databases, logs and unclassified paths. Explicit path staging is required; `git add .` and `git add -A` remain prohibited.
