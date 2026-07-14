# UI Verification

## Command

Run:

```bash
node tools/verify-ui-foundation.mjs
```

This command runs contract verification, typechecks tokens/UI/apps, builds both Next apps and runs Playwright smoke checks.

## Smoke-tested routes

`apps/web`:

- `/`
- `/modules`
- `/dashboard/student`
- `/modules/chemistry`
- `/modules/physics`
- `/modules/biology`

`apps/admin`:

- `/dashboard`
- `/schools`
- `/users`
- `/content-qa`
- `/media-assets`
- `/analytics`

The smoke tests verify that pages render and do not create obvious horizontal overflow at the checked widths.

## Not visually final yet

These tests are smoke tests, not design approval. Screenshot baselines should be added when visual direction stabilizes. Mobile visual tests should be added when mobile behavior changes or shared UI is wired into the mobile app.

## Future STEM prototype checks

Any future lab, simulation, molecule, microscope or media prototype must pass contract verification and must prove that scientific visuals are source-backed or explicitly marked as placeholder/future-required.
