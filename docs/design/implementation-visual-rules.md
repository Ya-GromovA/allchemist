# Implementation Visual Rules

## Source Control

- Approved Figma node `2:7` is the visual source of truth for the current migration stage.
- Do not implement product screens from memory, draft references, legacy static screenshots or generated screenshots.
- If a screen has no approved reference, do not invent its final visual design.

## Component Rules

- Build real components, layouts, states and interactions.
- Do not paste reference screenshots into the app as UI.
- Use shared sidebar, topbar, cards, tabs, metric, table, status and assistant components.
- Do not create one-off logo/sidebar variants per screen.
- Keep global sidebar stable; place subject-specific tools in top module tabs.
- Keep admin tables readable and dense enough for operational use.

## Visual Rules

- Use light readable workspaces for dashboards, modules and admin.
- Use deep blue/science blue sidebars, not black.
- Use glow sparingly as an accent, not as a full-page neon treatment.
- Chemistry, Physics and Biology must keep their subject accents.
- Text must not overlap or overflow containers.
- Buttons and cards must remain stable across desktop and mobile widths.
- Scientific canvases may be rich, but controls around them must stay clear and accessible.

## Verification Rules

- Before claiming a screen is visually ready, capture screenshots.
- Compare screenshots against the approved Figma reference.
- Document all deviations and why they exist.
- Run `node tools/verify-contract-layer.mjs`.
- Run `node tools/verify-ui-foundation.mjs`.
