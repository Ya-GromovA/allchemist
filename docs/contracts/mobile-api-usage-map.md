# Mobile API Usage Map

This map documents current Expo/React Native API usage and mobile constraints for future `packages/types`, `packages/api-client`, and shared logic.

## Mobile API configuration

| File | Current behavior |
| --- | --- |
| `mobile/app/config/api.ts` | Defines `API_BASE_URL`, defaulting to `https://api.allchemist.ru/api/v1`; normalizes custom env URL; creates Axios clients; handles auth refresh/interceptors and safe logging |
| `mobile/app/services/api.ts` | Lightweight `safeFetch(path, options)` wrapper over `API_BASE_URL` |
| `mobile/app/screens/WebFallbackShell.tsx` | Hardcoded fallback URLs to current public/admin web routes on server |

## Mobile feature usage

| Mobile area | Files | Endpoints/contracts |
| --- | --- | --- |
| Auth/session | `mobile/app/services/authService.ts` | `/auth/phone/request-code`, `/auth/phone/verify`, `/auth/login`, `/auth/invite/activate`, `/auth/invite/preview`, `/auth/change-password`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| Onboarding/consent | `mobile/app/screens/OnboardingRoleScreen.tsx` | `/users/consents/accept` |
| Entitlements/sync | `mobile/app/services/accountSyncService.ts` | `/users/entitlements`, `/users/devices/sync` GET/POST |
| Content updates | `mobile/app/services/contentUpdateService.ts` | `/content/packs`, `/content/pack/{packId}` with HTTP caching support |
| Progress analytics | `mobile/app/screens/AnalyticsScreen.tsx`, `mobile/app/screens/CabinetScreen.tsx` | `/progress/analytics/{deviceId}` |
| Progress upload | `mobile/app/services/syncProgressService.ts` | `/progress/sync` |
| AI tutor | `mobile/app/services/aiMentorService.ts` | `/ai-mentor/ask`, `/ai-mentor/next-task`, `/ai-mentor/generate-task` |
| Learning telemetry | `mobile/app/services/learningEventService.ts`, `mobile/app/services/telemetryService.ts` | `/learning/events`, `/telemetry/events` |
| Payments | `mobile/app/screens/SubscriptionsScreen.tsx` | `/payments/create` |
| Cabinet/live | `mobile/app/screens/CabinetScreen.tsx`, `mobile/app/screens/HomeScreen.tsx` | `/health`, `/modules`, `/content/downloads/apk/latest/metadata`, `/cabinet/teacher/live/session/{id}`, `/cabinet/teacher/live/session/start`, `/cabinet/teacher/live/session/{id}/close`, `/cabinet/teacher/live/session/{id}/roster`, `/cabinet/teacher/live/session/{id}/notify`, `/cabinet/live/join` |
| Push notifications | `mobile/app/services/notificationsService.ts` | `/notifications/push/register-token` |

## Contracts to move into packages later

- Auth DTOs: phone request/verify, password login, invite activate/preview, refresh/logout, auth me.
- Access DTOs: entitlements, grants, memberships, capabilities, feature flags.
- Device DTOs: device sync, device registry, recovery code activation, push token registration.
- Content DTOs: packs, pack metadata, modules, lesson blocks, tasks, platform catalog.
- Progress DTOs: progress sync item, accepted task IDs, analytics response.
- AI tutor DTOs: ask, next-task, generated task.
- Payment DTOs: payment checkout/status.
- Cabinet DTOs: teacher overview/classes/live session, parent overview/child progress.

## Mobile-specific constraints

- Offline/unstable network is expected; API client must support retry-safe reads and explicit offline handling.
- Content packs need cache validators: current `/content/pack/{packId}` supports `ETag` and `Last-Modified`.
- Progress sync is device-first and currently not bearer-token protected; future contract must decide how device identity and user auth combine.
- Heavy 3D/science viewers must be lazy-loaded and have weak-device fallbacks.
- Mobile must not assume web-only layout, DOM APIs, or browser localStorage.
- Auth refresh and token storage must remain mobile-safe; logs must redact secrets.
