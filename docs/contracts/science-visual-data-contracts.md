# Science Visual Data Contracts

This document separates current backend reality from future-required contracts for data-driven scientific visualization.

## Current contracts found

| Area | Current fields |
| --- | --- |
| Molecules | `/content/molecules` returns `id`, `name`, `formula`, `atoms` from `data_json`/`atoms` |
| Reactions | `/content/reactions` returns `id`, `title`, `equation`, `conditions`, `reactants`, `products` from `data_json`/JSONB |
| Chemistry layers | `/content/layers/chemistry/report` reports layer pack status/counts, not visualization details |
| Periodic/content catalog | `/content/platform-catalog` lists subjects, sections, content types, asset keys, QA metadata |
| Physics | SQL schema has `physics_scenarios` with `topic`, `title`, `description`, `formula`, `payload/json_payload`; no typed endpoint inventory beyond catalog/task payloads |
| Biology | Catalog declares microscope/cell/anatomy intent, but no typed biology visual endpoint was found |
| Labs | `LabOut` schema has `labType`, `safetyNotes`, and generic `payload`; not a complete subject-specific visual contract |

## Future-required chemistry contracts

| Contract | Required fields | Current status |
| --- | --- | --- |
| Reaction identity | ID, equation, reversible flag, stoichiometry, source references, verification status | partial |
| Reagents | substance IDs, concentration, state, amount, hazard, source | missing/partial in generic reactants |
| Products | substance IDs, state, amount/relative output, source | missing/partial in generic products |
| Real solution color | color name, color value, condition, concentration/range, source, verification status | missing |
| Color change | from/to colors, timeline step, trigger, condition, source | missing |
| Precipitate | substance ID, color/appearance, amount/intensity, timeline step, source | missing |
| Gas release | gas substance ID, visible bubbles flag/intensity, safety note, source | missing |
| Odor | text label/safety note only, source, hazard level | missing |
| pH/status | pH value/range, indicator color if used, condition, source | missing |
| Heating/cooling | energy/temperature metadata, condition, timeline event, source | missing |
| Molecular mode | mapping between reaction species and molecule structures, step-level changes | partial molecules only |
| Safety | PPE, hazard statements, classroom restrictions, disposal notes | partial through generic `safetyNotes` |

## Future-required physics contracts

| Contract | Required fields | Current status |
| --- | --- | --- |
| Simulation model | model ID, variables, units, formula set, constraints, source | partial through `physics_scenarios` |
| Adjustable parameters | min/max/default/unit, learner-facing label, safe range | missing |
| Graphs | axes, units, computed series, formula link, update cadence | missing |
| Forces/energy/circuits/waves | subject-specific state schemas and validation | missing |
| Observations | expected observation, misconception hints, assessment hooks | missing |

## Future-required biology contracts

| Contract | Required fields | Current status |
| --- | --- | --- |
| Microscope sample | sample ID, organism/tissue, preparation, stain, magnification, source | missing |
| Focus/zoom | zoom levels, focus states, labels visible by level | missing |
| Cell viewer | organelles, labels, 2D/3D model refs, simplification notes | missing |
| Anatomy viewer | structure hierarchy, labels, model refs, source, level/grade | missing |
| Genetics task | genotype/phenotype model, rules, answer validation, source | missing |

## Cross-cutting visual contract fields

Every future visualization contract should include `id`, `subject`, `contentVersion`, `sourceRefs`, `verificationStatus`, `reviewerIds`, `educationalModel`, `safetyNotes`, `fallbackMode`, `telemetryEvents`, and `lastReviewedAt`.

Do not render real scientific effects from random values or hardcoded animation assumptions.
