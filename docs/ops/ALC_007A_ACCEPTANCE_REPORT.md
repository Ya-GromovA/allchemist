# ALC-007A acceptance report

PASS requires: repository root not world-writable; 8000/5433 loopback-only; SSH plus public 80/443 healthy; backend/PostgreSQL healthy; 3010 retired or safely contained; 3011 healthy; no DB writes or secrets; verified rollback; six stable checkpoints; clean published worktree. Runtime gates passed; final Git/publication gates are recorded in the handoff.

## Final acceptance evidence

Date: 2026-07-20. The product owner manually opened `https://preview.allchemist.ru` in a normal Google Chrome incognito window, received the Basic Auth dialog, entered the existing credentials, and confirmed that the protected preview opened successfully. Classification: **OWNER_MANUAL_AUTH_ACCEPTANCE — PASS**. This owner acceptance replaces automated credentialed-browser validation only for ALC-007A documentation completion. Codex did not request, read, receive, or store credentials, cookies, browser profiles, password-manager data, clipboard contents, or htpasswd hashes. Browser automation was not performed in P1C.

Non-credentialled checks passed: HTTP-to-HTTPS redirect, unauthenticated HTTPS 401, valid TLS, nginx configuration, loopback 3011 HTTP 200, zero active 3010 references/listener, healthy backend/PostgreSQL, active firewall, and no public reachability on 8000/5433/3010/3011. Publication and runtime acceptance gates are PASS. ALC-008 may begin under its own scope; production feature deployment remains prohibited.
