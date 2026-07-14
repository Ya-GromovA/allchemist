# Contract Gaps and Risks

## Biggest missing contracts

- Shared TypeScript types do not exist yet for auth, access, entitlements, admin dashboards, Content QA, payments, cabinet, progress, AI tutor, molecules, or reactions.
- Many API responses are raw `dict`; response shapes are inferred from implementation and tests rather than declared schemas.
- Scientific visualization contracts are incomplete: reaction effects, colors, precipitates, gases, pH, safety, physics graphs, microscope samples, 3D biology models.
- Product roles `methodist`, `reviewer`, `content_author`, and `university_student` are not first-class backend policy roles yet.
- School license structure is state-backed and loosely typed; seat limits, bundles, expiry rules and feature matrix need explicit contracts.
- Feature gates/capabilities are computed in auth code and not versioned as `access-core`.

## Inconsistent or fragile response shapes

- Admin endpoints often return aggregated `dict` objects with no Pydantic response model.
- Content QA endpoints accept raw `Dict[str, Any]` payloads.
- User/device endpoints mix authenticated user context with query `userId` in some places.
- Mobile progress sync is device-based and currently public; future auth/device contract needs a clear decision.
- AI mentor subjects currently emphasize physics/chemistry in request typing; Biology is first-class in product docs but not equally represented in AI request types.

## Frontend/test coverage risks

- `web_admin` uses many admin/security/content QA endpoints; some are covered by tests, but shape-level frontend contracts are not centralized.
- `web_public` calls user/cabinet/content/payment endpoints through a generic `apiFetch`; future client must preserve refresh behavior and error handling.
- Mobile uses both Axios client and raw fetch wrappers; future `api-client` should unify this.
- `content_seed.py` defines a route but is not mounted; treat it as inactive unless explicitly enabled.

## Role/access/license risks

- `school_admin` currently has broad admin/content/subscription scopes; future redesigned admin should verify whether school admin should see platform-wide data or school-scoped data only.
- Scope overrides can change policy dynamically; packages/types must model effective permissions, not only static roles.
- Entitlements and access grants can come from manual admin grants, school invites/licenses, payments, and device sync purchases.
- Payment webhook/dead-letter operations must not be exposed accidentally in user clients.

## Content QA and scientific risks

- Content QA publication gate is good, but visual metadata is not yet part of the gate.
- Source references exist at block/source level, but not per fact, per reaction effect, or per visual event.
- AI-generated durable content lacks explicit origin fields.
- Chemistry visualization must not show colors, gas, precipitate, smell, heating/cooling or pH effects until the relevant data fields exist and pass QA.
- Physics and Biology visual models are mostly future-required, not current contracts.

## Mobile reuse risks

- Mobile offline needs cache, ETag, content versioning, device identity and retry-safe sync semantics.
- Current mobile has hardcoded fallback web URLs.
- Heavy science renderers must remain lazy-loaded and platform-specific while sharing contracts.

## Recommended order for packages/types and packages/api-client

1. Create `packages/types` from existing Pydantic schemas and documented raw dict contracts, starting with P0 auth/access/payments/progress.
2. Add explicit TypeScript DTOs for `AuthContext`, `Entitlement`, `AccessGrant`, `SchoolMembership`, `ClassMembership`, `CapabilityFlags`, and `FeatureFlags`.
3. Add typed API client groups: `auth`, `users`, `access`, `payments`, `progress`, `content`, `contentQa`, `cabinet`, `admin`, `aiTutor`.
4. Add response examples/fixtures for admin dashboard, Content QA, role cabinets and payments before UI migration.
5. Only after shared client parity, scaffold `apps/web` and `apps/admin` behind non-production routes.
6. Add future science visual contracts before adding real Three/Rive/Lottie visualization runtime.

## Proceed/no-proceed assessment

It is safe to proceed to `packages/types` and `packages/api-client` as a contract-only step if the work starts with existing P0/P1 API shapes and does not change backend behavior. It is not yet safe to migrate production web/admin routes or build full science visual engines, because the visual data contracts are incomplete.
