# ALC-004A Preview Replacement Acceptance

Validation date: 2026-07-17 (Europe/Moscow)

| Check | Result | Evidence |
| --- | --- | --- |
| Exact source commit | PASS | 32aef1ecc8f49cc21436954cbd479205450fa1bc |
| Isolated task worktree | PASS | Created from exact source commit |
| Production checkout unchanged | PASS | Existing branch and dirty counts retained |
| Legacy 3010 untouched | PASS | PID 1603626 and HTTP 200 throughout |
| Port 3011 initially free | PASS | No listener before installation |
| Source artifact integrity | PASS | 1399/1399 checksums |
| Runtime artifact integrity | PASS | 1399/1399 checksums |
| BUILD_ID | PASS | Root and nested files match |
| Unprivileged runtime user | PASS | Dedicated system account with nologin |
| Protected environment | PASS | 0640 root:allchemist-preview |
| systemd verification | PASS | Target unit had no verification error |
| Cold start | PASS | Loopback HTTP 200 |
| Required routes | PASS | 9/9 returned HTTP 200 |
| JS/CSS assets | PASS | All discovered assets returned HTTP 200 |
| HTTP 500 count | PASS | 0 |
| Missing asset count | PASS | 0 |
| Restart test | PASS | PID changed and health passed |
| Rollback rehearsal | PASS | 3011 restored; 3010 remained available |
| Health tool | PASS | Script exited 0 |
| Public route switch | PASS | Not performed |
| nginx, DNS, TLS | PASS | Not changed |
| Build, migration, database | PASS | Not performed |

systemd-analyze verify also reported pre-existing warnings in snapd.service and
allchemist-web-preview.service. Neither concerns the new target unit.

Smoke routes:

- /
- /dashboard/student
- /modules
- /modules/chemistry
- /modules/chemistry/lab/zinc-hcl
- /modules/physics
- /modules/biology
- /design-preview/student-dashboard
- /design-preview/platform-structure

G3 is PARTIAL. preview.allchemist.ru is not routed to 3011, access protection is
not configured, and legacy 3010 has not been retired. ALC-004B is required.
