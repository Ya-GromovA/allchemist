# Repository Cleanup Plan

Task: ALC-002. This is a plan, not deletion authority.

## Action vocabulary

| Action | Meaning |
|---|---|
| KEEP_AND_TRACK | Product source, contracts, tests, docs, or required versioned assets |
| KEEP_OUTSIDE_GIT | Reproducible dependencies/cache/output owned by a workspace |
| MOVE_TO_RUNTIME_STORAGE | Mutable non-secret application/operations state |
| MOVE_TO_SECURE_STORAGE | Secrets or security-sensitive durable material |
| MOVE_TO_BACKUP | Historical snapshot retained with checksum/retention |
| REGENERATE | Delete only in disposable workspace and recreate from source |
| CONSOLIDATE | Replace duplicates only after consumer and parity proof |
| QUARANTINE | Preserve without use until classification is approved |
| SAFE_TO_DELETE_AFTER_GATE | Eligible only after named gate and retention check |
| KEEP_LEGACY_UNTIL_MIGRATION | Active behavioral reference and rollback path |
| DO_NOT_TOUCH | Production/runtime/security boundary without explicit task authority |

## File-class decisions

| Class | Current examples | Planned action | Required gate / proof |
|---|---|---|---|
| Tracked product source | `backend/app`, `mobile`, selected tools/tests | KEEP_AND_TRACK | G1 ownership and clean-clone proof |
| Recovered target source | `apps`, `packages`, `content` | KEEP_AND_TRACK | G1 review and approved publication |
| Generated `.next` | per-app `.next`; production incomplete tree | REGENERATE / KEEP_OUTSIDE_GIT | G2 clean build; G3 immutable release |
| `node_modules` | root, mobile, package-local | REGENERATE / KEEP_OUTSIDE_GIT | lockfile/lifecycle verification |
| tsbuildinfo | app/package incremental metadata | REGENERATE / KEEP_OUTSIDE_GIT | G2 output contract |
| Screenshots/test artifacts | `artifacts`, Playwright output | KEEP_OUTSIDE_GIT or MOVE_TO_BACKUP | retention/provenance policy; never substitute for approved golden |
| Runtime JSON | backend state/status/history | MOVE_TO_RUNTIME_STORAGE | G5 migration and rollback |
| Security state | acknowledgements, handover/go-no-go history | MOVE_TO_SECURE_STORAGE | G6 classification, ACL, audit, retention |
| User state | `backend/data/user_state.json` | MOVE_TO_RUNTIME_STORAGE, candidate PostgreSQL | G5 parity and restore rehearsal |
| Content pack source | versioned learning JSON | KEEP_AND_TRACK | content provenance and QA |
| Mutable content pack pointer | `allchemist-apk-latest.json` | MOVE_TO_RUNTIME_STORAGE or versioned object storage | G5/G7 release metadata ADR |
| Media assets | web/mobile/legacy images/icons | KEEP_AND_TRACK when sourced; QUARANTINE when provenance missing | G8 manifest/provenance |
| Legacy public/admin | `backend/app/web_public`, `web_admin` | KEEP_LEGACY_UNTIL_MIGRATION | G10 parity, E2E, rollback, product approval |
| Next web/admin | `apps/web`, `apps/admin` | KEEP_AND_TRACK | G7 ownership; G9 readiness |
| Mobile | `mobile` | KEEP_AND_TRACK; generated platform output outside Git | G7 offline/storage decision |
| Tools | `tools` | KEEP_AND_TRACK after side-effect classification | G2 command contract |
| Infra templates | `infra`, repository examples | KEEP_AND_TRACK as desired-state source only | G7 owner approval; never auto-apply |
| Protected backups | `/root/backups/allchemist` | MOVE_TO_BACKUP / DO_NOT_TOUCH | retention and restore proof |
| Logs | app/build/smoke logs | KEEP_OUTSIDE_GIT; MOVE_TO_BACKUP if evidence | retention/redaction decision |
| Duplicated files | 23 groups / 54 files | CONSOLIDATE only after group-specific verification | G1 and named consumer tests |
| Unknown files | current inventory empty | QUARANTINE | classification and owner approval |

No source, legacy, duplicate, runtime JSON, generated output, or production file is deleted in ALC-002.

## Staged cleanup sequence

1. Freeze and hash production evidence; continue read-only use.
2. Review and publish the local baseline through ALC-003.
3. Prove a clean clone contains source but no runtime/generated/secret paths.
4. Create output roots for dependency, build, test, release, and runtime classes.
5. Move runtime state only through ALC-007/008 plans with dual-read or export/restore rollback.
6. Consolidate duplicates group by group after consumer tests.
7. Mark generated output `SAFE_TO_DELETE_AFTER_GATE` only in disposable workspaces.
8. Retain legacy until G10 and separate product approval.

## Duplicate inventory

The inventory hashes the 446 ALC-001 untracked candidates and excludes the separate group of three zero-byte `.gitkeep` placeholders. This reproduces the authoritative 23 groups / 54 files.

