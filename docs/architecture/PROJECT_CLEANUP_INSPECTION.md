# Project Cleanup Inspection

Task: ALC-003
Date: 2026-07-14
Worktree: `/root/worktrees/allchemist-normalization-20260714-140056`

## Result

No source, legacy, runtime state, duplicate, approved reference, fixture, migration, contract, or production file was deleted. The baseline already had zero tracked paths matching the prohibited generated/runtime/secret path classes. ALC-003 added enforceable ignore/attribute/editor rules, a read-only hygiene check, and corrected only source-control metadata that was proven accidental.

| Inspection | Evidence | Result | Disposition |
|---|---|---|---|
| Tracked generated output | `git ls-files` path classifier | 0 violations before and after | enforce with `check:repository-hygiene` |
| Tracked runtime/user/security paths | explicit `backend/data`, backup, APK pointer and DB patterns | 0 | consumers documented; migration deferred ALC-007/008 |
| Tracked secret filenames | env/key/certificate/credential/cookie/token filename classes | 0 | path check PASS |
| Secret signatures | private-key, AWS, GitHub and OpenAI-style signatures; path-only output | 0 matches | PASS with limitation: dedicated `gitleaks` binary not installed |
| Duplicate inventory | protected 474-path candidate lists plus SHA-256 | 23 non-empty groups / 54 files | 0 consolidated; all retained with follow-up IDs |
| Case-only conflicts | lower-cased full tracked path comparison | 0 | PASS |
| Symlinks | Git mode `120000` | 0 | PASS |
| Oversized tracked source | size threshold 10 MiB | 1: `mobile/assets/content/chemistry_molecules_layer_b_v1.json`, 14,341,981 bytes | preserve; ALC-RM-040/ALC-010 review |
| Executable metadata | Git mode `100755` plus shebang/file-type inspection | 30 before; 11 legitimate launchers after | 19 non-launchers normalized to `100644`, bytes unchanged |
| Line endings | tracked text scan and `git ls-files --eol` | one platform CRLF file | `gradlew.bat` normalized in index, CRLF working-tree contract retained |
| Filename collisions | case-folded full paths and duplicate basenames | no case/path collision; repeated basenames are path-qualified app/package conventions | no rename |
| Dirty generated files after build | normal status plus ignored status | only ignored `node_modules`, `.next`, `tsconfig.tsbuildinfo` | PASS |

## Repository policy changes

- `.gitignore` now covers additional caches, Playwright/test reports and disposable temporary extensions without hiding approved goldens or source-owned assets.
- `.gitattributes` defines LF-normalized text, CRLF Windows command working copies and binary asset classes.
- `.editorconfig` mirrors the safe encoding/line-ending rules without imposing a new indentation policy.
- `tools/check-repository-hygiene.mjs` reads Git paths, ignore decisions and directory names only. It does not build, delete, edit, start services, access a database, or read secret/runtime payloads.
- `package.json` exposes the checker as `check:repository-hygiene`; `package-lock.json` is unchanged.

## Protected boundaries

Production `/root/synapse`, immutable baseline, backup, recovered artifact, live preview, nginx, systemd, Docker, DNS, PostgreSQL and every legacy path remained outside the mutation scope.

## Historical pre-baseline inspection (preserved)

The prior tracked version of this document was a UI-PROD-1 inspection. Its observations are retained here as historical evidence, not presented as current ALC-003 state.

### Definitely used at that time

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/components/approved/ApprovedAiAssistantWidget.tsx`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `apps/web/public/design-assets/student-dashboard/**`
- `tools/playwright-approved-ui-smoke.mjs`
- `packages/ui/**`, `packages/design-tokens/**`, `packages/ai-assistant/**`

### Probably used at that time

- `apps/web/app/**`
- `apps/web/public/design-preview/student-dashboard/**`
- content/science/subject core packages
- student-dashboard and visual-parity check tools

### Legacy/pre-existing at that time

- `backend/app/web_admin/**`, `backend/app/web_public/**`, API/services and `mobile/**`

The historical report also recorded duplicate milestone screenshots/check scripts/public images and warned that `apps`, `packages`, docs, artifacts, root manifests and tools were then largely untracked. ALC-001/002 subsequently attributed and committed the source classes while keeping generated artifacts out of Git. Its “safe cleanup candidates” were never deletion authorization; ALC-003 deleted none of them.
