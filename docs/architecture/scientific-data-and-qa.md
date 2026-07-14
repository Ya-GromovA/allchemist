# Scientific Data and QA

## Non-negotiable rule

All scientific visualizations, explanations, simulations, tasks, and facts must be source-backed. If the platform cannot verify a scientific claim or visual effect, it must not publish that claim or render it as factual.

## Source-backed visualization examples

| Visualization | Required data |
| --- | --- |
| Solution color | Verified color metadata with source and conditions |
| Precipitate | Product identity, precipitate flag, color/appearance, source |
| Gas release | Gas identity, condition, safety note where needed, source |
| Bubbles | Gas release event, intensity/timeline metadata, not decorative randomness |
| Smell | Text label/safety note only, never fake visual representation |
| Heating/cooling | Reaction condition or energy/temperature metadata |
| pH/status | Declared pH/status data or measured/educational approximation |
| Molecular mode | Molecule/reaction mapping with verified structure/source metadata |
| Physics graph | Formula/model variables, units, constraints, computed state |
| Biology label | Sample structure metadata with magnification and source |

## Content lifecycle

```text
draft -> methodist_review -> scientific_review -> approved -> published
             |                    |                 |
             v                    v                 v
        needs_work           rejected/risk       archived/new_version
```

## Required metadata

Every durable content item should carry stable ID, version, subject, module, topic, level/grade, author, lifecycle status, source references, QA events, reviewer decisions, scientific risk level, visual metadata, assessment metadata where relevant, and AI-origin flag if AI helped produce it.

## Review roles

| Role | Review responsibility |
| --- | --- |
| content author | Creates draft, attaches sources, declares visuals and learning objective |
| methodist | Checks educational quality, sequence, age/level fit, curriculum usefulness |
| scientific reviewer | Checks factual accuracy, source support, visual metadata, safety notes |
| owner/system admin | Monitors QA throughput, publication risk, and release readiness |

## AI content policy

- AI-generated content starts as draft.
- AI-generated facts require source verification before approval.
- AI-generated visuals require explicit scientific metadata before rendering.
- AI can propose practice tasks, hints, explanations, and variants, but publication requires QA.
- Unsupported AI facts must be blocked from published packs and production visualizations.

## Anti-copying rule

Do not copy textbook content directly. Store source metadata, summarize in original wording, and keep licensing/usage status visible. Content QA must include source and originality checks for durable educational content.

## Versioning

Published content should be immutable by version. Corrections create a new version or revision record, preserving audit history and user progress references. Visual engines should receive a content version identifier so replay, analytics, and bug reports are traceable.

## Admin QA implications

The admin panel should expose source queues, content block queues, QA events, draft/review/approved/published status, reviewer assignment, unsupported AI facts, source gaps, visualization metadata gaps, publication blockers, QA throughput, and risk metrics.
