# Implementation Report — Milestone 2 Visual QA

## 1. Summary

Real visual QA was completed for `approved_web_student_dashboard` on the production server workspace `/root/synapse`, using a local non-production web server and Playwright screenshots.

Both routes were checked:

- `/design-preview/student-dashboard`
- `/dashboard/student`

No production routes were switched. No commit, `git add`, `git reset`, `git clean`, backend API/service edits, legacy web edits, mobile runtime edits, or `infra/docker-compose.yml` edits were made.

## 2. Approved reference search result

Approved reference found:

- `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`

Supporting reference material found:

- `apps/web/public/design-preview/student-dashboard/approved-student-dashboard.png`
- `apps/web/public/design-preview/student-dashboard/zones/*.png`
- `docs/design/figma-approved-references.md`
- `docs/design/implementation-reports/student-dashboard-visual-parity.md`

Figma approved reference from docs:

- `APPROVED_WEB_STUDENT_DASHBOARD`
- Node `3:12`

## 3. Web server command and base URL

Build command:

```text
npm run build:web
```

Server command used:

```text
setsid /root/synapse/node_modules/.bin/next start /root/synapse/apps/web -p 3010 > /tmp/allchemist-m2-visualqa-web.log 2>&1 < /dev/null &
```

Base URL:

```text
http://127.0.0.1:3010
```

The server was stopped after checks:

```text
fuser -k 3010/tcp
```

## 4. Routes checked

| route | HTTP status | result |
| --- | ---: | --- |
| `/design-preview/student-dashboard` | 200 | PASS |
| `/dashboard/student` | 200 | PASS |

## 5. Screenshot artifacts

- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-dashboard.png`

Artifact dimensions:

- desktop: `1440 x 1539`
- tablet: `1024 x 2140`
- mobile: `390 x 4154`

## 6. Desktop visual review

PASS for basic rendering:

- deep-blue sidebar is present;
- light workspace is present;
- cyan/blue accents are present;
- Russian text renders without mojibake;
- AI assistant card is visually integrated enough for a foundation slice;
- no obvious route crash or layout overlay bug.

NOT READY for approved visual parity:

- approved reference has a richer topbar with search/profile/actions;
- approved reference has image-backed hero and live lesson cards;
- approved reference has quick access strip;
- approved reference has denser dashboard card composition;
- approved reference has floating assistant bottom-right, while current slice uses an inline assistant panel;
- current desktop is functional but visually simpler and less close to the golden reference.

## 7. Tablet visual review

PASS for basic rendering:

- content stacks cleanly;
- sidebar remains deep blue;
- cards remain readable;
- no obvious text corruption;
- no route crash.

Remaining gaps:

- tablet layout is longer and less dense than approved direction;
- assistant and task panels move into regular grid flow rather than matching the reference composition;
- card hierarchy is acceptable for foundation but not visual parity.

## 8. Mobile visual review

Initial mobile screenshot had a serious issue: the layout occupied a left-side narrow strip and hidden wide nav items extended beyond viewport.

Fix applied:

- constrained shell/sidebar/main to `max-width: 100vw`;
- added `min-width: 0` to the shell/sidebar/main path;
- changed mobile sidebar navigation from horizontal overflow to a two-column grid;
- strengthened smoke script to detect hidden wide elements, not only `documentElement.scrollWidth`.

Final mobile result:

- route renders at `390px` width;
- no hidden horizontal overflow detected by the improved smoke script;
- Russian text is readable;
- layout is long but not broken into a narrow column.

Remaining mobile gap:

- it does not yet match the approved mobile first-viewport lock from `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`.

## 9. Visual parity result

Manual visual result:

```text
NOT READY
```

Reason: screenshots render correctly and pass smoke checks, but they are not visually close enough to the approved golden reference for the student dashboard. The current slice is a safe functional foundation, not an approved visual parity implementation.

Automated pixel comparison:

```text
COMPARISON_SKIPPED
```

Reason: the existing `tools/check-visual-parity.mjs` is tied to the older student dashboard scaffold artifact path and writes reports under `docs/design`. Running it as-is would not be a clean comparison of the new Milestone 2 slice and would modify files outside this visual-QA report scope.

## 10. Fixes applied

Modified:

- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `tools/playwright-approved-ui-smoke.mjs`

Fix details:

- fixed mobile shell width behavior;
- removed mobile horizontal nav overflow by switching nav to a two-column grid;
- updated smoke script to check both routes and three viewports;
- added screenshot artifact generation for desktop/tablet/mobile;
- added route status and screenshot result reporting;
- corrected mojibake detection so normal Russian words are not treated as mojibake;
- strengthened overflow detection to catch hidden wide elements.

## 11. Commands executed

```text
find apps/web/public/design-assets apps/web/public/design-preview docs/design artifacts/ui-snapshots ...
npm run typecheck:tokens
npm run typecheck:ui
npm run typecheck:ai-assistant
npm run typecheck:web
npm run build:web
setsid /root/synapse/node_modules/.bin/next start /root/synapse/apps/web -p 3010 ...
ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs
fuser -k 3010/tcp
git status --short
```

## 12. PASS/FAIL/SKIPPED

| check | result | notes |
| --- | --- | --- |
| approved reference search | PASS | Golden reference found. |
| web server startup | PASS | `http://127.0.0.1:3010` returned HTTP 200. |
| `/design-preview/student-dashboard` | PASS | HTTP 200. |
| `/dashboard/student` | PASS | HTTP 200. |
| desktop screenshots | PASS | Preview and dashboard captured. |
| tablet screenshots | PASS | Preview and dashboard captured. |
| mobile screenshots | PASS | Preview and dashboard captured after CSS fix. |
| `npm run typecheck:tokens` | PASS | No errors. |
| `npm run typecheck:ui` | PASS | No errors. |
| `npm run typecheck:ai-assistant` | PASS | No errors. |
| `npm run typecheck:web` | PASS | No errors. |
| `npm run build:web` | PASS | Next build succeeded. |
| `node tools/playwright-approved-ui-smoke.mjs` with base URL | PASS | Six screenshots captured. |
| automated pixel comparison | SKIPPED | `COMPARISON_SKIPPED`; existing parity tool is not cleanly scoped to this slice. |

Transient failures fixed:

1. Smoke script initially reported false mojibake due to an overbroad regex. Fixed by checking actual mojibake glyph patterns.
2. Improved smoke script then detected mobile hidden overflow in nav. Fixed CSS and reran successfully.

## 13. Remaining visual gaps

- Add approved-style topbar search/profile/action cluster.
- Add approved quick-access strip.
- Add image-backed hero/live lesson/lab cards using existing clean assets.
- Move assistant closer to approved floating assistant behavior.
- Match denser approved desktop layout zones.
- Add mobile first-viewport composition from `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`.
- Add safe pixel/zone comparison for the new Milestone 2 slice.

## 14. Recommendation: ready/not ready for next milestone

Recommendation:

```text
NOT READY for the next approved UI milestone as a visual parity baseline.
```

Recommended next task:

```text
Milestone 2B — student dashboard visual convergence against golden-approved-web-student-dashboard.png, still without production route switch.
```
