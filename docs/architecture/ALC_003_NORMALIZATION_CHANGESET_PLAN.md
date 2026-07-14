# ALC-003 Normalization Changeset Plan

Task: ALC-003 — SAFE REPOSITORY NORMALIZATION
Date: 2026-07-14
Source: `baseline/allchemist-recovery-20260714-112717` at `b7df19563be5df99dcde1b50d091d2d5335afbe6`
Target: `chore/alc-003-repository-normalization-20260714-140056` in `/root/worktrees/allchemist-normalization-20260714-140056`

This plan was written before any source/configuration change in the normalization worktree. It authorizes no production, runtime, infrastructure, database, migration, service, routing, or legacy mutation.

## Planned changed paths

| Path | Current state | Action | Reason | Consumer | Risk | Rollback | Validation | Allowed in ALC-003 |
|---|---|---|---|---|---|---|---|---|
| `.gitignore` | Tracked; covers core generated/runtime/secret classes but omits several common cache/test-output names | IGNORE_GENERATED | Make generated-output policy explicit without hiding approved goldens, fixtures, migrations, contracts, or source manifests | Git worktrees, CI and developers | Over-broad rule could hide source | Revert this path; verify every added pattern with `git check-ignore` | hygiene check; `git ls-files`; clean-checkout build status | YES |
| `.gitattributes` | Absent | TRACK | Normalize text line endings and identify binary assets without changing content | Git clients and CI | Incorrect binary/text classification | Revert file | attribute inspection; line-ending and binary checks; build | YES |
| `.editorconfig` | Absent; no conflicting policy found | TRACK | Document editor-level UTF-8/LF/final-newline rules | Editors only | Contributor formatting drift | Revert file | parse by inspection; `git diff --check` | YES |
| `tools/check-repository-hygiene.mjs` | Absent | TRACK | Add a read-only detector for tracked generated/runtime/secret filenames and unignored generated directories | Root quality command and future CI | False positive/negative | Revert tool and script entry | direct invocation in current and clean checkout | YES |
| `package.json` | Tracked; no hygiene script; no lifecycle scripts | TRACK | Expose one unambiguous read-only `check:repository-hygiene` command | npm users and future CI | Script-name collision | Revert explicit script key | JSON parse; npm script exit code; lock hash unchanged | YES |
| `docs/quality/COMMAND_SIDE_EFFECT_REGISTRY.md` | ALC-001 registry lacks the new command | TRACK | Classify the new command as read-only and keep it separate from build/deploy | Quality/release owners | Stale classification | Revert doc | compare implementation behavior to registry | YES |
| `docs/architecture/REPOSITORY_TARGET_LAYOUT.md` | ALC-002 proposed layout | TRACK | Record the normalization branch evidence and unchanged current path boundaries | Architecture/repository owners | Claiming unapproved moves | Revert added ALC-003 section | path inventory and clean-checkout evidence | YES |
| `docs/architecture/FILE_OWNERSHIP_AND_BOUNDARIES.md` | Workstream proposal; no named owners | TRACK | Record hygiene-tool ownership and keep CODEOWNERS deferred | Repository/quality owners | Inventing people/teams | Revert added proposal | document review | YES |
| `docs/architecture/LEGACY_AND_TARGET_MAP.md` | Existing current-state map | TRACK | Add ALC-003 retention evidence; no legacy move/removal | Legacy/target lanes | Accidental readiness claim | Revert added section | tracked-path and diff review | YES |
| `docs/architecture/PROJECT_CLEANUP_INSPECTION.md` | Tracked historical UI-PROD-1 inspection; its “suspicious/untracked” section predates the recovered baseline | TRACK | Preserve the historical classifications and add current generated/runtime/duplicate/source-control evidence | Repository governance | Erasing history or treating stale state as current | Revert ALC-003 section | baseline `git show`, evidence command results and report cross-check | YES |
| `docs/quality/MASTER_REMEDIATION_REGISTER.md` | ALC-002 status summary | TRACK | Update only affected issues using ALC-003 evidence | Project governance | Overstated closure | Revert update | reconcile with JSON and acceptance report | YES |
| `docs/quality/master-remediation-register.json` | Schema v1, 40 issues | TRACK | Machine-readable affected status/evidence update | Automation/governance | Invalid JSON or count drift | Revert update | JSON parse and derived-count check | YES |
| `docs/quality/PROJECT_GATE_REGISTER.md` | G1 PARTIAL on ALC-002 evidence | TRACK | Give G1 an evidence-based ALC-003 status | Gate owners | Overstated PASS | Revert update | compare G1 exit criteria and reports | YES |
| `docs/architecture/MIGRATION_GATES.md` | G1 PARTIAL | TRACK | Record clean-checkout/hygiene evidence and remaining remote/runtime gaps | Architecture/release owners | Overstated authorization | Revert update | acceptance report | YES |
| `docs/architecture/REMEDIATION_EXECUTION_ROADMAP.md` | ALC-002 roadmap | TRACK | Record ALC-003 outcome and next safe task ordering | Program owners | Incorrect sequencing | Revert update | cross-check gates/issues | YES |
| `docs/architecture/ALC_003_NORMALIZATION_CHANGESET_PLAN.md` | Absent | TRACK | Required pre-change plan | All affected lanes | Plan drift | Revert file | performed/deferred comparison | YES |
| `docs/architecture/ALC_003_REPOSITORY_NORMALIZATION_REPORT.md` | Absent | TRACK | Required repository evidence | Repository owners | Stale evidence | Revert file | final commands/status | YES |
| `docs/architecture/ALC_003_RUNTIME_SEPARATION_REPORT.md` | Absent | TRACK | Required consumer inventory and explicit deferrals | Backend/data/security | Payload disclosure or false closure | Revert file | paths-only consumer evidence; no payloads | YES |
| `docs/architecture/ALC_003_DUPLICATE_RESOLUTION_REPORT.md` | Absent | TRACK | Required 23-group disposition and follow-ups | Repository/frontend/mobile/design | Unsafe deletion claim | Revert file | hashes/references/consumer evidence | YES |
| `docs/quality/ALC_003_REPRODUCIBILITY_REPORT.md` | Absent | TRACK | Required install/typecheck/build/clean-checkout evidence | Quality/release | Environment-specific claim | Revert file | exact exit codes, lock hash and clean status | YES |
| `docs/quality/ALC_003_ACCEPTANCE_REPORT.md` | Absent | TRACK | Evaluate all 25 acceptance criteria | Governance | False readiness | Revert file | evidence matrix | YES |
| `docs/architecture/ALC_003_HANDOFF_REPORT.md` | Absent | TRACK | Required 26-section handoff | Next task owner | Missing blocker | Revert file | final invariants/status | YES |

