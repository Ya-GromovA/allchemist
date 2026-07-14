# UI Snapshots

## Command

```bash
cd /root/synapse
node tools/capture-ui-snapshots.mjs
```

The command uses Playwright with one browser at a time and captures the student dashboard preview route.

## Current Outputs

- `artifacts/ui-snapshots/web/student-dashboard-desktop.png`
- `artifacts/ui-snapshots/web/student-dashboard-mobile.png`

## Scope

These screenshots are for manual visual review and deviation reporting. They are not strict pixel-perfect baselines yet.

## Requirements

- Build `apps/web` before capture, or let the capture command build it if `.next/BUILD_ID` is missing.
- Do not commit generated screenshots unless they are intentionally promoted to review artifacts.
- Compare the screenshots with Figma node `3:12`, `APPROVED_WEB_STUDENT_DASHBOARD`.
