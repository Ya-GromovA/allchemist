# Project Cleanup Inspection

Inspection only. No files were deleted, renamed, reset, or cleaned.

## Definitely Used

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/components/approved/ApprovedAiAssistantWidget.tsx`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `apps/web/public/design-assets/student-dashboard/**`
- `tools/playwright-approved-ui-smoke.mjs`
- `packages/ui/**`
- `packages/design-tokens/**`
- `packages/ai-assistant/**`

## Probably Used

- `apps/web/app/**`
- `apps/web/public/design-preview/student-dashboard/**`
- `packages/content-core/**`
- `packages/science-core/**`
- `packages/chemistry-core/**`
- `packages/physics-core/**`
- `packages/biology-core/**`
- `tools/check-student-dashboard-*.mjs`
- `tools/check-visual-parity.mjs`

## Legacy / Pre-existing

- `backend/app/web_admin/**`
- `backend/app/web_public/**`
- `backend/app/api/**`
- `backend/app/services/**`
- `mobile/**`

These were not touched for UI-PROD-1.

## Duplicated

- Multiple milestone screenshot directories under `artifacts/ui-snapshots/milestone-*`.
- Several student dashboard readiness/check scripts overlap in purpose.
- Multiple public-web image variants under `backend/app/web_public/*.png` and `*.webp`.

## Suspicious / Untracked

The worktree contains large untracked roots including:

- `apps/`
- `packages/`
- `docs/architecture/`
- `docs/design/`
- `docs/quality/`
- `artifacts/`
- `package.json`
- `package-lock.json`
- many `tools/*.mjs`

These likely include Milestone 1/2 foundation work and should not be cleaned without a checkpoint/commit decision.

## Do Not Delete Yet

- Any untracked milestone packages or docs.
- Any generated screenshot artifact used by reports.
- Any backend/mobile/legacy files, even if unrelated to UI-PROD-1.

## Safe Cleanup Candidates After Backup/Commit

- Old screenshot zip bundles that are superseded by accepted milestone reports.
- Temporary visual-diff artifacts after they are archived.
- Local-only tunnel helper scripts outside the repo workspace, if no longer needed.

Cleanup requires explicit approval after a backup/commit checkpoint.
