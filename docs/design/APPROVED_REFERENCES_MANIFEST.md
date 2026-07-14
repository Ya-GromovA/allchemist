# Approved References Manifest

This document defines canonical storage paths for approved UI reference PNG files used by Codex and Playwright visual parity checks.

Root: `/root/synapse`

## Canonical Folders

| Folder | Purpose |
| --- | --- |
| `apps/web/public/design-preview/student-dashboard` | Student dashboard approved references and extracted assets |
| `apps/web/public/design-preview/chemistry-lab` | Chemistry lab approved reference |
| `apps/web/public/design-preview/physics-simulation` | Physics simulation approved reference |
| `apps/web/public/design-preview/biology-microscope` | Biology microscope approved reference |
| `apps/web/public/design-preview/ai-assistant` | AI assistant approved reference |
| `apps/web/public/design-preview/admin-dashboard` | Admin dashboard approved reference |
| `apps/web/public/design-preview/admin-content-qa` | Admin Content QA approved reference |
| `apps/web/public/design-preview/landing` | Web landing approved reference |

## Reference Status

| ID | Title | Expected path | Related route | Required for milestone | Status | Dimensions | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `student-dashboard` | Approved Web Student Dashboard | `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png` | `/design-preview/student-dashboard`, `/dashboard/student` | nearest visual parity milestone | PRESENT | 1672x941 | Canonical golden PNG is present and readable. |
| `chemistry-lab` | Approved Web Chemistry Lab | `apps/web/public/design-preview/chemistry-lab/golden-approved-web-chemistry-lab.png` | `/modules/chemistry/lab/zinc-hcl` | nearest visual parity milestone | MISSING | n/a | Upload the approved chemistry lab reference to the expected path. |
| `physics-simulation` | Approved Web Physics Simulation | `apps/web/public/design-preview/physics-simulation/golden-approved-web-physics-simulation.png` | `/modules/physics/simulation/uniform-acceleration` | nearest visual parity milestone | MISSING | n/a | Upload the approved physics simulation reference to the expected path. |
| `biology-microscope` | Approved Web Biology Microscope | `apps/web/public/design-preview/biology-microscope/golden-approved-web-biology-microscope.png` | `/modules/biology/microscope/onion-skin` | nearest visual parity milestone | MISSING | n/a | Upload the approved biology microscope reference to the expected path. |
| `ai-assistant` | Approved AI Assistant | `apps/web/public/design-preview/ai-assistant/golden-approved-ai-assistant.png` | shared assistant states | assistant visual parity milestone | MISSING | n/a | Upload the approved AI assistant states reference to the expected path. |
| `admin-dashboard` | Approved Admin Dashboard | `apps/web/public/design-preview/admin-dashboard/golden-approved-admin-dashboard.png` | `/admin/dashboard`, `/dashboard` | admin visual parity milestone | MISSING | n/a | Upload the approved admin dashboard reference to the expected path. |
| `admin-content-qa` | Approved Admin Content QA | `apps/web/public/design-preview/admin-content-qa/golden-approved-admin-content-qa.png` | `/admin/content-qa`, `/content-qa` | admin content QA visual parity milestone | MISSING | n/a | Upload the approved admin Content QA reference to the expected path. |
| `landing` | Approved Web Landing Main | `apps/web/public/design-preview/landing/golden-approved-web-landing-main.png` | `/` | landing visual parity milestone | MISSING | n/a | Upload the approved landing reference to the expected path. |

## Critical References

The checker fails with exit code `1` while any of these references are missing:

- `student-dashboard`
- `chemistry-lab`
- `physics-simulation`
- `biology-microscope`

## Validation

Run:

```bash
node tools/check-approved-references.mjs
```

Expected current result: FAIL, because `chemistry-lab`, `physics-simulation`, and `biology-microscope` are missing.

## Upload Instructions

Place the approved PNG files at the exact expected paths listed above. Do not rename them after upload. After uploading, run:

```bash
node tools/check-approved-references.mjs
```

The script checks file presence, PNG readability, dimensions from the PNG header, and critical-reference completeness.
