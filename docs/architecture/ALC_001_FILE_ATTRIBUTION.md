# ALC-001 File Attribution

Date: 2026-07-14 (Europe/Moscow)
Source: `/root/synapse` at `d3106a0df8bfe5da2fad87602c13fd9beeddedaa`
Protected evidence: `/root/backups/allchemist/ALC-001/20260714-112717`

Attribution labels describe when a path was already observable, not who authored it. No author is inferred.

## Complete status-path classification

The preflight universe contained 1403 status-visible paths. Four filename/type heuristic matches were initially isolated, reviewed without reporting values, and proven to be design-token source/config. Final counts therefore are:

| Primary category | Count | Runtime use / evidence | Baseline decision | Attribution |
|---|---:|---|---|---|
| `TRACKED_SOURCE_MODIFIED` | 18 | imports, endpoint registration, legacy runtime paths, mobile manifests | include | PRE-ALC-000 |
| `TRACKED_TEST_MODIFIED` | 6 | pytest and Playwright test paths | include; do not run against production | PRE-ALC-000 |
| `TRACKED_DOC_MODIFIED` | 1 | QA stage ledger | include | PRE-ALC-000 |
| `TRACKED_RUNTIME_STATE` | 8 | mutable security/user/release state | backup only | PRE-ALC-000 |
| `UNTRACKED_TARGET_SOURCE` | 164 | target apps/packages/content/tools imports and route files | include | PRE-ALC-000 |
| `UNTRACKED_TARGET_CONFIG` | 44 | workspace/package/tsconfig/tool configuration | include after lifecycle review | PRE-ALC-000 |
| `UNTRACKED_TARGET_TEST` | 37 | package and tooling tests | include | PRE-ALC-000 |
| `UNTRACKED_TARGET_DOC` | 111 | architecture/design/quality history | include | PRE-ALC-000 / ALC-000 |
| `UNTRACKED_TARGET_ASSET` | 90 | required public, mobile, and legacy assets | include | PRE-ALC-000 |
| `GENERATED_BUILD_ARTIFACT` | 921 | `.next`, built output, generated screenshots | exclude | mixed / UNKNOWN |
| `CACHE_OR_TEMPORARY` | 3 | cache, tsbuildinfo, assistant log | exclude | mixed |
| `POSSIBLE_SECRET` | 0 final | four initial false positives reviewed as design-token files | no secret path copied | UNKNOWN until reviewed |
| `UNKNOWN_OR_QUARANTINED` | 0 | empty quarantine inventory retained | exclude automatically | — |

Cross-cutting tags:

- `LEGACY_EXISTING`: 14 significant backend/legacy web paths; preserve behavior, do not copy their visual design into target UI by assumption.
- `DUPLICATED`: 23 SHA-identical groups covering 54 candidate files. No duplicate was deleted.

The final safe untracked candidate set is 446 files: 164 source, 44 config, 37 test, 111 docs, and 90 assets.

## Significant tracked groups

### Modified source — 18

- Backend API/service: `backend/app/api/v1/endpoints/{admin_panel,public_web,system}.py` and `backend/app/services/admin_panel_service.py`.
- Active legacy public/admin web: `backend/app/web_public/{app.js,index.html,styles.css}` and `backend/app/web_admin/{app.js,index.html,styles.css}`.
- Mobile source/config/assets: `mobile/App.tsx`, `mobile/android/app/build.gradle`, app background and screen files, and content-pack JSON.

Evidence: endpoint imports, FastAPI routing, nginx backend routing, mobile imports/manifests, and ALC-000 runtime mapping. Risk is HIGH for backend/legacy behavior and MEDIUM for mobile. Baseline: YES.

### Modified tests — 6

- `backend/tests/test_admin_panel.py`
- `backend/tests/test_admin_web.py`
- `backend/tests/test_public_web.py`
- `tools/playwright-admin-auth-roles-smoke.mjs`
- `tools/playwright-authenticated-roles-smoke.mjs`
- `tools/playwright-visual-smoke.mjs`

Evidence: test framework imports and package/tool invocation. Baseline: YES. Runtime use: not production runtime. Execution against production: NO.

### Modified docs — 1

- `docs/qa/stage-ledger.md`

Evidence: Markdown operational/QA ledger. Baseline: YES; review operational history before future edits.

## Runtime and mutable state

The eight status-visible runtime paths were archived separately. Their contents were not printed.

