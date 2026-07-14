# ALC-003 Duplicate Resolution Report

## Result

The protected `baseline-add-paths.list0` and `reclassified-add-paths.list0` produce 474 unique existing candidates. SHA-256 grouping reproduces exactly **23 non-empty groups / 54 files**; the separate zero-byte placeholder group is excluded. Consolidated: **0**. Deleted: **0**. Preserved: **23 groups / 54 files**.

Identical bytes prove duplication only. They do not prove canonical ownership, import/package behavior, approved-reference authority, asset license/provenance or safe legacy removal.

| Group | SHA-256 prefix | Files / consumer boundary | Decision | Follow-up task ID |
|---|---|---|---|---|
| DUP-01 | `7b550dda9686` | admin/web `next-env.d.ts`; per-app Next generated contract | preserve per app | `ALC-006-DUP-01` |
| DUP-02 | `aebe8e1ffdbc` | admin/web `next.config.mjs`; independent build consumers | preserve | `ALC-006-DUP-02` |
| DUP-03 | `5c6722302617` | shared/clean `bell.svg`; dashboard manifests/components | preserve pending canonical asset proof | `ALC-010-DUP-03` |
| DUP-04 | `544a1f7a1c4b` | shared/clean `calendar.svg` | preserve | `ALC-010-DUP-04` |
| DUP-05 | `1ed7509d3441` | shared/clean `close.svg` | preserve | `ALC-010-DUP-05` |
| DUP-06 | `3903b8393610` | shared/clean `lock.svg` | preserve | `ALC-010-DUP-06` |
| DUP-07 | `66b934f58152` | shared/clean `profile-placeholder.svg` | preserve | `ALC-010-DUP-07` |
| DUP-08 | `4c010479b6ad` | shared/clean `repeat.svg` | preserve | `ALC-010-DUP-08` |
| DUP-09 | `bdfffd2f544e` | shared/clean `search.svg` | preserve | `ALC-010-DUP-09` |
| DUP-10 | `a9874b63b4d9` | temporary assistant robot / preview robot | preserve; temporary/reference classes differ | `ALC-010-DUP-10` |
| DUP-11 | `b7f70a746b63` | temporary chemistry hero / continue visual | preserve | `ALC-010-DUP-11` |
| DUP-12 | `aa66cfc39209` | temporary Newton / lesson visual | preserve | `ALC-010-DUP-12` |
| DUP-13 | `d855bfc1655f` | temporary locked anatomy / preview anatomy | preserve | `ALC-010-DUP-13` |
| DUP-14 | `97457d965f68` | temporary biology thumbnail / preview card | preserve | `ALC-010-DUP-14` |
| DUP-15 | `0f6a700941e5` | temporary chemistry thumbnail / preview card | preserve | `ALC-010-DUP-15` |
| DUP-16 | `2dcb1ba78d36` | temporary physics thumbnail / preview card | preserve | `ALC-010-DUP-16` |
| DUP-17 | `32f4b7788bcd` | approved dashboard PNG / manifest-declared golden | preserve both until manifest consumers and provenance converge | `ALC-010-DUP-17` |
| DUP-18 | `8a1cbda25cf6` | legacy/mobile `alchemist-hero.png`; separate bundles | preserve packaging copies | `ALC-009-DUP-18` |
| DUP-19 | `b5be450dc0d9` | two legacy backgrounds plus mobile background | preserve three packaging copies | `ALC-009-DUP-19` |
| DUP-20 | `f8d3f8f70f3a` | legacy/mobile periodic-table reference | preserve | `ALC-009-DUP-20` |
| DUP-21 | `fb04187a288a` | two readiness reports; history/link consumers unknown | preserve documentation history | `ALC-011-DUP-21` |
| DUP-22 | `94c29f79eb8a` | nine package `tsconfig.json`; independent typecheck roots | preserve until shared-config decision | `ALC-006-DUP-22` |
| DUP-23 | `af6c2cb2a522` | biology/physics `src/index.ts`; separate bounded contexts | preserve intentionally | `ALC-009-DUP-23` |

## Consumer/provenance findings

- DUP-01/02/22 are consumed implicitly by independent Next/TypeScript workspace commands; sharing them is a toolchain decision, not cleanup.
- DUP-03 through DUP-17 are referenced by asset manifests/components or belong to temporary/preview/approved classes. The repository does not prove complete provenance/license parity.
- DUP-18 through DUP-20 cross legacy/mobile packaging boundaries. Legacy remains active, so cross-runtime copies cannot be deleted.
- DUP-21 may carry historical meaning even though bytes match.
- DUP-23 has intentionally separate domain ownership; identical barrel exports are not a shared implementation.

No group satisfied all six consolidation conditions from ALC-003. Rollback is therefore trivial: no consumer, path or byte changed.
