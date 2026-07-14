# Types Layer

## Purpose

`packages/types` is the contract-first TypeScript DTO layer for Allchemist. It gives future `packages/api-client`, `apps/web`, `apps/admin`, and mobile-compatible shared logic a common language before any production route migration.

This step does not change backend behavior, backend routes, legacy `web_admin`, legacy `web_public`, or production routing.

## Contents

| Module | Purpose |
| --- | --- |
| `common.ts` | IDs, ISO dates, locales, API responses, errors, pagination |
| `roles.ts` | Current backend roles, target roles, scopes, permissions |
| `auth.ts` | Auth/session/invite/role-switch DTOs |
| `access.ts` | Entitlements, grants, school memberships, capabilities, feature flags |
| `users.ts` | User, student, parent, teacher profiles |
| `schools.ts` | Schools, classes, invites, access codes, license summaries |
| `payments.ts` | Payments, checkout, subscriptions, tariff plans, future promo/invoice |
| `content.ts` | Content items, blocks, drafts, lesson blocks, tasks |
| `content-qa.ts` | QA blocks, events, queues, summary, transitions |
| `sources.ts` | Content sources, source references, source reliability |
| `progress.ts` | Progress sync, assignments, exams, assessment results |
| `ai-tutor.ts` | AI tutor requests, responses, modes and safety status |
| `science.ts` | Scientific facts, verification, confidence, fidelity |
| `chemistry.ts` | Substances, reactions, observations, molecules, periodic elements |
| `physics.ts` | Formulas, variables, simulations, graphs, experiments |
| `biology.ts` | Microscope samples, cell/anatomy/observation contracts |
| `media.ts` | Images, video, audio, SVG, Rive, Lottie, GLB/glTF and previews |
| `analytics.ts` | Owner, revenue, usage, retention and platform health metrics |
| `errors.ts` | API error codes/details |

## Current-contract based DTOs

These map directly to current backend inventory:

- auth phone/password/invite/refresh/logout/auth-me responses;
- entitlements, access grants, capabilities and memberships;
- user profile and consent DTOs;
- school classes and invites;
- payment create/status/webhook-facing status fields;
- progress sync and progress analytics entry points;
- Content QA sources, blocks, events, queues and summary;
- molecule and reaction read DTOs using current `atoms`, `reactants`, `products`, `conditions`;
- AI tutor ask/next-task/generate-task request/response shape;
- admin role/scope concepts from `backend/app/security/policies.py`.

## Future-required DTOs

These are included as optional or TODO-marked contracts because the product architecture requires them, but the backend does not fully implement them yet:

- `university_student`, `content_author`, `methodist`, `reviewer`, `class_teacher`, `system_admin` as formal backend roles;
- explicit school license seat/bundle/expiry contracts;
- promo code and invoice contracts;
- per-fact source references and AI-origin metadata;
- visual metadata for real solution colors, precipitates, gases, pH, odor notes, heating/cooling;
- typed physics simulation graphs and parameter contracts;
- typed biology microscope/cell/anatomy contracts;
- media asset registry for Rive, Lottie, GLB/glTF, textures and sounds.

## Backend endpoints still returning raw dict

The following areas should receive Pydantic response models before or during API-client hardening:

- admin dashboard, directory, search, attention, activity, schools map;
- admin users, schools, classes, invites and rights matrix;
- admin security/legal/go-no-go/backup/export endpoints;
- Content QA source/block/queue/transition endpoints;
- content catalog, lesson blocks, tasks, molecules, reactions and AI search;
- role cabinet live lesson endpoints and notification endpoints;
- progress analytics response;
- several user/device endpoints that currently accept or return generic dictionaries.

## DTOs that should later get Pydantic response models

Prioritize:

1. `AuthContext`, `Entitlement`, `AccessGrant`, `SchoolMembership`.
2. `Payment`, `CheckoutSession`, `Subscription`.
3. `ContentQaBlock`, `ContentQaEvent`, `ContentSource`.
4. `TeacherCabinet`, `ParentCabinet`, live lesson DTOs.
5. `Molecule`, `Reaction`, `PhysicsSimulation`, `MicroscopeSample`.
6. Admin dashboard and owner analytics DTOs.

## How packages/api-client should use these types next

`packages/api-client` should import these DTOs and expose grouped clients:

- `authClient`;
- `usersClient`;
- `accessClient`;
- `paymentsClient`;
- `contentClient`;
- `contentQaClient`;
- `adminClient`;
- `cabinetClient`;
- `progressClient`;
- `aiTutorClient`.

The API client should preserve current backend behavior, normalize errors into `ApiError`, keep token refresh behavior compatible with `web_public` and mobile, and avoid calling destructive admin/payment endpoints from user-facing clients.
