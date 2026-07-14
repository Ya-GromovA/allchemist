# ALC-003 Handoff Report

=== CODEX ALC-003 HANDOFF ===

## 1. Summary

Safe local normalization completed. A clean branch and worktree reproduce locked install, hygiene, required typechecks and web build. Production was not changed. G1 remains PARTIAL because push was prohibited and runtime consumers still require G5/G6 decisions.

## 2. Preflight

- production: `/root/synapse`, branch `figma-full-ui-migration-20260602`, HEAD `d3106a0...`, 34 modified + 1375 untracked;
- immutable baseline: `/root/worktrees/allchemist-recovery-20260714-112717`, HEAD `b7df195...`, clean;
- backup: final manifest 60/60 PASS, mode 700;
- artifact: 1399/1399 PASS, BUILD_ID and `apps/web/server.js` present;
- preview 3010: PID 1603626, deleted cwd, HTTP 200; nginx active; backend/db healthy.

## 3. Normalization branch/worktree

- branch: `chore/alc-003-repository-normalization-20260714-140056`;
- path: `/root/worktrees/allchemist-normalization-20260714-140056`;
- source commit: `b7df19563be5df99dcde1b50d091d2d5335afbe6`;
- initial status: clean.

## 4. Changeset plan

- planned/performed: repository metadata, read-only checker, package script, mode/EOL normalization, reports;
- deferred: runtime consumer migration, duplicate consolidation, remote publication;
- prohibited/no change: production, baseline, services, DB, infra, legacy, dependencies/lock.

## 5. Repository hygiene

- `.gitignore`: scoped generated/cache/test/runtime/secret rules;
- `.gitattributes`: LF text, Windows command CRLF, binary classes;
- check tool: read-only, exit nonzero on violation;
- tracked violations before/after: 0/0;
- 19 accidental executable bits corrected; one Windows batch index EOL corrected.

## 6. Runtime data separation

- files analyzed: user state, alerts acknowledgements, backup history/status, go/no-go, handover, mobile smoke, APK pointer, DB/content fallbacks;
- consumers: user-state store, admin service/endpoints/tests, content read-only endpoint and release tools;
- paths/config introduced: none;
- files removed from Git representation: 0 (already untracked in baseline);
- templates/schemas: none invented;
- deferred migrations: ALC-007/008, G5/G6.

## 7. Generated output

- excluded: dependencies, `.next`, dist/build, coverage, caches, tsbuildinfo, logs, test reports, artifacts, runtime state, dumps, secrets;
- remaining issue: dirty production output/history untouched by design.

## 8. Duplicate resolution

- total: 23 groups / 54 files;
- consolidated: 0;
- preserved: 23 / 54;
- follow-ups: `ALC-006-DUP-*`, `ALC-009-DUP-*`, `ALC-010-DUP-*`, `ALC-011-DUP-21`.

## 9. Target layout and ownership

No mass move. Current backend/mobile and active legacy paths stay canonical; target apps/packages remain parallel. CODEOWNERS not created because named owners are unapproved.

## 10. Secret/source-control checks

- result: PASS for tracked path and four signature detectors; no secret values printed;
- dedicated gitleaks: not installed and not installed by task;
- symlinks/case conflicts: 0/0;
- oversized: one 14,341,981-byte content JSON, preserved for ALC-010 review.

## 11. Dependency install

- command: `npm ci --ignore-scripts --no-audit --no-fund`;
- exit code: 0 in normalization and final clean checkout;
- lock-file: unchanged SHA-256 `72c4fcd...`.

## 12. Typecheck/test/build

- `npm run check:repository-hygiene`: 0;
- `npm run typecheck:tokens`: 0;
- `npm run typecheck:ui`: 0;
- `npm run typecheck:ai-assistant`: 0;
- `npm run typecheck:web`: 0;
- `npm run build:web`: 0;
- backend/production/Playwright/migration/deploy tests: not run by policy.

## 13. Clean-checkout reproduction

- accepted temp path: `/root/worktrees/allchemist-alc003-repro-20260714-141119`;
- commands: locked install, hygiene, four typechecks, web build;
- build: PASS, BUILD_ID and standalone entry present;
- missing hidden dependencies: none for required web build;
- final status/diffs: 0/0;
- cleanup: only temp worktree removed, YES;
- recorded failed attempt: earlier checkout exposed `gradlew.bat` EOL mismatch; corrected explicitly and rerun.

## 14. Remediation register

- resolved: 3 total (`ALC-RM-002`, `006`, `038`);
- partial: 2 (`ALC-RM-004`, `005`);
- open: 26;
- needs verification: 9.

## 15. Gate G1 CLEAN_REPOSITORY

**PARTIAL**. Local tracked source, hygiene, duplicate classification, secret scan and clean reproduction pass. Approved remote publication and complete runtime-consumer separation do not.

## 16. Reports created/updated

Seven required ALC-003 reports plus target-layout, ownership, legacy map, cleanup inspection, command registry, master register, gates and roadmap.

## 17. Local commits

- branch: normalization branch above;
- `13e07a54589a42c0b70649b098dc883d80ed81ee` — `chore(repo): establish repository hygiene`;
- documentation commit: `docs(architecture): record repository normalization` (self-containing report; final hash is reported by `git log`/external handoff);
- runtime/duplicate commits: not created because no authorized source change existed;
- push: NO.

## 18. Production checkout

- unchanged: YES;
- HEAD: `d3106a0df8bfe5da2fad87602c13fd9beeddedaa`;
- status summary: 1409 paths (34 modified, 1375 untracked);
- tracked path hash (NUL `git ls-files` stream): `d1fda71dfd06cea806a03c290a7505a670cf01b431054478bbe36c9866a7c627`.

## 19. Immutable baseline

- unchanged: YES;
- HEAD: `b7df19563be5df99dcde1b50d091d2d5335afbe6`;
- clean: YES.

## 20. Normalization worktree

- final status: required to be empty after documentation commit;
- clean: YES after final verification.

## 21. Preview 3010

- unchanged: YES; same PID/deleted cwd/HTTP 200. It was not restarted.

## 22. Blockers

- no approved remote publication/durable independent remote clone;
- production checkout remains dirty;
- runtime/security/history consumers need approved store/env/ACL/migration/restore decisions;
- preview deleted-cwd P0 remains;
- legacy admin syntax P0 remains;
- oversized/provenance and design-reference gaps remain.

## 23. Recommended next task

ALC-004 — permanent restart-safe preview service recovery using the already verified immutable artifact and a separately approved operations/rollback plan.

## 24. Ready for ALC-004

YES, conditionally: use the recovered immutable artifact, do not build in production or switch public routes, and obtain explicit operations authorization with rollback.

## 25. Ready to start parallel ALC-005/006/007

YES with exact conditions: separate worktrees/branches and owners; ALC-005 only focused legacy-admin repair plus rollback; ALC-006 only tool/CI paths and isolated output; ALC-007 read-only sensitive evidence with no payload/secret disclosure or provisioning.

## 26. Ready for production changes

NO.

=== END HANDOFF ===
