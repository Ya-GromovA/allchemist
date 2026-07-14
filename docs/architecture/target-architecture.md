# Allchemist Target Architecture

## Goal

The target architecture separates applications from shared domain packages while preserving current production behavior. New web, admin, and mobile-compatible code should be built in parallel with the existing FastAPI/static deployment until migration gates are met.

## Target repository layout

```text
apps/
  api/       FastAPI backend application and API composition
  web/       Next.js/React public site and role cabinets
  admin/     Next.js/React admin and owner dashboard
  mobile/    Expo/React Native app

packages/
  types/
  api-client/
  ui/
  design-tokens/
  assets/
  science-core/
  chemistry-core/
  physics-core/
  biology-core/
  chemistry-lab-engine/
  physics-sim-engine/
  biology-lab-engine/
  lab-scene/
  lab-effects/
  molecule-viewer/
  physics-scene/
  microscope-viewer/
  anatomy-viewer/
  cell-viewer/
  simulation-player/
  interactive-player/
  live-lesson-core/
  content-core/
  media-core/
  source-core/
  content-qa-core/
  assessment-core/
  ai-tutor-core/
  progress-core/
  access-core/
  monetization-core/
  analytics-core/
```

## Application responsibilities

| App | Responsibility |
| --- | --- |
| `apps/api` | API routes, auth, persistence, background operations, OpenAPI, server-side policy enforcement |
| `apps/web` | Public site, demo flows, student/parent/teacher cabinets, responsive learning UI |
| `apps/admin` | Admin panel, owner dashboard, content QA operations, school/license/payment/security management |
| `apps/mobile` | Expo app, offline-capable learning, sync, push, device identity, native 3D where appropriate |

## Shared package responsibilities

| Package | Responsibility |
| --- | --- |
| `types` | Shared DTOs, enums, branded IDs, generated API contracts |
| `api-client` | Typed client for web/admin/mobile, auth token handling, error normalization |
| `ui` | Cross-app React UI primitives, not domain-specific business logic |
| `design-tokens` | Color, typography, spacing, radii, elevation, subject themes, dark/light tokens |
| `assets` | Stable asset registry for images, icons, Rive, Lottie, GLB/glTF, thumbnails |
| `science-core` | Subject-neutral scientific metadata, units, sources, safety, verification primitives |
| `chemistry-core` | Reagents, reactions, molecules, periodic data, lab data contracts |
| `physics-core` | Simulation variables, formulas, units, constraints, graph contracts |
| `biology-core` | Samples, microscope metadata, cell/anatomy structures, observation contracts |
| `chemistry-lab-engine` | Reaction timeline interpretation, lab state, effect event generation from data |
| `physics-sim-engine` | Deterministic physics simulation state and parameter updates |
| `biology-lab-engine` | Microscope/sample/viewer state and observation flow |
| `simulation-player` | Subject-neutral playback state, timeline, pause/step/reset, recording hooks |
| `interactive-player` | Lesson interaction shell shared by labs, sims, assignments, and live lessons |
| `content-core` | Content model, packs, modules, lessons, tasks, status metadata |
| `source-core` | Source metadata, citation records, source confidence, provenance |
| `content-qa-core` | Draft/review/approved/published lifecycle, review gates, QA events |
| `assessment-core` | Tasks, attempts, scoring, rubrics, exams, diagnostics |
| `ai-tutor-core` | AI tutor context contracts, allowed operations, moderation and QA boundaries |
| `progress-core` | Learning events, progress aggregation, sync contracts, analytics events |
| `access-core` | Roles, scopes, permissions, entitlements, feature matrix |
| `monetization-core` | Plans, purchases, school licenses, grants, payment states |
| `analytics-core` | Conversion, retention, owner metrics, dashboard aggregation contracts |

## Backend contract preservation

Current FastAPI routes are the source of truth during migration. New TypeScript clients must match existing endpoints and response behavior before UI is switched.

Important current route groups include `/api/v1/health`, `/api/v1/web`, `/api/v1/admin/web`, `/api/v1/admin/*`, `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/payments/*`, `/api/v1/cabinet/*`, `/api/v1/notifications/*`, `/api/v1/packs`, `/platform-catalog`, `/tasks`, `/lesson-blocks`, `/molecules`, `/reactions`, `/api/v1/qa/*`, `/api/v1/ask`, `/next-task`, `/generate-task`, `/api/v1/sync`, `/pull/{device_id}`, and `/analytics/{device_id}`.

## Boundary rules

- API enforces auth, role scopes, access, licensing, payment states, QA state, and publication eligibility.
- Shared TypeScript packages can mirror policy for UI state, but must not become the authority for security.
- Visualization engines consume verified content contracts and emit render events; they must not invent scientific facts.
- UI packages must not contain chemistry-only assumptions.
- Subject modules should plug into subject-neutral players.

## Migration style

1. Document and freeze current contracts.
2. Add generated or manually typed API contracts.
3. Add shared TypeScript packages with no production route switch.
4. Build React/Next pages behind non-production routes or feature flags.
5. Verify parity with legacy behavior.
6. Switch route-by-route only after rollback paths exist.
