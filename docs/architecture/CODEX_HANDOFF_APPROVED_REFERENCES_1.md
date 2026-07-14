# Codex Handoff — APPROVED-REFERENCES-1

## 1. Executive summary

Prepared canonical storage for approved UI reference PNG files under `apps/web/public/design-preview/*`, added a machine-readable manifest, a human-readable manifest, and a validation script.

No backend, mobile, nginx, systemd, docker, or production routes were changed. No commit was created.

Current result: `student-dashboard` is present. Seven references are missing. The validation script exits with code `1` because three missing references are critical for the nearest science visual parity tasks.

## 2. Created folders

- `apps/web/public/design-preview/student-dashboard`
- `apps/web/public/design-preview/chemistry-lab`
- `apps/web/public/design-preview/physics-simulation`
- `apps/web/public/design-preview/biology-microscope`
- `apps/web/public/design-preview/ai-assistant`
- `apps/web/public/design-preview/admin-dashboard`
- `apps/web/public/design-preview/admin-content-qa`
- `apps/web/public/design-preview/landing`

## 3. Created files

- `docs/design/APPROVED_REFERENCES_MANIFEST.md`
- `docs/design/approved-references.manifest.json`
- `tools/check-approved-references.mjs`
- `docs/architecture/CODEX_HANDOFF_APPROVED_REFERENCES_1.md`

## 4. Reference status

| ID | Status | Dimensions | Critical | Expected path |
| --- | --- | --- | --- | --- |
| `student-dashboard` | PRESENT | 1672x941 | yes | `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png` |
| `chemistry-lab` | MISSING | n/a | yes | `apps/web/public/design-preview/chemistry-lab/golden-approved-web-chemistry-lab.png` |
| `physics-simulation` | MISSING | n/a | yes | `apps/web/public/design-preview/physics-simulation/golden-approved-web-physics-simulation.png` |
| `biology-microscope` | MISSING | n/a | yes | `apps/web/public/design-preview/biology-microscope/golden-approved-web-biology-microscope.png` |
| `ai-assistant` | MISSING | n/a | no | `apps/web/public/design-preview/ai-assistant/golden-approved-ai-assistant.png` |
| `admin-dashboard` | MISSING | n/a | no | `apps/web/public/design-preview/admin-dashboard/golden-approved-admin-dashboard.png` |
| `admin-content-qa` | MISSING | n/a | no | `apps/web/public/design-preview/admin-content-qa/golden-approved-admin-content-qa.png` |
| `landing` | MISSING | n/a | no | `apps/web/public/design-preview/landing/golden-approved-web-landing-main.png` |

## 5. Validation command

Command:

```bash
node tools/check-approved-references.mjs
```

Result: FAIL, expected until missing critical PNG files are uploaded.

Output:

```text
Approved UI references check
Manifest: /root/synapse/docs/design/approved-references.manifest.json

PRESENT student-dashboard    1672x941     critical apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png
MISSING chemistry-lab        n/a          critical apps/web/public/design-preview/chemistry-lab/golden-approved-web-chemistry-lab.png (File not found)
MISSING physics-simulation   n/a          critical apps/web/public/design-preview/physics-simulation/golden-approved-web-physics-simulation.png (File not found)
MISSING biology-microscope   n/a          critical apps/web/public/design-preview/biology-microscope/golden-approved-web-biology-microscope.png (File not found)
MISSING ai-assistant         n/a          non-critical apps/web/public/design-preview/ai-assistant/golden-approved-ai-assistant.png (File not found)
MISSING admin-dashboard      n/a          non-critical apps/web/public/design-preview/admin-dashboard/golden-approved-admin-dashboard.png (File not found)
MISSING admin-content-qa     n/a          non-critical apps/web/public/design-preview/admin-content-qa/golden-approved-admin-content-qa.png (File not found)
MISSING landing              n/a          non-critical apps/web/public/design-preview/landing/golden-approved-web-landing-main.png (File not found)

Summary: 1/8 present, 7 missing.

Missing critical approved references:
- chemistry-lab: apps/web/public/design-preview/chemistry-lab/golden-approved-web-chemistry-lab.png
- physics-simulation: apps/web/public/design-preview/physics-simulation/golden-approved-web-physics-simulation.png
- biology-microscope: apps/web/public/design-preview/biology-microscope/golden-approved-web-biology-microscope.png
```

## 6. Upload paths

Upload missing approved PNG files to:

- `apps/web/public/design-preview/chemistry-lab/golden-approved-web-chemistry-lab.png`
- `apps/web/public/design-preview/physics-simulation/golden-approved-web-physics-simulation.png`
- `apps/web/public/design-preview/biology-microscope/golden-approved-web-biology-microscope.png`
- `apps/web/public/design-preview/ai-assistant/golden-approved-ai-assistant.png`
- `apps/web/public/design-preview/admin-dashboard/golden-approved-admin-dashboard.png`
- `apps/web/public/design-preview/admin-content-qa/golden-approved-admin-content-qa.png`
- `apps/web/public/design-preview/landing/golden-approved-web-landing-main.png`

After upload, run:

```bash
node tools/check-approved-references.mjs
```

## 7. Git status snapshot

```text
?? apps/web/public/design-preview/
?? docs/design/APPROVED_REFERENCES_MANIFEST.md
?? docs/design/approved-references.manifest.json
?? tools/check-approved-references.mjs
```

Note: `docs/architecture/CODEX_HANDOFF_APPROVED_REFERENCES_1.md` is created by this handoff and may also appear as untracked after this file is written.

## 8. Next required action

Upload missing PNG files to the exact expected paths. The next implementation milestone should not rely on visual parity for missing critical references until `node tools/check-approved-references.mjs` passes.
