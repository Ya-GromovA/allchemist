# ALC-003 Repository Normalization Report

## Scope and outcome

ALC-003 created `chore/alc-003-repository-normalization-20260714-140056` from exact source `b7df19563be5df99dcde1b50d091d2d5335afbe6` in `/root/worktrees/allchemist-normalization-20260714-140056`. Initial status was clean. Production and the immutable baseline were not modified.

The implementation changeset is commit `13e07a54589a42c0b70649b098dc883d80ed81ee` (`chore(repo): establish repository hygiene`). No push occurred.

## Performed

- updated `.gitignore` with scoped cache/test/temp output rules;
- created `.gitattributes` and `.editorconfig`;
- created read-only `tools/check-repository-hygiene.mjs`;
- added `check:repository-hygiene` to root `package.json`;
- normalized 19 proven non-launcher executable bits from `100755` to `100644`, with byte hashes unchanged;
- explicitly renormalized only `mobile/android/gradlew.bat` so the index is LF and its Windows working representation remains CRLF;
- installed locked dependencies and ran required checks/build in the target worktree;
- reproduced install/checks/build in a fresh detached checkout with zero initial/final status;
- classified all runtime consumers and all 23 duplicate groups without deleting or migrating anything.

## Not performed

- no runtime adapter/env contract, database schema, template or state file was changed;
- no duplicate was consolidated;
- no source/legacy/generated/production path was deleted;
- no dependency or lockfile was updated;
- no backend test was run against production state/database;
- no Playwright/production/`verify-ui-foundation`/deploy/infra command ran;
- no remote publication, merge, rebase, reset, clean, service restart or route switch occurred.

## Hygiene evidence

| Check | Before | After hygiene/build |
|---|---:|---:|
| tracked path count | 890 | 893 at hygiene commit |
| tracked generated-output violations | 0 | 0 |
| tracked runtime-state violations | 0 | 0 |
| tracked secret-filename violations | 0 | 0 |
| tracked database/dump violations | 0 | 0 |
| tracked log/temp violations | 0 | 0 |
| symlinks | 0 | 0 |
| case-only path conflicts | 0 | 0 |
| non-launchers incorrectly executable | 19 | 0 |

The count increases by three because `.gitattributes`, `.editorconfig`, and the hygiene tool are new tracked files; `.gitignore` and `package.json` were already tracked.

## Source-control findings

- The dedicated `gitleaks` executable is not installed and was not installed by this task.
- Path detectors and four signature detectors found no private-key, AWS access-key, GitHub token or OpenAI-style token match. Only path/class/status was emitted.
- One source asset exceeds 10 MiB: `mobile/assets/content/chemistry_molecules_layer_b_v1.json` at 14,341,981 bytes. It is preserved as source pending ALC-010 provenance/large-file policy; it is not generated trash.
- Repeated basenames such as `page.tsx`, `package.json`, `tsconfig.json` and Android density assets are path-qualified conventions, not filename collisions.
- Eleven executable launchers remain executable because they have shebangs or are the Gradle launcher.

## Rollback

Revert commit `13e07a5` in a non-production worktree. This restores prior metadata/config without touching runtime state. No production rollback is required because production was not changed.

## Remaining risk

G1 is `PARTIAL`: the clean local branch reproduces, but approved remote durability was prohibited and mutable-state consumers still require ALC-007/008 decisions. Production remains dirty and preview 3010 still runs from a deleted cwd.
