# ALC-007A handoff report

Sanitized reusable evidence for production containment. Operational backup and observation remain root-only outside Git. Canonical Compose bindings are loopback-only. Use `tools/verify-p0-containment.sh` for read-only runtime verification. See the sibling network, permission, firewall, legacy retirement, rollback and acceptance reports.

## Publication recovery and owner acceptance

Date: 2026-07-20. The product owner manually opened `https://preview.allchemist.ru` in a normal Google Chrome incognito window, received the Basic Auth dialog, entered the existing credentials, and confirmed that the protected preview opened successfully. Classification: **OWNER_MANUAL_AUTH_ACCEPTANCE — PASS**. This owner acceptance replaces automated credentialed-browser validation only for ALC-007A documentation completion. Codex did not request, read, receive, or store credentials, cookies, browser profiles, password-manager data, clipboard contents, or htpasswd hashes. Browser automation was not performed in P1C.

GitHub SSH deploy-key authentication and initial branch publication passed. The prior invalid-token blocker is resolved. Runtime containment remained stable; production changes during recovery: none; restart/reload: none; database writes: 0.
