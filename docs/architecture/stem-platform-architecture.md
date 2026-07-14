# STEM Platform Architecture

## Architecture intent

Allchemist must support subject-specific scientific experiences through a common platform shell. Chemistry, Physics, and Biology should share user identity, access, progress, content QA, analytics, assignments, live lessons, and AI tutoring, while keeping their scientific engines separate.

## Layer model

```text
Product apps
  web, admin, mobile

Experience layer
  interactive-player, simulation-player, live-lesson-core, ui

Subject engines
  chemistry-lab-engine, physics-sim-engine, biology-lab-engine

Subject data cores
  chemistry-core, physics-core, biology-core, science-core

Platform cores
  content-core, source-core, content-qa-core, assessment-core,
  ai-tutor-core, progress-core, access-core, monetization-core, analytics-core

API and persistence
  FastAPI routes, services, database, content packs, audit logs
```

## Subject-neutral player

The shared player should provide layout, timeline controls, accessibility, hints, pause/step/reset, attempt state, telemetry, and fallback behavior. It should not know chemistry-specific concepts such as precipitate or reagent, and should not know biology-specific microscope details or physics-specific formulas.

Subject engines adapt their data contracts into player events.

## Chemistry architecture

Chemistry data should include reagents, conditions, products, observations, hazards, source metadata, molecular links, pH/status, and timeline events. The lab engine converts this verified data into renderable events such as color transition, precipitate formation, gas bubbles, heat/cooling indicator, safety note, and molecular mode updates.

## Physics architecture

Physics simulation data should include variables, units, formulas, constraints, initial state, allowed controls, graph definitions, expected observations, and assessment hooks. The physics engine computes state changes and graph points from declared models.

## Biology architecture

Biology observation data should include sample metadata, preparation, stain, magnification levels, labels, structures, focus/zoom behavior, educational simplifications, and source references. The biology engine maps this to microscope, cell, anatomy, and genetics experiences.

## AI tutor architecture

AI tutor must use content, progress, role, access, and source context. It may explain, hint, recommend, and draft. It must not publish. It must not fabricate source-backed facts. Any generated task or explanation that becomes durable content must pass Content QA.

## Assessment architecture

Assignments, exams, practice tasks, diagnostics, and generated tasks should share attempt, scoring, rubric, feedback, and progress contracts. Subject-specific scoring can live in subject packages, but attempts and reports should be platform-level.

## Progress and analytics

Learning events should include actor, role, subject, module, content item, activity type, result, duration, device, source app, and access context. Reports should aggregate from event streams rather than from UI-only counters.

## Live lesson architecture

Live lessons should connect teacher sessions, rosters, notifications, learner joins, activity events, and closeout reports. The live layer should be subject-neutral and able to host chemistry labs, physics simulations, biology observations, assignments, or AI-guided activities.
