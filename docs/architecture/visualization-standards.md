# Visualization Standards

## Design direction

Allchemist should look like a modern premium STEM platform: clear, precise, elegant, responsive, and focused on learning. Visual richness is welcome only when it helps understanding.

Do not copy the legacy visual style. Preserve behavior and contracts, not appearance.

## Learning-first animation

Animations must answer at least one of these questions: what changed, why it changed, which variable caused the change, what the learner should notice, or what the safety/scientific implication is.

Decoration that competes with learning should be removed.

## Data-driven rendering

Visual effects must come from data contracts. Random or hardcoded effects are allowed only for non-scientific placeholders clearly marked as placeholders and not shipped as factual educational output.

## Subject themes

| Subject | Theme intent |
| --- | --- |
| Chemistry | Lab clarity, reaction states, safety accents, molecule focus |
| Physics | Coordinate systems, graphs, parameters, forces, waves, circuits |
| Biology | Observation, microscope depth, labels, samples, anatomy/cell structure |
| AI tutor | Calm guidance, explanation hierarchy, source confidence |
| Admin | Dense operational clarity, scanning, tables, alerts, state badges |

Subject themes must share design tokens and accessibility standards.

## Heavy media standards

- Heavy 3D must be lazy-loaded.
- Rive/Lottie/Three runtimes must not be global defaults.
- Use placeholders and static previews before loading heavy modules.
- Provide weak-device fallbacks.
- Provide reduced-motion alternatives.
- Complex modules may recommend landscape orientation on mobile.
- Web and mobile should share data contracts even if renderers differ.

## Accessibility

- Preserve keyboard navigation for web controls.
- Provide text labels for icons and scientific states.
- Do not rely on color alone to communicate state.
- Ensure graphs, formulas, warnings, and labels have readable alternatives.
- Respect reduced motion preferences.

## Admin visual standards

Admin screens should be information-dense and operational, not marketing-style. Use tables, filters, status badges, charts, alert rows, and detail drawers. Hero-like promotional composition should not dominate admin workflows.

## Scientific visual constraints

- Smell is text/safety metadata, not visual effect.
- Gas release requires gas identity.
- Precipitation requires precipitate data.
- Color requires verified metadata and conditions.
- Heating/cooling requires declared condition or educational model.
- Microscope labels require sample/magnification context.
- Physics graphs must come from model state.
