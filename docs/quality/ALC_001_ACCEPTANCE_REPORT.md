# ALC-001 Acceptance Report

Date: 2026-07-14 (Europe/Moscow)

## Verdict

ALC-001 Ready: **YES**
Ready for architecture planning: **YES**
Ready for preview service switch: **NO**

## Acceptance matrix

| # | Criterion | Result | Evidence |
|---:|---|---|---|
| 1 | Protected backup created | PASS | `/root/backups/allchemist/ALC-001/20260714-112717`, mode `0700` |
| 2 | Backup manifest and hashes verified | PASS | final manifest 60/60 OK, 0 failed; all files mode `0600` |
| 3 | Production checkout not cleaned | PASS | no reset/clean/deletion; original dirty paths retained |
| 4 | Existing preview 3010 not restarted | PASS | PID `1603626` unchanged |
| 5 | Production nginx unchanged | PASS | read-only inspection only; nginx active |
| 6 | Production services unchanged | PASS | backend/PostgreSQL remain healthy; no restart command used |
| 7 | Isolated worktree created | PASS | `/root/worktrees/allchemist-recovery-20260714-112717` |
| 8 | Separate local baseline branch created | PASS | `baseline/allchemist-recovery-20260714-112717` |
| 9 | Local baseline commit created | PASS | `c18b3d89c38e28b47f46816326981720fb30e253` |
| 10 | No push | PASS | zero remote branches contain commit; no push command used |
| 11 | No build/cache/runtime/secrets in baseline | PASS | banned-tree scan count 0 |
| 12 | Unknown files quarantined | PASS | classification found 0 unknown paths; empty quarantine inventory retained |
| 13 | npm commands classified | PASS | `COMMAND_SIDE_EFFECT_REGISTRY.md` created before npm execution |
| 14 | Build only in isolated worktree | PASS | build cwd `/root/worktrees/allchemist-recovery-20260714-112717`; production `.next` not rebuilt |
| 15 | Artifact contains BUILD_ID and startup entry | PASS | matching BUILD_ID plus `apps/web/server.js` |
| 16 | Cold start on 3011 | PASS | final temporary PID `3657490`, Next ready, root HTTP 200 |
| 17 | Smoke on 3011 | PASS | 9/9 routes and 12/12 referenced static assets OK |
| 18 | Temporary 3011 process stopped | PASS | PID absent and port 3011 free |
| 19 | 3010 and production unchanged | PASS | PID unchanged; production endpoints/services remain available |
| 20 | Git diff check passed | PASS | `git diff --check` exit 0 before commit |
| 21 | Errors and limitations disclosed | PASS | harness failures, missing references, dirty production, deleted cwd, and non-switched artifact documented |

## Supporting checks

- Backup size: 22 MiB; 66 files; directory `0700`; no file outside `0600`.
- Final possible-secret count: 0 after protected review of four false-positive design-token paths.
- Unknown/quarantined count: 0.
- Baseline worktree status: clean.
- Remote publication: none.
- Lock file: unchanged.
- Typecheck commands: 4/4 passed.
- Web build: passed.
- Artifact checksum: 1399/1399.
- Final smoke: no 500, no missing referenced JS/CSS, no detected mojibake.

## Limitations that do not block architecture planning

1. The recovered artifact is not active; the existing 3010 process still runs from a deleted cwd.
2. The baseline branch and commit are local only.
3. Seven approved golden references remain missing.
4. Legacy admin JavaScript retains its ALC-000 syntax failure.
5. Backend tests and migrations were intentionally not run.
6. Production checkout remains dirty by design and must not be cleaned or used for builds.

## Next gate

Proceed to `ALC-002 — TARGET ARCHITECTURE PLAN AND MIGRATION GATES`.

Any preview activation must be a separate explicitly approved task with rollback and production-change authorization.
