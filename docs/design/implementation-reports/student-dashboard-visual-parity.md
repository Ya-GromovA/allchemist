# Student Dashboard Visual Parity

Figma target: `APPROVED_WEB_STUDENT_DASHBOARD`, node `3:12`
Preview route: `/design-preview/student-dashboard`
Viewport: `1672x941`, deviceScaleFactor `1`

## Result

Visual parity: **FAIL**
Full-screen mismatch: **29.89%**
Full-screen mean delta: **23.21 / 255**
Previous full-screen mismatch: **29.89%**
Full-screen mismatch delta: **0%**
Improved vs previous: **no**

## Thresholds

- Pixel mismatch threshold: max RGB delta greater than `24`
- Full-screen provisional pass threshold: `12%`
- Zone provisional pass threshold: `22%`
- Very high zone mismatch threshold: `35%`

## Zone Summary

| Zone | Box | Mismatch | Mean delta | Status |
| --- | --- | ---: | ---: | --- |
| sidebar | 0,0,236x941 | 43.87% | 27.11 | VERY_HIGH |
| topbar | 236,0,1436x88 | 11.68% | 14.3 | OK |
| greeting/header | 268,16,360x56 | 34.75% | 41.06 | FAIL |
| first row cards | 268,92,1368x260 | 38.05% | 26.98 | VERY_HIGH |
| quick access strip | 268,366,1368x112 | 13.27% | 11.9 | OK |
| assignments card | 268,500,390x222 | 20.34% | 17.79 | OK |
| progress card | 674,500,420x222 | 20.98% | 20.23 | OK |
| weak topics card | 1110,500,526x222 | 11.74% | 11.27 | OK |
| popular now card | 268,738,390x186 | 42.27% | 48.89 | VERY_HIGH |
| weekly progress card | 674,738,330x186 | 28.9% | 30.32 | FAIL |
| locked feature card | 1020,738,430x186 | 27.86% | 27.41 | FAIL |
| AI assistant widget | 1390,735,260x190 | 55.59% | 59.16 | VERY_HIGH |

## Failing Zones

- sidebar: 43.87% (VERY_HIGH)
- greeting/header: 34.75% (FAIL)
- first row cards: 38.05% (VERY_HIGH)
- popular now card: 42.27% (VERY_HIGH)
- weekly progress card: 28.9% (FAIL)
- locked feature card: 27.86% (FAIL)
- AI assistant widget: 55.59% (VERY_HIGH)

## Top 5 Failing Zones

- AI assistant widget: 55.59% (VERY_HIGH)
- sidebar: 43.87% (VERY_HIGH)
- popular now card: 42.27% (VERY_HIGH)
- first row cards: 38.05% (VERY_HIGH)
- greeting/header: 34.75% (FAIL)

## Artifacts

- Golden: `/root/synapse/apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`
- Implementation: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-desktop-parity-1672x941.png`
- Overlay: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-overlay-check.png`
- Side-by-side: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-side-by-side.png`
- Visual diff: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-visual-diff.png`
- JSON report: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-parity-report.json`
- Zip: `/root/synapse/artifacts/ui-snapshots/student-dashboard-visual-parity.zip`

## Acceptance

The provisional visual parity check failed. Do not call this screen ready for manual review.
