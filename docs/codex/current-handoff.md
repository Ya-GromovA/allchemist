# Allchemist Codex Handoff

Last updated: 2026-07-03

This file is the working handoff for continuing the Allchemist migration/design-preview work in a fresh Codex session.

## Project

- Production/server project path: `/root/synapse`
- Work should be performed in `/root/synapse` unless the user explicitly says otherwise.
- Do not assume local Windows workspace files are the Allchemist source of truth.

## Figma Source

- Figma file: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
- Approved Figma page/node: `06_APPROVED_FOR_CODEX` / node `2:7`
- Approved references must be inspected from this page/node before visual implementation work.

Known approved reference names from the design-lock work:

- `APPROVED_WEB_LANDING`
- `APPROVED_WEB_STUDENT_DASHBOARD`
- `APPROVED_WEB_CHEMISTRY_LAB`
- `APPROVED_WEB_PHYSICS_SIMULATION`
- `APPROVED_WEB_BIOLOGY_MICROSCOPE`
- `APPROVED_ADMIN_DASHBOARD`
- `approved_admin_content_qa`
- `approved_ai_assistant`
- `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`
- `APPROVED_MOBILE_LOADING_SCREEN`
- `approved_app_icon`

Important mobile note:

- `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW` is the approved first viewport for mobile.
- Any older long mobile dashboard reference is reference-only for below-the-fold content.
- A responsive desktop/web screenshot is not a valid mobile implementation.

## Current Design Lock Docs

Current design-lock and implementation guidance lives in:

- `AGENTS.md`
- `docs/design/allchemist-design-lock.md`
- `docs/design/figma-approved-references.md`
- `docs/design/navigation-system-lock.md`
- `docs/design/ai-assistant-design-lock.md`
- `docs/design/implementation-visual-rules.md`
- `docs/design/design-implementation-checklist.md`
- `docs/design/mobile-design-lock.md`
- `docs/design/implementation-reports/student-dashboard-figma-deviation-report.md`

Related architecture/foundation docs that may matter:

- `docs/product/allchemist-product-spec.md`
- `docs/architecture/target-architecture.md`
- `docs/architecture/stem-platform-architecture.md`
- `docs/architecture/scientific-data-and-qa.md`
- `docs/architecture/visualization-standards.md`
- `docs/architecture/web-mobile-visual-strategy.md`
- `docs/architecture/frontend-foundation.md`
- `docs/migration/parallel-migration-strategy.md`
- `docs/quality/hard-verification-report.md`
- `docs/quality/ui-verification.md`
- `docs/infra/server-profile.md`

## Current Implemented Preview Route

- Non-production preview route: `/design-preview/student-dashboard`
- Main component file: `apps/web/components/student-dashboard-preview.tsx`
- Preview route file: `apps/web/app/design-preview/student-dashboard/page.tsx`
- Styles: `apps/web/app/globals.css`
- Temporary approved-reference crop assets: `apps/web/public/design-preview/student-dashboard/`
- Screenshot tooling: `tools/capture-ui-snapshots.mjs`

The preview must remain non-production unless the user explicitly approves a route switch.

## Current Issue

The current student dashboard preview has improved, but it is still not visually close enough to the approved desktop reference.

Known issues:

- Desktop still needs a strict visual parity pass against `APPROVED_WEB_STUDENT_DASHBOARD`.
- Card density, relative proportions, spacing rhythm, icon treatment, chart fidelity, and visual hierarchy may still deviate.
- Some fidelity-sensitive card visuals currently use temporary crop-backed assets from the approved reference and should be replaced or tightened as needed.
- The responsive web mobile screenshot is not a valid mobile implementation.
- Mobile must be implemented later as a dedicated route/screen from `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`.
- Do not implement mobile by shrinking the desktop dashboard layout.

## Strict Rules

- Do not change production routes.
- Do not modify backend behavior.
- Do not change FastAPI routes.
- Do not modify legacy `backend/app/web_admin`.
- Do not modify legacy `backend/app/web_public`.
- Do not modify mobile app behavior unless the user explicitly asks for a mobile task.
- Do not treat draft references as approved.
- Use only approved Figma references from `06_APPROVED_FOR_CODEX`.
- Build real components, not a full-page pasted screenshot.
- Do not implement mobile from the desktop responsive layout.
- Do not run global formatters.
- Do not refactor unrelated files.
- Do not delete or revert unrelated dirty files.

## Verification Commands

Run from `/root/synapse`:

```bash
node tools/verify-contract-layer.mjs
node tools/verify-ui-foundation.mjs
node tools/capture-ui-snapshots.mjs
npm run typecheck:web
npm run build:web
```

For doc-only tasks, run a targeted whitespace check for the changed file:

```bash
git diff --check -- docs/codex/current-handoff.md
```

## Screenshot Outputs

Server screenshot/artifact folder:

- `/root/synapse/artifacts/ui-snapshots/`

Recent tightened student dashboard outputs:

- `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-desktop-tightened.png`
- `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-mobile-from-web-preview-tightened.png`
- `/root/synapse/artifacts/ui-snapshots/student-dashboard-tightened.zip`

Windows target folder for manual copy:

- `D:\Allchemist\Allchemist_Design_References\12_screens`

## Current Next Task

Strict desktop visual parity pass for `APPROVED_WEB_STUDENT_DASHBOARD` at viewport `1672x941`.

Expected approach for the next task:

1. Inspect the approved Figma node again before editing.
2. Compare the current `/design-preview/student-dashboard` screenshot against the approved desktop reference at `1672x941`.
3. Tighten layout, density, typography, spacing, side navigation, topbar, cards, charts, quick access, AI assistant, locked feature card, and visual assets.
4. Keep the implementation component-based.
5. Save fresh screenshots under `/root/synapse/artifacts/ui-snapshots/`.
6. Update the deviation report with concrete remaining differences.
7. Run the verification commands required by the task.

## Server/Infra Notes

Current server profile from previous verification:

- OS: Ubuntu 22.04.2
- Runtime: Node 20.20.2, npm 10.8.2, Python 3.10.12
- CPU: 3 logical threads
- RAM: about 5.8 GiB
- GPU: no GPU detected

Recommended limits:

- Playwright workers: `1`
- Screenshot concurrency: `1`
- Keep design preview generation lightweight.
- Lazy-load heavy animations and 3D.
- Avoid heavy 3D previews on this server.

Known recurring warning:

- Next may print that `next start` does not work with `output: standalone`; smoke tooling has still passed, but this is a future infrastructure cleanup item.