## Inspected paths explicitly not changed

| Path/class | Current state | Action | Reason / consumer evidence | Risk and required follow-up | Validation | Allowed in ALC-003 |
|---|---|---|---|---|---|---|
| `backend/app/services/user_state_store.py` | Uses source-relative `backend/data/user_state.json` | BLOCKED_NEEDS_VERIFICATION | Auth/cabinet state consumer; migration semantics and concurrency are G5/G6 work | ALC-007 runtime contract plus ALC-008 isolated migration/restore | paths-only source inspection; no state payload read | NO source change |
| `backend/app/services/admin_panel_service.py` | Uses source-relative mutable security/history files and multiple absolute `/root/synapse` operational paths | BLOCKED_NEEDS_VERIFICATION | Admin/security/backup/go-no-go/handover consumers; changing it crosses data, security and operations boundaries | ALC-007/008 ADR, isolated DB/state tests and rollback | consumer/function inventory; no payload read | NO source change |
| `backend/app/api/v1/endpoints/content_readonly.py` | Mutable APK pointer lookup includes `CONTENT_PACKS_DIR` and `/root/synapse/content_packs` fallback | PRESERVE_UNTIL_FOLLOWUP | Public content/release metadata consumer | ALC-007 object/runtime-store decision; ALC-008 migration if durable data changes | path/reference inspection | NO source change |
| `backend/data/**`, `backend/data_host_backup/**`, mutable `content_packs/allchemist-apk-latest.json` | Not tracked in baseline and ignored; production copies are protected | MOVE_RUNTIME (deferred) | ALC-002 classifies them as runtime/security/release state | Never read payload, move, delete, or modify in ALC-003; follow ALC-007/008 | `git ls-files` and `git check-ignore` only | NO mutation |
| `backend/app/web_public/**`, `backend/app/web_admin/**` | Tracked active legacy | KEEP_LEGACY | Current public/admin behavior and rollback reference | Removal only after G10 and explicit approval | tracked paths; no content changes | NO source change |
| All 23 duplicate groups / 54 files | Tracked and classified by ALC-002; consumer/provenance proof incomplete | PRESERVE_UNTIL_FOLLOWUP | Per-group consumers span independent app configs, design assets, legacy/mobile packaging, docs and package configs | No deletion/consolidation without group-specific proof; assign follow-up IDs | SHA-256, references/imports, build and provenance status | NO consolidation unless all six safety tests become proven |
| Approved golden/reference assets, migrations, versioned fixtures, contracts and source media manifests | Tracked canonical/source classes | NO_CHANGE | Must not be hidden or treated as generated output | Accidental ignore/removal would invalidate G8/source reproducibility | `git check-ignore`, tracked-set scan | NO content change |
| `package-lock.json` | Tracked lockfile | NO_CHANGE | Dependency graph must remain exact | Any hash change fails acceptance | SHA-256 before/after install/build | NO change |
| `.github/workflows/**`, `infra/**`, nginx/systemd/Docker/DNS | Tracked desired-state or live operational boundaries | NO_CHANGE | ALC-003 is not toolchain/deploy/operations work | Changes require ALC-006/007/004 and approval | Git diff plus live invariant checks | NO change |
| `/root/synapse`, baseline worktree, backup, recovered artifact, preview 3010 | Protected evidence/runtime | NO_CHANGE | Explicit task restrictions | Any mutation fails ALC-003 | HEAD/status/hash/checksum/PID/HTTP/service status | NO change |