| Path | Bytes | SHA-256 | Decision |
|---|---:|---|---|
| `backend/data/security/alerts_ack.json` | 176 | `1b6682be72ed2a54d580a0b76edbde9e562be7f70ff68ac19c519a42cd2ed471` | protected backup only |
| `backend/data/security/backup_dry_run_history.json` | 12014 | `31309365529f2b9cfd3a1ef8d8e9916b9f618dff89f4f63e62d1a8bac5eeb232` | protected backup only |
| `backend/data/security/backup_dry_run_status.json` | 1315 | `dc6c77acbac8f228b7990d2e4c70f7d668c6f6e2e180fdf1ba795bed923e57ea` | protected backup only |
| `backend/data/security/go_no_go_history.json` | 121863 | `6339bd7531b013b40887066178d2277e865c7955480127aefa259ff7d652e658` | protected backup only |
| `backend/data/security/handover_archive.json` | 13457 | `4103a5795c854924d3a8fb718f66d0ca5726daa88c866343b9313ae0b2035ab8` | protected backup only |
| `backend/data/security/mobile_onboarding_smoke_status.json` | 138 | `c9a5d9586a05d2f1f105430ac7e0004d4cb6187effd5b1d62e584a5523f5a7ad` | protected backup only |
| `backend/data/user_state.json` | 900114 | `2aa66d891ffda7f01ad3d26a5fd035bb4023040d9d58f544d632c0a4c0d51c5d` | protected backup only |
| `content_packs/allchemist-apk-latest.json` | 892 | `089d5d914ddf6f2ba6de9d9539933920dd4363db6a1ef1cecf7800b2126a3bf0` | protected backup only |

In addition, seven clean tracked mutable paths inherited from the source commit were removed only from the isolated baseline: the `backend/data_host_backup` state copies and `assistant_log.md`. Together with the eight paths above, 15 unsafe tracked paths are absent from the baseline tree.

## Untracked candidate groups

| Group | Paths / purpose | Evidence | Runtime now | Baseline | Risk |
|---|---|---|---|---|---|
| `apps/web` | Next routes, components, public assets, config | package scripts, route tree, successful isolated build | preview target | YES, excluding `.next` | MEDIUM |
| `apps/admin` | target admin Next app/config/assets | package scripts and route tree | not active | YES, excluding `.next` | MEDIUM |
| `packages/*` | design tokens, UI, AI, content, science, contracts, API client | workspace graph, imports, typechecks/tests | shared target code | YES, excluding generated output | MEDIUM |
| `content/*` | content source and schemas | imports and package references | target content | YES | MEDIUM |
| `tools/*` | checks, generators, Playwright and visual tooling | package scripts/call graph | tooling only | YES after classification | MEDIUM/HIGH |
| `docs/*` | architecture, design, quality, contracts | Markdown and manifest links | documentation | YES | LOW |
| `infra/*` | repository-owned examples/config | Compose/nginx/systemd source paths | production config may differ | source only; never apply in ALC-001 | HIGH |
| required assets | `apps/<app>/public`, selected backend/mobile images | import/manifest references and build | target/legacy asset use | YES | LOW/MEDIUM |

## Secret heuristic review

Initial heuristic count: 4. Final possible-secret count: 0.

The reviewed paths were three `packages/design-tokens` source/config files and one Figma student-dashboard token JSON. They are not credentials and were added through a separately protected, checksum-verified addendum. A content-pattern scan of the staged set produced three apparent matches in legacy HTML; path/line review showed only password-toggle element identifiers. No secret value was printed.

The protected initial path list and review evidence remain mode `0600`. No `.env`, key, certificate, credential file, cookie, database, or user-state file is present in the baseline commit.

## Generated, cache, duplicate, and quarantine policy

- Excluded generated paths: 921.
- Excluded cache/temporary paths: 3 status-visible paths, plus ignored dependency/build/cache directories.
- Duplicate groups: 23 groups / 54 files; retained because identical content alone is not deletion authority.
- Unknown/quarantined paths: 0. The empty quarantine list is retained to prove classification completeness.
- Current `/root/synapse/apps/web/.next` is excluded because it is incomplete and lacks `BUILD_ID`.

## Final baseline inclusion

The commit contains the 25 modified tracked source/test/doc paths, 446 classified untracked candidates, two ALC-001 report snapshots, an updated `.gitignore`, and 15 isolated-only deletions of unsafe tracked state. Total commit path changes: 489.

Explicit path staging was used. Production files were not deleted or cleaned.
