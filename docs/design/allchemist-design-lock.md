# Allchemist Design Lock

Source of truth: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
Approved node: `2:7` / `06_APPROVED_FOR_CODEX`

## Locked Visual Direction

Allchemist must feel like a premium AI/STEM EdTech platform for long study and operational sessions:

- Russian interface first.
- Modern scientific product, not a toy.
- Premium and calm, not childish, not acidic, not overly neon.
- Light, readable workspaces for student, teacher, parent and admin workflows.
- Deep blue / science blue sidebars; never pure black.
- Soft blue, cyan and violet glow only as accent.
- Cards use restrained radius, visible borders and soft shadows.
- Scientific visuals are rich, but surrounded by clean controls and readable text.
- The same Allchemist identity must carry across public, student, subject, admin and mobile surfaces.

## Subject Accent Lock

- Chemistry: cyan/violet/glass/liquid glow, realistic lab glass, molecule hints, pH/temperature/safety panels.
- Physics: electric blue/purple, graphs, vectors, grids, formulas and parameter sliders.
- Biology: green/teal, microscope/cells/specimens, observation labels and practice panels.

## Surface Direction

- Public landing may use a deeper immersive blue hero.
- Student, subject and admin workspaces stay primarily light.
- Mobile first view uses light premium cards, clear top controls and a fixed safe-area-aware bottom tab bar.
- Sidebar is deep blue/science blue with cyan/blue active highlight.
- Admin UI must be a serious SaaS/STEM console, not a student dashboard clone.
- AI assistant can glow, but must remain compact and non-blocking.

## Mobile Direction

- `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW` is the first-viewport dashboard lock.
- `APPROVED_MOBILE_LOADING_SCREEN` is the launch/loading lock.
- The old long mobile dashboard is reference-only for below-the-fold content if encountered.
- Mobile bottom navigation is locked globally: `Главная`, `Модули`, `Задания`, `AI`, `Профиль`.
- Do not put the live lesson video player on the dashboard; dashboard only shows compact live lesson entry/status.

## Implementation Lock

- Do not invent a new visual style.
- Do not copy legacy static `web_admin` or `web_public` visuals.
- Do not overfit tokens to one screen; use reusable semantic tokens.
- New product screens must be implemented with real components, not pasted screenshots.
- Future Rive/Lottie/Three.js should be lazy-loaded and optional at widget/route boundaries.
- Future mobile screens must compare first viewport screenshots against the approved mobile first-view reference.
