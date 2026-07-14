# Mobile Design Lock

Source: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
Approved page/node: `2:7`, `06_APPROVED_FOR_CODEX`

## Approved Mobile References

- `10:19`, `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`
- `10:20`, `APPROVED_MOBILE_LOADING_SCREEN`

## Dashboard First View Rule

The approved mobile dashboard reference is a first viewport, not the full scroll page. It locks the immediately visible mobile structure:

- mobile status/top identity area;
- logo, search, notification and profile controls;
- continue-learning hero card;
- compact nearest live lesson card/status;
- quick access row;
- progress section;
- compact AI assistant bubble;
- fixed bottom tab bar.

The old long mobile dashboard, if it appears in earlier docs or exports, is reference-only for below-the-fold content. It must not be treated as the first viewport lock.

## Mobile Bottom Navigation Lock

Strict order:

- Главная
- Модули
- Задания
- AI
- Профиль

Rules:

- Fixed bottom tab bar.
- Safe-area aware on iPhone and Android.
- Touch targets are at least `44x44px`.
- Icons use one outline style.
- Active item is highlighted blue/cyan.
- Inactive items are muted.
- Do not add `Live-урок` to bottom navigation.
- Live lesson must be available from a dashboard card and quick access, not as a permanent bottom tab.
- AI assistant floating bubble must not overlap bottom navigation.

## Live Lesson Mobile Rule

- Dashboard shows compact entry card/status only.
- Actual video lesson opens on a separate route/screen.
- Do not place the video player on the dashboard.

## Loading Screen Lock

Use `10:20`, `APPROVED_MOBILE_LOADING_SCREEN` as the launch/loading reference.

Loading stages, strict order:

- Загрузка профиля
- Проверка доступов
- Загрузка модулей
- Подготовка лабораторий
- Подготовка симуляторов
- Подготовка микроскопа
- Загрузка офлайн-данных
- Готово

Visual rules:

- Premium light STEM loading screen.
- Allchemist logo and `STEM-платформа` label remain prominent.
- Chemistry, physics and biology motifs may appear together.
- Progress card must be readable and calm.
- Loading state text must be Russian-first.
- Loading screen is not a place for ads, payment prompts or unrelated onboarding.

## Implementation Guardrails

- Do not implement mobile screens until explicitly requested.
- Do not modify mobile app behavior as part of design-lock updates.
- Future mobile implementation must compare first viewport screenshots against `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`.
- Future loading implementation must compare launch/loading screenshots against `APPROVED_MOBILE_LOADING_SCREEN`.
