# ALC-007A legacy 3010 retirement report

PID 1603626 ran as root under enabled `allchemist-web-preview.service` from a deleted checkout artifact. Active nginx had zero 3010 references and used only 3011. Canonical 3011 was enabled/active; nine routes and nine referenced JS/CSS assets returned 200 locally; TLS verified and public unauthenticated access returned 401. The obsolete unit was stopped/disabled and 3010 became unbound. Rollback relies on 3011 and must not restart the deleted-cwd artifact. Verdict: PASS.
