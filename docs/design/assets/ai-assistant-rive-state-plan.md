# AI Assistant Rive State Plan

Date: 2026-07-07

## Scope

This is a future animation plan for the Allchemist AI assistant. Sprint #2 creates only static SVG foundations and does not implement Rive.

## States

- `idle`: assistant rests in the lower-right widget with subtle breathing motion.
- `blink`: short eye blink while idle.
- `wave`: greeting animation when the dashboard first opens or the assistant is expanded.
- `thinking`: slow pulse and small head movement while generating a hint.
- `hint`: assistant points to or highlights a suggested action.
- `success`: brief positive glow after a task is completed.
- `warning`: restrained amber/blue attention state for important guidance.
- `chat-open`: expanded assistant panel state with calm active expression.
- `closed/minimized`: compact robot-only bubble state.

## Future Requirements

- Keep text real HTML outside the animation.
- Keep the widget safe-area aware.
- Do not overlap fixed navigation in mobile implementations.
- Provide reduced-motion fallback.
- Use static SVG/PNG fallback if Rive fails to load.
