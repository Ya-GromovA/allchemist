# Allchemist Product Specification

## Product identity

Allchemist is a scientifically grounded interactive AI/STEM learning platform for Chemistry, Physics, and Biology. It helps learners understand complex scientific systems through verified content, interactive simulations, role-based learning workflows, AI tutoring, assignments, exams, reports, and school/individual access models.

Allchemist is not a static video library, a simple quiz application, a chemistry-only tool, a legacy UI redesign, or a decorative animation showcase.

## Product principles

- Scientific truth comes before visual spectacle.
- Chemistry, Physics, and Biology are first-class modules.
- Every visualization must be driven by verified data contracts.
- AI can assist drafting, explaining, and personalizing, but AI output cannot bypass Content QA.
- School workflows and individual subscriptions must coexist.
- Web and mobile experiences should share contracts and domain logic.
- Legacy production behavior should be preserved while new architecture is built in parallel.

## Platform modules

| Module | Product responsibility |
| --- | --- |
| Chemistry | Virtual lab, reactions, reagents, molecules, periodic table, safety notes, reaction packs, exam prep |
| Physics | Interactive simulations, motion, forces, energy, optics, electricity, circuits, waves, graphs, formulas |
| Biology | Virtual microscope, samples, zoom/focus, labels, cell viewer, 3D cell, anatomy viewer, genetics tasks |
| AI tutor | Explanations, next-step recommendations, generated practice, diagnostic support, context-aware help |
| Live lessons | Teacher-led sessions, roster, participation events, notifications, lesson closeout |
| Assignments | Teacher-created or system-created tasks, due states, attempts, feedback, reports |
| Exams | Blueprints, generated variants, ticket analysis, diagnostics, preparation flows |
| Progress | Learning events, sync, analytics, weak topics, achievements, teacher/parent visibility |
| Reports | Student, class, school, owner, monetization, content QA, platform health reports |
| Subscriptions | Individual plans, module purchases, feature unlocks, grants, revoke, payment audit |
| School licenses | School/site/class access, school codes, invites, rosters, license limits, school analytics |
| Admin panel | Operational control center for users, schools, licenses, QA, sources, modules, logs, security |
| Owner dashboard | Strategic analytics, revenue, conversion, retention, QA throughput, risk and release readiness |

## User roles

| Role | Expected capabilities |
| --- | --- |
| student / pupil | Study modules, solve tasks, use AI tutor, view progress, use allowed labs/simulations |
| university student | Use deeper content, advanced simulations, exam and self-study workflows |
| parent | View child progress, gaps, recommendations, subscriptions, notifications |
| teacher | Manage classes, assign work, review progress, start live lessons, notify learners |
| class teacher | Manage homeroom roster, progress, devices, parent-facing visibility |
| school admin | Manage school users, classes, invites, licenses, school analytics |
| system admin | Operate platform, users, security, payments, legal, audit, mobile readiness |
| content author | Create draft content, attach sources, prepare visual metadata |
| methodist | Review educational quality, curriculum fit, task quality, age/grade suitability |
| reviewer | Verify scientific accuracy, source support, safety notes, visualization data |
| owner | See owner dashboard, strategic metrics, revenue, risk gates, release readiness |

## Chemistry capabilities

Chemistry must support a virtual lab where learners select reagents and observe reaction timelines. The experience should include color change, precipitation, gas release, bubbles, heating/cooling, pH/status indicators, molecular mode, periodic table integration, 3D molecule viewing, safety notes, and reaction packs.

Every visible reaction effect must come from reaction metadata. A precipitation animation requires a precipitate definition. A gas effect requires gas identity. Color changes require verified color metadata. Heating/cooling must come from reaction conditions or experiment steps. Safety warnings must be explicit content, not inferred decoration.

## Physics capabilities

Physics must support simulations for motion, forces, energy, optics, electricity, circuits, waves, graphs, formulas, and adjustable parameters. Simulations should be packaged as simulation packs with declared variables, units, formulas, constraints, expected observations, and assessment hooks.

A physics animation must expose what is changing and why. Graphs and formulas should be linked to simulation state rather than drawn as static decoration.

## Biology capabilities

Biology must support virtual microscope workflows, microscope samples, zoom/focus controls, labels, cell viewer, 3D cell, anatomy viewer, genetics tasks, and biology observation packs.

Biology visuals must distinguish observed structures, labels, zoom level, sample preparation, staining, and educational simplifications. Any simplification must be declared in metadata.

## Business requirements

- School licenses with school code, invites, class membership, teacher and school admin workflows.
- Individual subscriptions and modular purchases.
- Feature access matrix by role, plan, license, module, and feature flag.
- Owner analytics for revenue, conversion, retention, activation, content QA throughput, school usage, mobile readiness, and risk gates.
- Monetization metrics for plan sales, module purchases, trials, renewals, churn, failed payments, manual grants, and webhook dead letters.

## Content requirements

All content should have subject, module, topic, grade/level, source metadata, author, lifecycle status, version, reviewer history, visual metadata, and assessment metadata where relevant.

AI-generated content may enter draft state only. Publication requires Content QA with methodist and scientific review according to risk level.

## Current implementation observations

- Existing FastAPI endpoints cover system health, content, AI mentor, progress sync, auth, user access, payments, role cabinets, admin panel, public web, and admin web serving.
- Existing `web_admin` and `web_public` are static production references for contracts and flows, not design targets.
- Existing admin API already exposes dashboard, users, schools, invites, rights, subscriptions, security, legal compliance, audit, database overview, and Content QA endpoints.
- Existing content API exposes packs, platform catalog, exam blueprints, ticket analysis, QA sources/blocks/queues/transitions, molecules, reactions, AI search, and APK metadata.
- Existing mobile project is Expo-based and should become the mobile application under the target architecture.
