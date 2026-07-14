# Parallel Migration Strategy

## Migration principle

Do not rewrite or switch production routes prematurely. Build the new TypeScript/React/Next/shared-package architecture beside the current FastAPI/static production stack, then migrate route-by-route after parity and rollback gates pass.

## What must stay stable

- Existing backend behavior.
- Existing auth, roles, scopes, access, licensing, subscriptions, and payments.
- Existing production static routes for `web_public` and `web_admin` until approved.
- Existing content pack and APK metadata behavior.
- Existing monitoring and production probe expectations.

## Phases

| Phase | Work | Output |
| --- | --- | --- |
| 0. Documentation and contract inventory | Product docs, architecture docs, route inventory, role/access mapping | Shared understanding and hard rules |
| 1. Contract stabilization | OpenAPI review, typed DTOs, response examples, focused tests | `packages/types` and API parity tests |
| 2. API client | Shared typed client for web/admin/mobile | `packages/api-client` used by new apps |
| 3. Design foundation | Tokens, UI primitives, subject themes, admin density patterns | `packages/design-tokens` and `packages/ui` |
| 4. Domain cores | access, content, QA, progress, assessment, monetization | Shared non-rendering logic |
| 5. Scientific cores | science, chemistry, physics, biology contracts | Data-driven visualization foundation |
| 6. Player placeholders | interactive/simulation player interfaces and static previews | No heavy runtime yet |
| 7. New app shells | Next web/admin and Expo app alignment behind non-production routes | Parallel UI without production switch |
| 8. Visualization engines | Lazy-loaded molecule/lab/sim/microscope viewers | Data-driven renderers with fallbacks |
| 9. Route-by-route migration | Compare legacy and new behavior, switch with rollback | Controlled production migration |

## Independent work streams

- Documentation and contract inventory.
- Design tokens and UI primitives.
- API response examples and tests.
- Source/QA lifecycle modeling.
- Asset registry design.
- Analytics event taxonomy.
- Non-production Next app scaffolding after contracts are clear.

## Dependent work streams

- API client depends on stable endpoint contracts.
- New web/admin apps depend on API client and design foundation.
- Scientific visualization engines depend on science/content contracts.
- AI tutor publication workflows depend on Content QA contracts.
- Owner analytics depends on progress, monetization, access, and QA event taxonomy.
- Production route switching depends on parity tests, rollback plan, and monitoring.

## Fast-effect changes

- Add project-level instructions and architecture docs.
- Inventory current API routes and roles.
- Add focused tests around auth/access/licensing before refactoring.
- Add typed response examples for admin dashboard, access, content QA, and role cabinet endpoints.
- Define design tokens before rewriting UI screens.

## Risky changes

- Replacing production web/admin routes in one step.
- Changing auth, roles, entitlements, school codes, payments, or licensing behavior.
- Introducing Three.js/Rive/Lottie globally without lazy loading and fallbacks.
- Building chemistry-specific assumptions into shared player packages.
- Rendering scientific effects without verified metadata.
- Letting AI-generated content publish without QA.

## Defer

- Full production route switch.
- Large backend service decomposition without tests.
- Heavy 3D runtime adoption before package boundaries exist.
- Full design rewrite of every screen before contracts and roles are stable.
- Mobile offline rewrite until content contracts and sync rules are documented.

## Verification gates

Before each migration step, run focused verification:

- docs-only: `git diff --check` and doc existence/content checks;
- backend: focused pytest files for touched contracts;
- frontend/shared TS: typecheck/build/lint where configured;
- API parity: compare legacy static UI calls to typed client behavior;
- visual modules: verify data contract, fallback, lazy loading, reduced motion, and telemetry;
- production-sensitive: run `python3 tools/production_monitor_probe.py` when environment supports it.

## Rollback rule

Every production route switch must have a rollback path to the current FastAPI-served static route or previous container/image. No route switch should be treated as irreversible.