| Group | Files | Canonical candidate | Known/expected consumers | Consolidation decision |
|---|---|---|---|---|
| DUP-01 | `apps/admin/next-env.d.ts`; `apps/web/next-env.d.ts` | none; generated per app | Next/TypeScript | REGENERATE per app; do not share |
| DUP-02 | admin and web `next.config.mjs` | no candidate until config ADR | Next build for each app | Keep separate; verify future shared factory in ALC-006 |
| DUP-03 | shared `bell.svg`; student-dashboard clean `bell.svg` | shared icon candidate | dashboard asset manifest/components | Verify paths and visual parity before consolidation |
| DUP-04 | shared `calendar.svg`; clean `calendar.svg` | shared icon candidate | dashboard asset manifest/components | Same as DUP-03 |
| DUP-05 | shared `close.svg`; clean `close.svg` | shared icon candidate | dashboard shell/dialog states | Same as DUP-03 |
| DUP-06 | shared `lock.svg`; clean `lock.svg` | shared icon candidate | locked module cards | Same as DUP-03 |
| DUP-07 | shared and clean `profile-placeholder.svg` | shared icon candidate | profile/avatar fallback | Same as DUP-03 |
| DUP-08 | shared and clean `repeat.svg` | shared icon candidate | repeat/retry UI | Same as DUP-03 |
| DUP-09 | shared and clean `search.svg` | shared icon candidate | navigation/search UI | Same as DUP-03 |
| DUP-10 | assistant `robot-temporary.png`; preview `assistant-robot.png` | undecided; both temporary/reference classes | AI widget and preview | Keep; provenance and approved AI reference required in ALC-010 |
| DUP-11 | chemistry hero temporary; preview `continue-visual.png` | product asset candidate undecided | dashboard continue card/preview | Keep; consumer and provenance verification |
| DUP-12 | Newton temporary; preview `lesson-visual.png` | product asset candidate undecided | live lesson card/preview | Keep; consumer and provenance verification |
| DUP-13 | locked anatomy temporary; preview `anatomy-preview.png` | product asset candidate undecided | locked anatomy card/preview | Keep; consumer and provenance verification |
| DUP-14 | biology thumbnail temporary; preview `popular-biology.png` | product asset candidate undecided | popular module card/preview | Keep; consumer and provenance verification |
| DUP-15 | chemistry thumbnail temporary; preview `popular-chemistry.png` | product asset candidate undecided | popular module card/preview | Keep; consumer and provenance verification |
| DUP-16 | physics thumbnail temporary; preview `popular-physics.png` | product asset candidate undecided | popular module card/preview | Keep; consumer and provenance verification |
| DUP-17 | `approved-student-dashboard.png`; `golden-approved-web-student-dashboard.png` | manifest-declared `golden-approved-web-student-dashboard.png` | approved-reference checker and preview routes | Keep both until all references/consumers use canonical golden |
| DUP-18 | legacy and mobile `alchemist-hero.png` | no cross-runtime candidate yet | legacy public bundle; mobile bundle | Separate deployment copies may be required; verify packaging |
| DUP-19 | legacy `fon-2.png`, legacy `main-bg-science.png`, mobile `main-bg-science.png` | undecided | legacy and mobile backgrounds | Keep all; decide naming/provenance and packaging |
| DUP-20 | legacy and mobile periodic-table reference PNG | source asset candidate undecided | legacy periodic table; mobile assets | Keep both until package asset boundary exists |
| DUP-21 | two identical student-dashboard readiness reports | production-readiness report candidate | documentation links/history | Documentation owner chooses canonical; preserve history |
| DUP-22 | nine identical package `tsconfig.json` files | future shared package tsconfig candidate | package typechecks | Keep per package until ALC-006 shared config decision |
| DUP-23 | biology-core and physics-core `src/index.ts` | no consolidation; separate bounded contexts | subject package imports | Identical content does not imply shared ownership; keep |

Full paths and SHA-256 values can be regenerated from the protected ALC-001 candidate inventories. No duplicate is `SAFE_TO_DELETE_AFTER_GATE` until its consumers, packaging path, provenance, and rollback are recorded.

## Future `.gitignore` recommendations

Current baseline rules already cover dependencies, `.next`, tsbuildinfo, runtime data, artifacts, logs, databases, archives, secrets, and mobile build output. ALC-002 does not modify `.gitignore`.

ALC-003 should verify before changing it:

- every ignored path is already attributed;
- no source is hidden by a broad directory rule;
- generated approved-reference derivatives and canonical goldens have distinct rules;
- release manifests have a versioned source versus mutable pointer distinction;
- runtime-state ignores are paired with documented external storage and restore.

## Delete policy

`SAFE_TO_DELETE_AFTER_GATE` applies only when all are true:

1. canonical replacement and consumers are verified;
2. backup/retention requirement is satisfied;
3. clean build/test/smoke passes;
4. rollback is rehearsed;
5. owner approval is recorded;
6. the deletion occurs outside production checkout unless a separately approved cutover task explicitly authorizes it.
