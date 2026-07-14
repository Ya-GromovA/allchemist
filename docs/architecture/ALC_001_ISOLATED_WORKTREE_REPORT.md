# ALC-001 Isolated Worktree Report

Date: 2026-07-14 (Europe/Moscow)

## Identity

| Field | Value |
|---|---|
| Source repository | `/root/synapse` |
| Source branch | `figma-full-ui-migration-20260602` |
| Source HEAD | `d3106a0df8bfe5da2fad87602c13fd9beeddedaa` |
| Baseline branch | `baseline/allchemist-recovery-20260714-112717` |
| Worktree path | `/root/worktrees/allchemist-recovery-20260714-112717` |
| Commit | `c18b3d89c38e28b47f46816326981720fb30e253` |
| Commit subject | `chore(baseline): recover pre-ALC-001 target workspace` |
| Remote publication | none |

The branch was created locally from the exact production HEAD only after backup verification.

## Included paths

- 25 modified tracked source/test/doc paths.
- 446 classified untracked source/config/test/doc/asset paths.
- `apps/` without `.next`, dependencies, or generated output.
- `packages/`, `content/`, `tools/`, required assets, package metadata, lock file, and `AGENTS.md`.
- Backend source/test changes and mobile source/assets.
- Infra files as repository source only; no infra configuration was applied.
- `.gitignore` rules for dependencies, Next output, tsbuildinfo, artifacts, mutable backend data/backups, logs, and mutable release metadata.
- Two early ALC-001 report snapshots used during command classification and staging.

## Explicit exclusions

- `.next`, `node_modules`, build/dist/coverage output.
- caches, `*.tsbuildinfo`, logs, generated screenshots and test artifacts.
- databases, dumps, `.env`, keys, certificates, credentials, cookies, secrets.
- backend runtime/security/user state and backup copies.
- `assistant_log.md`.
- `content_packs/allchemist-apk-latest.json`.
- unknown/quarantined files; the list was empty.

Fifteen unsafe tracked paths inherited from the source commit were deleted only in this worktree. The same paths were not deleted from `/root/synapse`.

## Staging and validation

- Source was restored from verified archives and a protected design-token addendum.
- Staging used `git add --pathspec-from-file` with explicit NUL-delimited allowlists.
- `git add .` and `git add -A` were not used.
- Candidate symlinks: 0.
- Prohibited staged non-delete paths: 0.
- Unreviewed secret-pattern matches after review: 0.
- Banned tracked paths in final commit tree: 0.
- `git diff --check`: PASS.

Five imported historical Markdown files required mechanical LF/trailing-whitespace normalization in the isolated worktree. Their path list is stored in `baseline-normalized-whitespace.txt` in the protected backup.

## Commit result

The final commit changed 489 paths with 42,966 insertions and 23,476 deletions. The commit was amended once to include four design-token paths after the filename heuristic was proven false-positive. This is why the authoritative commit is `c18b3d89c38e28b47f46816326981720fb30e253`.

Local commit identity was supplied only to the commit command; global Git configuration was not changed.

## Install/build isolation proof

All dependency and build commands ran with cwd `/root/worktrees/allchemist-recovery-20260714-112717`, never `/root/synapse`.

- `npm ci --ignore-scripts --no-audit --no-fund`: exit 0.
- Lifecycle scripts: none found in inspected manifests.
- Root lock file: unchanged.
- Typechecks for design tokens, UI, AI assistant, and web: exit 0.
- Web build: exit 0.
- Generated `.next`, `node_modules`, and tsbuildinfo remained ignored and untracked.
- Final `git status --short -uall`: empty.

The build output was copied to `/root/allchemist-runtime/preview/releases/20260714-112717`; it was not copied into the production checkout.

## Final worktree state

`git worktree list` contains:

1. `/root/synapse` at `d3106a0df8bfe5da2fad87602c13fd9beeddedaa`.
2. `/root/worktrees/allchemist-recovery-20260714-112717` at `c18b3d89c38e28b47f46816326981720fb30e253`.

The isolated worktree is clean. No remote branch contains the baseline commit, confirming no push.
