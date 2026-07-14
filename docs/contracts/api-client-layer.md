# API Client Layer

## Purpose

`packages/api-client` is a framework-agnostic typed client for the current Allchemist FastAPI contracts. It is intended for future `apps/web`, `apps/admin`, mobile-compatible shared logic and later mobile migration, but this step does not modify any existing UI or mobile API usage.

## What it contains

- `HttpClient` with configurable `baseUrl`, injected `fetch`, auth token provider, optional refresh callback, timeout by `Promise.race`, JSON parsing and empty response handling.
- Structured errors: `ApiClientError`, `ApiValidationError`, `ApiAuthError`, `ApiForbiddenError`, `ApiNotFoundError`, `ApiServerError`, `ApiNetworkError`.
- Grouped clients: auth, users, access, schools, payments, content, Content QA, sources, admin, cabinet, progress, AI tutor, chemistry.
- Future-required marker clients for science, physics, biology, media and analytics where dedicated backend endpoints are not yet present.

## Existing backend endpoint methods

| Group | Real endpoint methods |
| --- | --- |
| auth | phone request/verify, login, invite preview/activate, refresh, logout, me, role switch, change password |
| users | profile, admin user list, devices, register/revoke device, export current user data |
| access | entitlements, user access grants, client-side feature access helper |
| schools | admin school overview, create school, classes, invites |
| payments | checkout, payment status, payment audit query, subscription KPI/grant/revoke |
| content | modules, packs, pack detail, platform catalog, exam blueprints/generate, ticket analyze, lesson blocks, tasks, APK metadata |
| contentQa | summary, sources, blocks, queues, block events, block transition |
| sources | source list through Content QA source endpoint |
| admin | dashboard, search, directory, recent events, security, audit, database overview |
| cabinet | teacher/parent overview, teacher classes, student device reset, live session, notifications |
| progress | sync, pull, analytics |
| aiTutor | ask, health, next-task, generate-task |
| chemistry | chemistry layer report, molecules, reactions |

## Future-required capabilities intentionally not implemented as real methods

- Dedicated physics simulation endpoints.
- Dedicated biology microscope/cell/anatomy endpoints.
- Generic source-backed science fact/visual verification endpoints.
- Media asset registry endpoints for Rive, Lottie, GLB/glTF, textures and sounds.
- Owner analytics endpoints for revenue, retention, funnel and platform health metrics.

These are exposed only as `futureRequired` markers in their client groups.

## Auth token provider

The client accepts `getAuthToken`, called before authenticated requests. If a request returns `401` and `refreshSession` is configured, the client calls the refresh callback and retries once with the refreshed access token. This preserves the current legacy web/mobile pattern without binding the package to localStorage, AsyncStorage, React or Expo.

## Error handling

HTTP errors are mapped as follows:

- `400` and `422` -> `ApiValidationError`
- `401` -> `ApiAuthError`
- `403` -> `ApiForbiddenError`
- `404` -> `ApiNotFoundError`
- `5xx` -> `ApiServerError`
- fetch/timeout failures -> `ApiNetworkError`

Server payloads are retained in `details`.

## Raw/unstable response shapes

The following areas still use `Record<string, unknown>` because current backend endpoints return raw dicts or aggregated objects without stable Pydantic response models:

- admin dashboards, search, directory, security, legal, audit and database overview;
- school overview/classes/invites aggregate responses;
- content platform catalog, packs, exams, tickets and APK metadata;
- content QA queues and some upsert/transition responses;
- cabinet live lesson and notification responses;
- progress analytics;
- chemistry layer report.

## Backend response models to add later

Prioritize Pydantic response models for:

1. auth/access context, entitlements and grants;
2. admin dashboard summary/activity/attention;
3. Content QA source/block/event/queue;
4. school license and invite models;
5. teacher/parent/live lesson cabinet models;
6. molecules/reactions with source-backed visualization metadata;
7. owner analytics metrics.

## Test strategy

Tests under `packages/api-client/tests` use mocked fetch only and must not call the live backend. This environment currently has TypeScript tooling but no dedicated TypeScript test runner installed, so the tests are typechecked with the package. They can later be executed by adding a safe runner such as Vitest or by compiling tests in CI.
