# Student Dashboard Data Contract

Source: `APPROVED_WEB_STUDENT_DASHBOARD`, Figma node `3:12`
Preview route: `/design-preview/student-dashboard`
Purpose: define which screen parts are static, dynamic or hybrid before the next visual parity pass.

This contract is for the non-production preview implementation. It does not connect the screen to production data yet.

## Global Rules

- The approved desktop layout, sidebar width, topbar placement, card grid, card hierarchy, radius, shadows, and visual density are fixed by design.
- Content values may change, but changes must not alter the relative visual rhythm of the approved dashboard.
- Dynamic text must be constrained so it does not resize cards or push neighboring zones.
- Icons, chart primitives and controls must remain real UI/vector components.
- Illustration crops are temporary and must be replaced by clean exported/generated assets before production approval.

## Zone Contract

| Zone | Mode | Fixed by approved design | Changes by user data | Changes by role/license | Changes by progress | Changes by live lesson status | Changes by AI recommendations | Must never change visually |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sidebar | Hybrid | Width, deep blue/cyan atmosphere, logo area, nav order, active item style, license card position | User-specific unread message count can change | License card copy/status/CTA can change by entitlement; nav availability may be gated later but order remains locked | No direct progress changes | No direct live changes | AI nav item availability/status can reflect entitlement | Width, navigation order, logo language, active highlight treatment, icon style |
| Topbar | Hybrid | Topbar height, search placement, icon button cluster, profile cluster rhythm | Search placeholder, notification count, avatar/name/grade | Profile affordances may vary by role, but student view remains student-specific | No direct progress changes | Calendar indicator can reflect schedule | No direct AI changes | Search field size, button sizes, profile cluster density |
| Greeting | Dynamic | Position, two-line hierarchy, greeting tone | Name, greeting text, short subtitle | Student role wording only in this screen | May mention learning continuation but must stay short | No direct live changes | No direct AI changes | Heading scale, line count budget, left alignment |
| Continue learning card | Hybrid | Card size, chemistry visual placement, CTA placement, progress bar style | Current topic, subject label, lesson title | Locked/unlocked CTA may change if entitlement blocks content | Percent and topic progress change | No direct live changes | AI may suggest next step but should not reshape card | Hero card proportions, chemistry visual area, progress bar position |
| Live lesson card | Hybrid | Card size, physics/Newton art placement, CTA style | Lesson title, teacher, time | Access/join CTA can be gated by license or class membership | No direct progress changes | Status, time, join button state, countdown may change | No direct AI changes | Video player must not appear on dashboard; compact entry card remains |
| AI recommendations card | Hybrid | Right first-row card size, stacked recommendation list, link position | Recommendation labels and subjects | Recommendations may depend on role/license/module access | Recommendation priority may use progress gaps | No direct live changes | Full contents dynamic from AI recommendation service | Card density, row height, icon style, compact structure |
| Quick access strip | Hybrid | Full-width strip, item count/order, compact icon tiles, AI tile at the end | Badge counts and active labels may change | Items can show locked/disabled states but not reorder; Live lesson is not a permanent nav item | Progress does not change layout | Live access can be surfaced elsewhere but not as extra permanent bottom/global nav | AI mentor availability/status can change | Strict tool order, strip height, icon visual language |
| Assignments card | Hybrid | Card size, title row, row density, status pill style | Assignment names, due dates, teacher/source | Hidden/locked rows only if no entitlement; empty state must preserve size | Status and completion state change | No direct live changes | AI may recommend assignment but not alter the card shell | Row rhythm, status pill placement, see-all link placement |
| Progress card | Dynamic chart | Card size, three progress rings, subject labels, details link | Subject names may map to user's curriculum | License may hide advanced detail but ring layout remains | Ring percent, labels and totals change | No direct live changes | AI can use progress but does not modify chart structure | Three-ring composition, ring stroke style, card hierarchy |
| Weak topics card | Hybrid | Card size, weak topic rows, repeat buttons, helper link | Topic names and subjects | Some repeat actions may be locked by module/license | Weakness score/order changes from diagnostics | No direct live changes | AI may choose topics or explanations | Row density, button size, icon treatment, max visible rows |
| Popular now card | Hybrid | Lower-left card size, three thumbnail cards, see-all link | Content titles and subjects | Locked badges may appear for inaccessible modules | Popularity does not reflect user progress directly | No direct live changes | AI may personalize ordering later | Three-thumbnail rhythm, thumbnail aspect ratio, title density |
| Weekly progress card | Dynamic chart | Lower-middle card size, percent summary, line chart, x-axis rhythm | Week labels and summary copy | Advanced analytics can be gated but card shell remains | Percent delta and chart points change | No direct live changes | AI can annotate later outside chart structure | Chart bounds, line style, label hierarchy |
| Locked feature card | Hybrid | Lower-right anatomy card style, lock badge, CTA, visual placement | Feature name may vary only if approved | Lock/unlock state and CTA change by entitlement | No direct progress changes | No direct live changes | AI may explain feature value but cannot replace CTA | Anatomy visual position, gated-feature card size, lock treatment |
| AI assistant widget | Hybrid/animated later | Fixed lower-right placement, robot/bubble relation, compact non-blocking footprint | Bubble text may use user context | Availability or premium state may alter prompt but not placement | Suggestions may reference progress | Can mention live lesson context but must not cover controls | Assistant state, hint text, open/closed state | Widget anchor, safe non-overlap, robot character language, close button affordance |

## Data Sources To Add Later

- User profile: name, avatar, class/grade, role.
- Entitlements: school license, individual subscription, module purchases, AI mentor access.
- Learning state: current topic, progress percent, subject totals, weekly history.
- Assignments: title, due date, status, source, teacher.
- Live lesson: scheduled/starting/live/ended state, teacher, join URL, access state.
- Content catalog: popular cards, thumbnails, subject tags, locked/unlocked status.
- AI recommendations: recommendation type, subject, title, priority, target route.

## Visual Invariants For Future Data Binding

- Do not introduce extra rows that overflow the approved card heights.
- Use truncation/line clamps and stable numeric formatting.
- Preserve the approved order of navigation and quick access items.
- Preserve the approved desktop viewport contract until a separate responsive contract is created.
- Do not derive the future mobile implementation from this desktop responsive layout.
