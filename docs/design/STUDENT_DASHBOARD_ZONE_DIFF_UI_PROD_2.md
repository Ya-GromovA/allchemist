# Student Dashboard Zone Diff UI-PROD-2

Approved reference: `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`.

Current screenshots: `artifacts/ui-snapshots/ui-prod-2/student-dashboard/`.

| Zone | Approved behavior/look | Current behavior/look | Mismatch before UI-PROD-2 | Exact fix applied | Acceptance criteria | Score before | Score after |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Sidebar | Dark blue fixed rail, bright active item, compact icon rhythm, license card at bottom | Fixed rail with same information architecture and active state | Shell behavior OK, visual rhythm slightly heavier | Kept fixed rail, tightened surrounding layout; no route changes | Sidebar fixed after scroll, active route visible, accordion works | 86 | 90 |
| Topbar | Greeting left, long rounded search, compact notification/calendar/profile cluster with dimensional avatar | Search/profile cluster closer to reference, icon button borders, profile chevron | Search was too flat/wide; avatar/profile cluster too simple | Added search SVG, compact height, bordered action buttons, dimensional avatar styling, chevron | Baseline alignment, readable profile name/class, no overflow | 70 | 88 |
| Hero card - continue learning | Light card, soft science media at right, gradient progress/button, tight type | Clean SVG science visual with CSS glow/molecule decoration | Earlier media looked too flat and card row too tall | Added approved-like card height, CSS molecule layer, gradient button/progress, tighter type | Hero visible above fold and does not push quick access too low | 68 | 85 |
| Hero card - live lesson | Light card, Newton visual, compact meta rows and gradient CTA | Clean SVG Newton visual with CSS scientific background | Too much vertical height and less polished CTA | Fixed card height, tightened copy, gradient CTA, scientific decoration | Live card aligns with continue card and keeps first viewport density | 68 | 85 |
| AI recommendations | Compact white card, colored round icons, link at bottom | Subject-colored icon circles and compact list | Icons were too monochrome/simple and card forced row height | Added subject-aware icon backgrounds and reduced list spacing | Four recommendations visible, link visible, card height matches hero row | 74 | 88 |
| Quick access strip | One-row shortcut strip with boxed icons, badge on tasks | One-row strip with routes/status badges | Strip started too low before density pass | Reduced hero/AI height and strip spacing | Quick access appears in first viewport immediately after hero row | 82 | 90 |
| Teacher tasks | Compact card with subject icons, statuses, teacher task link | Similar task card and statuses | First viewport alignment lagged due hero height | Density fixes bring it into approved viewport position | Task card top visible in first viewport | 82 | 88 |
| Progress rings | Three progress rings with subject colors | Three rings with typed metrics | Mostly aligned, slightly bolder typography | Minor typography/spacing inherited from density pass | Rings visible and labels readable | 84 | 88 |
| Weak topics | Compact list with repeat buttons and source link | Similar weak-topic list | Buttons and type slightly heavy | Tighter icon sizing and typography | Four topics fit without overflow | 82 | 87 |
| Popular content | Three thumbnail cards with science imagery | Three clean SVG thumbnails | Clean SVGs are less photorealistic than approved crops | Kept clean assets; no UI-crops used | Popular content visible below fold/top of first viewport | 72 | 82 |
| Weekly progress | Card with delta and line chart | Similar chart from typed points | Mostly aligned, bottom position improved | Density pass improved placement | Chart renders and no overflow | 80 | 86 |
| Locked anatomy card | License badge, anatomy visual, CTA, assistant nearby | Clean anatomy SVG with license metadata | Visual less realistic than approved anatomy art | Added warmer locked-card background; preserved typed license | Locked feature visible and assistant does not block CTA on desktop | 70 | 84 |
| Floating AI assistant | Robot visible, blue speech bubble, close button, pulse idle | Robot, bubble, close, unread badge and pulse | Bubble was too plain and body text missing | Added hint body, bubble tail, halo, compact robot sizing | Assistant visible on desktop/tablet/mobile and not causing overflow | 72 | 88 |
| Background / global spacing | Pale scientific workspace with blue glow and subtle patterns | Light blue scientific background with CSS molecule/formula pattern | Background was flatter and first viewport too sparse | Added subtle pattern/glows and tightened page gaps | No horizontal overflow, first viewport shows hero, quick access, task/progress/weak cards | 76 | 88 |
| Typography / icon style | Navy headings, medium-bold readable labels, blue icon style | Reduced heading weights and improved icon treatments | Type was too heavy and some icons too flat | Lowered selected font weights/sizes, subject icon colors | Readability preserved, no text clipping | 76 | 87 |

## Strict Verdict

Estimated visual parity after UI-PROD-2: 87%.

The dashboard is above the 85% threshold for the next milestone, but not at pixel-level parity. The remaining gap is asset fidelity: approved hero/media/anatomy/thumbnail art is more photographic and dimensional than the clean SVG/CSS replacements currently allowed.
