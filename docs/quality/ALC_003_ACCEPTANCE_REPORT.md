# ALC-003 Acceptance Report

| # | Criterion | Status | Evidence |
|---:|---|---|---|
| 1 | Production checkout unchanged | PASS | final HEAD/status/path-hash comparison; no command wrote there |
| 2 | Production HEAD unchanged | PASS | `d3106a0df8bfe5da2fad87602c13fd9beeddedaa` |
| 3 | Preview 3010 not restarted | PASS | same PID 1603626 and deleted cwd; HTTP 200 |
| 4 | nginx/Docker/systemd/DNS unchanged | PASS | no mutation command; nginx active, backend/db healthy |
| 5 | New branch and worktree used | PASS | named normalization branch/worktree |
| 6 | Immutable baseline unchanged | PASS | HEAD `b7df195...`, clean |
| 7 | Backup preserved | PASS | authoritative `sha256sum-final.txt` 60/60 |
| 8 | Canonical `.gitignore` created/verified | PASS | scoped update and ignore probes |
| 9 | Read-only hygiene check exists | PASS | implementation inspection and repeated exit 0 |
| 10 | Generated output not tracked | PASS | 0 tracked violations; output ignored after build |
| 11 | Secrets/runtime user/security data not tracked | PASS | 0 path/signature violations; no payload values printed |
| 12 | Runtime paths separated or unresolved cases registered | PASS | Git separation enforced; consumer migration explicitly PARTIAL/BLOCKED with ALC-007/008 IDs |
| 13 | Legacy not deleted | PASS | 0 deleted paths; legacy content unchanged |
| 14 | Duplicates removed only with proof | PASS | 0 removed/consolidated; all 23 retained |
| 15 | Lockfile unchanged | PASS | stable SHA-256 `72c4fcd...` |
| 16 | Typechecks PASS | PASS | four required commands exit 0 in two worktrees |
| 17 | Web build PASS | PASS | Next build exit 0, BUILD_ID/standalone present |
| 18 | Clean-checkout reproduction PASS | PASS | final detached run initial/final status 0 |
| 19 | Build needs no production-only file | PASS | empty detached checkout install/build succeeded |
| 20 | `git diff --check` PASS | PASS | precommit and final checks |
| 21 | Normalization worktree clean after commit | PASS | required final verification after documentation commit |
| 22 | No push | PASS | local branch only; remote containment check remains zero |
| 23 | Master register updated | PASS | Markdown/JSON counts and affected statuses reconciled |
| 24 | G1 has honest status | PASS | G1 remains PARTIAL with exact remote/runtime gaps |
| 25 | Handoff contains failures/open issues | PASS | first EOL reproduction anomaly and all blockers recorded |

ALC-003 Ready: **YES**. This means the safe local normalization task met its acceptance criteria. It does not mean G1 is fully closed, the branch is remotely durable, runtime data is migrated, or production changes are authorized.
