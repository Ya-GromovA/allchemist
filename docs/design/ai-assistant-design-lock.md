# AI Assistant Design Lock

Approved reference: `5:15`, `approved_ai_assistant`.

## Character

The AI assistant must be:

- Friendly but technological.
- Suitable for pupils, students, teachers and parents.
- Premium and helpful, not childish or toy-like.
- Visually connected to Allchemist blue/cyan/violet science language.
- Compact enough to coexist with dashboards, lab panels and admin tables.

## Required UI Pieces

- Compact floating button/avatar.
- Bubble.
- Hint card.
- Open chat panel.
- Mobile compact variant.

## Required States

- idle
- blink
- wink
- smile
- thinking
- hint
- warning
- success
- typing
- chat open

## Behavior Lock

- Place as a floating widget in the lower-right corner on desktop.
- On mobile, use a compact floating or bottom-navigation-compatible variant.
- Assistant must not block primary controls, safety warnings, payments, QA actions or form submission.
- Initially implement lightweight CSS/state animations.
- Rive/Lottie may be added later lazily.
- Any animated asset must have reduced-motion behavior.
