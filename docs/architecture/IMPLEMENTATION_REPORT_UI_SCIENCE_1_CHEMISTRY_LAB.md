# Implementation Report UI-SCIENCE-1 Chemistry Lab

## Summary

Implemented the first interactive Chemistry Lab vertical slice for `Zn + 2HCl -> ZnCl2 + H2` as a configurable, draft-only STEM module. The route is `/modules/chemistry/lab/zinc-hcl`.

No commit, staging, production route switch, backend API/service change, mobile runtime change, nginx/systemd/docker change, reset, clean, deletion, or legacy web edit was performed.

## Lab Engine

- Extended `packages/chemistry-lab-engine` to model uppercase lab actions:
  - `START_LAB`
  - `ADD_REAGENT`
  - `START_REACTION`
  - `OBSERVE`
  - `CHECK_PH`
  - `COMPLETE_STEP`
  - `RESET_LAB`
- Added explicit phases:
  - `idle`
  - `safety`
  - `zinc_added`
  - `acid_added`
  - `reacting`
  - `observation`
  - `completed`
  - `error`
- Added observations:
  - `gas_bubbles`
  - `temperature_rise`
  - `acidic_environment`
- Added safety/content metadata:
  - `safetyStatus: needs_safety_review`
  - `publicationAllowed: false`

## UI

- Added reusable `StudentShell` component using existing student shell visual classes.
- Added Chemistry Lab screen with:
  - breadcrumb;
  - central lab scene;
  - flask, reagent rack, Zn, HCl, bubbles animation, pH strip and readouts;
  - reactants, steps, safety and observations panels;
  - control panel;
  - AI hint/warning/success panel;
  - molecular explanation block.
- Updated `/modules/chemistry` with a lab card/link.

## Visual QA

Updated `tools/playwright-approved-ui-smoke.mjs` to capture:

- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-initial.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-reacting.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-completed.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/tablet.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/mobile.png`

The script also checks route HTTP 200, no mojibake, no horizontal overflow, lab visibility, reaction state after adding Zn/HCl, and AI success after completion.

Final smoke result: PASS.

An initial smoke run caught mobile horizontal overflow in the StudentShell topbar profile cluster. UI-SCIENCE-1 fixed it with route-scoped mobile CSS overrides, then reran build and smoke successfully.

## Commands

| Command | Result |
| --- | --- |
| `npm run typecheck:tokens` | PASS |
| `npm run typecheck:ui` | PASS |
| `npm run typecheck:ai-assistant` | PASS |
| `npm run typecheck:chemistry-core` | PASS |
| `npm run typecheck:chemistry-lab-engine` | PASS |
| `npm run typecheck:science-core` | PASS |
| `npm run typecheck:web` | PASS |
| `npm run build:web` | PASS |
| `systemctl restart allchemist-web-preview` | PASS |
| `curl -I http://127.0.0.1:3010/modules/chemistry/lab/zinc-hcl` | PASS 200 |
| `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` | PASS |

## Safety Status

The lab is not publishable. The safety content is marked as draft and needs review. It must not be presented as approved educational/safety material.

## Remaining Gaps

- No local golden PNG export exists for `APPROVED_WEB_CHEMISTRY_LAB`.
- No backend/content QA integration.
- No persisted attempts or progress tracking.
- Safety and educational text still require review.
