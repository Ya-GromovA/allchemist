# Frontend Foundation

## Scope

This foundation creates non-production `apps/web` and `apps/admin` in parallel with the existing FastAPI-served legacy web. It does not switch production routes, change backend behavior, modify mobile behavior, or copy legacy visual design.

## Apps

- `apps/web`: Next.js/TypeScript user-facing shell with home, student dashboard and subject module routes.
- `apps/admin`: Next.js/TypeScript admin shell with read-only operational routes.

Run locally:

```bash
npm run build:web
npm run build:admin
```

For manual development:

```bash
cd apps/web && ../../node_modules/.bin/next dev -p 3210
cd apps/admin && ../../node_modules/.bin/next dev -p 3211
```

## Shared packages

- `packages/design-tokens`: color, typography, spacing, radii, shadows, durations, z-index, breakpoints, subject themes and role accents.
- `packages/ui`: accessible React UI primitives used by both apps.

The UI package is subject-neutral. It must not hardcode chemistry-only assumptions.

## Current UI status

The routes are placeholders and read-only shells. They are designed to make future work verifiable, not to claim final visual polish or production readiness.

No heavy 3D, Rive or Lottie runtime is loaded in this step.