## Executable metadata correction added after pre-change inspection

The tracked-mode inspection found 30 paths at mode `100755`. Eleven are launchers with a shebang and retain executable mode. The following 19 paths have no shebang and are source, configuration, dependency manifests, a Dockerfile, or an image. Only their Git executable bit is planned to change from `100755` to `100644`; file bytes remain unchanged.

| Paths | Current state | Action | Reason | Consumer | Risk | Rollback | Validation | Allowed in ALC-003 |
|---|---|---|---|---|---|---|---|---|
| `backend/Dockerfile`<br>`backend/app/api/v1/__init__.py`<br>`backend/app/api/v1/routes.py`<br>`backend/app/core/__init__.py`<br>`backend/app/main.py`<br>`backend/app/models/__init__.py`<br>`backend/app/schemas/__init__.py`<br>`backend/app/services/__init__.py`<br>`backend/app/web_admin/icon.png`<br>`backend/requirements.txt`<br>`mobile/app/components/ModuleCard.tsx`<br>`mobile/app/config/api.ts`<br>`mobile/app/navigation/RootNavigator.tsx`<br>`mobile/app/screens/AIMentorScreen.tsx`<br>`mobile/app/screens/ChemistryScreen.tsx`<br>`mobile/app/screens/HomeScreen.tsx`<br>`mobile/app/screens/PhysicsScreen.tsx`<br>`mobile/eas.json`<br>`tools/content_quality_guard.py` | Tracked as `100755`; no shebang; none is a direct executable contract | TRACK (mode-only normalization to `100644`) | Remove accidental executable metadata while preserving bytes and paths | Docker/build tooling, Python imports, mobile compiler, static admin asset; `content_quality_guard.py` is invoked through Python/package tooling rather than a shebang | A hidden direct-exec consumer could rely on the bit, though no shebang makes successful direct execution unsupported | Restore mode `100755` from source commit | SHA-256 before/after identical; `git diff --summary`; typechecks/build; retained launcher list | YES |

Retained `100755` launchers: `mobile/android/gradlew`, shell tools with shebangs, `tools/check-approved-references.mjs`, and Python tools with `#!/usr/bin/env python3`. No filename collision, case-only conflict, or symlink was found. The sole CRLF text path is the platform-native `mobile/android/gradlew.bat` and is explicitly covered by `.gitattributes`.

Clean-checkout diagnosis after adding `.gitattributes` proved that `mobile/android/gradlew.bat` remained perpetually modified because its historical index blob stored CRLF while the new attribute requires a normalized text blob with a CRLF working-tree representation. This exact path is therefore added as a `TRACK` line-ending-only change: run explicit `git add --renormalize -- mobile/android/gradlew.bat`, preserve the working-tree CRLF contract, verify `git ls-files --eol` reports `i/lf w/crlf attr/text eol=crlf`, and require a zero-diff fresh checkout. Rollback is restoration of the source-commit blob plus removal/revision of the attribute. No other path is renormalized.

## Decision summary before implementation

- Planned source/config implementation is limited to repository hygiene files and the package script.
- No runtime adapter is changed: the required environment name and storage semantics were not approved by ALC-002, and consumers cross G5/G6/operations boundaries.
- No duplicate is consolidated: identical bytes alone do not prove canonical ownership, packaging, provenance, or removal safety.
- No generated file is deleted: the baseline tracked set already excludes the prohibited generated/runtime classes.
- No CODEOWNERS file is created because named owners are not approved.
- Production, immutable baseline, backup, artifact, runtime services and routes remain untouched.
