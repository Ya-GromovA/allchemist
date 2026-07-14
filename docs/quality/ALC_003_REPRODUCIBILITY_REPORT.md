# ALC-003 Reproducibility Report

## Environment and lock

- Normalization worktree: `/root/worktrees/allchemist-normalization-20260714-140056`
- Reproduced source commit: `13e07a54589a42c0b70649b098dc883d80ed81ee`
- Lock SHA-256 before/after every install/build: `72c4fcd10592add46c59b8cfed418cb743fb4dee74bd61b2de0c51160eda2326`
- Installed dependencies: 91 packages with lifecycle scripts disabled.
- Build resolved Next.js 16.2.10 from the existing lockfile.

## Normalization worktree commands

| Command | Exit | Result / writes |
|---|---:|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | 0 | isolated `node_modules`; lock unchanged |
| `npm run check:repository-hygiene` | 0 | PASS, 0 violations; read-only |
| `npm run typecheck:tokens` | 0 | PASS |
| `npm run typecheck:ui` | 0 | PASS |
| `npm run typecheck:ai-assistant` | 0 | PASS |
| `npm run typecheck:web` | 0 | PASS; ignored tsbuildinfo may be written |
| `npm run build:web` | 0 | PASS; isolated `.next`, BUILD_ID and standalone entry present |

Backend tests, migrations, Playwright, `verify-ui-foundation.mjs`, deploy and infrastructure mutations were not run.

## First clean-checkout attempt and correction

The first detached checkout `/root/worktrees/allchemist-alc003-repro-20260714-140930` built successfully, but initial and final tracked status each showed one modified path: `mobile/android/gradlew.bat`. Diagnosis in `/root/worktrees/allchemist-alc003-diagnose-*` proved an index/attribute EOL mismatch. This attempt was not accepted as PASS.

The fix was restricted to explicit `git add --renormalize -- mobile/android/gradlew.bat`. The index now reports `i/lf`, the working file `w/crlf`, and the attribute `text eol=crlf`; diff ignoring EOL is empty. No other path was renormalized.

## Final clean-checkout reproduction

- Temporary path: `/root/worktrees/allchemist-alc003-repro-20260714-141119`
- Mode: detached worktree from commit `13e07a5`
- Initial status: 0
- Initial `node_modules`: absent
- Initial `.next`: absent
- Tracked runtime state: no

The same install, hygiene, four typechecks and web build all exited 0. Final evidence:

- lock unchanged: YES;
- BUILD_ID: present;
- standalone entry: `apps/web/.next/standalone/apps/web/server.js`;
- tracked diff count: 0;
- index diff count: 0;
- status count: 0;
- ignored output only: `node_modules/`, `apps/web/.next/`, `apps/web/tsconfig.tsbuildinfo`;
- hidden dependency on `/root/synapse`: none detected for the required web build;
- temporary worktree removed: YES.

Final clean-checkout reproduction: **PASS**.
