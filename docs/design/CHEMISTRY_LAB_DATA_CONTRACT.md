# Chemistry Lab Data Contract

Route: `/modules/chemistry/lab/zinc-hcl`

Scenario: `Zn + 2HCl -> ZnCl2 + H2`

Safety/content status: draft, `needs_safety_review`, `publicationAllowed: false`.

| UI zone | Current static source | Future backend/source | States | Loading/empty/error | Safety rules | Must never show |
| --- | --- | --- | --- | --- | --- | --- |
| StudentShell/sidebar/topbar | `components/student-shell/StudentShell.tsx` | Auth/session, feature registry, role navigation API | active module route, notifications, profile | Skeleton shell or safe fallback nav | Do not expose admin links to student | Backend/admin/private routes |
| Breadcrumb | Route metadata in lab page | Route registry/content module catalog | modules/chemistry/lab | Hide missing crumbs, show route fallback | Keep draft lab under module path | Approved/published label for draft lab |
| Central lab scene | `LabScenario`, `LabState` from `chemistry-lab-engine` | Lab scene config service, verified media assets | idle/safety/zinc_added/acid_added/reacting/observation/completed/error | Scene skeleton, empty lab, inline error | Require safety before acid action | Real unsafe handling instructions |
| Reactants panel | `scenario.reagents` | Chemistry content API/substance catalog | reactant/product/indicator, added/not added | Empty reagent list blocks lab start | HCl marked acid/corrosive; H2 flammable | Unreviewed hazards as verified facts |
| Steps panel | `scenario.steps` | Lab scenario CMS/content QA | active/complete/pending | Empty steps blocks lab start | Safety step first | Skipping PPE before acid |
| Safety panel | `scenario.safety`, `safetyStatus` | Safety rules service + methodist/scientific review | needs_safety_review/reviewed/approved | Show draft warning if missing review | Publication blocked until approved | “Safe for classroom” without review |
| Observations | `scenario.observations`, state observations | Attempt/observation tracking API | none/gas_bubbles/temperature_rise/acidic_environment | Empty state before reaction; error on invalid order | Observations remain draft | Claims of verified results without source |
| Equation/explanation | `scenario.equationRu`, `scenario.explanation` | Content pack + source metadata | visible, draft | Fallback equation unavailable | Explain H2 flammability carefully | Flame tests or unsafe proof steps |
| Control panel | `LabActionType` reducer | Lab runtime/attempt service | enabled/disabled by state | Disabled until prerequisites met | START_LAB required before reagents | Acid action enabled before PPE |
| AI assistant | Adapter from lab state | AI assistant context runtime with safety policy | hint/warning/success | Non-blocking unavailable state | Warning on invalid order/safety violation | Unsafe chemical advice or private data |

## Current Static Source

- `packages/chemistry-lab-engine/src/scenario.ts`
- `packages/chemistry-lab-engine/src/reducer.ts`
- `apps/web/lib/demo/chemistry-lab-zinc-hcl.ts`
- `apps/web/lib/adapters/chemistry-lab.ts`

## Future Backend Source

- Content QA approved lab scenario DTO.
- Chemistry substance/reaction catalog.
- Lab attempt/progress service.
- AI assistant contextual hint service with safety guardrails.

## Draft Rule

This lab must remain non-publishable until safety and educational content are reviewed. UI labels must keep draft/needs-review status visible.
