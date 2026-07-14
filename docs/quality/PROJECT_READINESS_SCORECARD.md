# Project Readiness Scorecard

Strict scores after UI-PROD-2. Scores are intentionally not inflated.

| Area | Current score % | Evidence | Blockers | Next action |
| --- | ---: | --- | --- | --- |
| Approved UI visual parity | 87 | UI-PROD-2 screenshot aligns on sidebar, topbar density, hero/card rhythm, quick access, first viewport, floating assistant, and global background | Hero/media visuals are CSS/clean-SVG approximations, not final approved-quality rendered science art | Generate or source clean per-zone hero/media assets and add pixel/zone diff thresholds |
| Student shell UX behavior | 94 | Smoke verifies sidebar visible before/after main scroll, independent main scroll, submenu opens | Shell still lives inside approved component rather than shared shell package | Extract shared shell after approval |
| Responsive behavior | 88 | Smoke passes tablet/mobile no horizontal overflow and submenu access; assistant is compact on mobile | Mobile is compact inline sidebar, not final drawer/top-nav | Define approved mobile shell interaction |
| Static data mapping | 84 | Data contract exists; typed demo data has route/type/status/reason/license fields and UI-PROD-2 did not introduce random JSX data | Loading/empty/error UI states not implemented | Add stateful view-model variants |
| Real backend integration | 25 | No production API integration for dashboard cards | Backend contracts not wired | Define API DTOs and adapters |
| Content readiness | 42 | Meaningful STEM demo content exists and visual zones map to typed content fields | Source metadata/verification workflow not connected to dashboard | Connect content QA metadata |
| Science engines readiness | 35 | Foundation packages exist from Milestone 1 | Dashboard does not invoke engines | Integrate labs/sim/microscope vertical slices later |
| AI assistant readiness | 62 | AI assistant visual states and context payload exist; UI-PROD-2 makes robot/bubble/close visible and stateful | No live AI service/context updates | Wire assistant runtime and safety states |
| Visual QA coverage | 84 | Playwright smoke captures UI-PROD-2 top/scrolled/accordion/tablet/mobile and checks mojibake/overflow/sidebar/assistant/hero/quick access/density | No automated pixel-diff threshold against golden reference yet | Add zone-based visual diff automation |
| Production deployment readiness | 78 | Persistent production-mode preview service is enabled on 127.0.0.1:3010; build and smoke pass | No nginx/domain route enabled by design | Add preview domain only after approval |
| Chemistry Lab UI readiness | 82 | UI-SCIENCE-1 adds `/modules/chemistry/lab/zinc-hcl` with StudentShell, lab canvas, reagent/steps/safety/observations/equation panels and AI states | Approved reference exists as Figma/docs entry, but no golden lab PNG is available in repo | Capture approved reference export and add zone diff |
| Chemistry Lab interaction readiness | 78 | Engine-backed START/ADD/OBSERVE/CHECK/COMPLETE/RESET flow and Playwright click path exist | No persisted attempts, scoring or teacher review yet | Connect to progress/attempt tracking |
| Chemistry Lab content/safety readiness | 45 | Scenario marks `safetyStatus: needs_safety_review` and `publicationAllowed: false`; observations are draft | Safety text is not reviewed; no source verification workflow wired | Run Content QA/scientific review before publishing |
| Chemistry Lab backend integration readiness | 20 | Static typed scenario can be replaced by API/content source | No backend API, lab attempt save, or content QA status integration | Define DTOs and connect content/progress endpoints |
| Cleanup/legacy risk | 38 | Cleanup inspection created; dirty worktree documented | Many untracked/modified pre-existing files | Commit/checkpoint approved work before cleanup |

## Summary

- Visual parity estimate: 87%.
- UX behavior estimate: 94%.
- Data readiness estimate: 84% for static typed demo data, 25% for real backend integration.
- Production preview readiness estimate: 78%.
- Chemistry Lab UI readiness estimate: 82%.
- Chemistry Lab interaction readiness estimate: 78%.
- Chemistry Lab content/safety readiness estimate: 45%.
- Chemistry Lab backend integration readiness estimate: 20%.

## Verdict

Ready for continued student dashboard refinement: YES.

Ready to move to the next screen: YES, with constraints: student dashboard is above 85% visual parity, while Chemistry Lab must remain draft/non-publishable until safety/content review and backend attempt tracking are wired.
