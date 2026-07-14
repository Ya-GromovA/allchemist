# Web and Mobile Visual Strategy

## Goal

Build a shared scientific visualization architecture that supports modern web and Expo mobile without forcing identical rendering technology everywhere.

## Current state

- Current public/admin web is served from FastAPI as static `web_public` and `web_admin` assets.
- Current mobile app is Expo-based and already declares dependencies suitable for mobile visual work, including SQLite, GL, Three, notifications, and TypeScript.
- New architecture should be created in parallel. Production routes should not be switched yet.

## Shared contract, platform-specific renderer

Use shared data contracts and subject engines. Renderers can differ:

| Layer | Web | Mobile |
| --- | --- | --- |
| UI shell | Next.js/React | Expo/React Native |
| 2D/interactive | React plus Canvas/SVG where needed | React Native plus SVG/Skia-compatible future path |
| 3D molecules/labs | Three.js / React Three Fiber, lazy-loaded | Expo GL / Three or native-compatible viewer |
| Rive/Lottie | Lazy optional runtime | Lazy optional runtime |
| Offline content | Browser cache/future PWA strategy | SQLite/content packs/sync |

## Placeholder-first strategy

Before adding heavy runtimes, implement package boundaries, content contracts, typed API client, renderer interfaces, static preview components, feature flags, weak-device fallbacks, and telemetry events.

Only after this should Three.js/Rive/Lottie be introduced into new apps.

## Responsive strategy

- Public web must work on mobile and desktop.
- Admin should prioritize desktop density but remain usable on tablets and constrained widths.
- Complex labs and simulations may recommend landscape orientation.
- Mobile should support offline and reconnect flows.
- Heavy modules should never block the main dashboard or core learning flow.

## Asset strategy

Assets should move toward a registry in `packages/assets` with asset ID, subject, type, license/source, size and performance class, fallback asset, related content version, and allowed apps/platforms.

## Telemetry strategy

Visual modules should emit learning events: module opened, simulation started, parameter changed, reaction step observed, microscope zoom/focus changed, formula/graph inspected, hint requested, answer attempted, fallback used, and weak-device mode activated.
