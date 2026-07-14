# Navigation System Lock

Source of truth: approved Figma node `2:7`.

## User Web Sidebar

Logo is fixed across all user web screens:

- Primary text: `Алхимик`
- Subtitle: `STEM-платформа`
- The logo must not change per screen or per subject.

Strict sidebar order:

- Главная
- Мои курсы
- Теория
- Задания
- Лаборатории
- Визуализация
- Справочники
- Экзамены
- Диагностика
- AI-наставник
- Прогресс
- Сообщения
- Настройки

Rules:

- Do not change the sidebar order without explicit approval.
- Do not make the sidebar black.
- Sidebar must be deep blue / science blue.
- Active item must use blue/cyan highlight.
- Subject-specific tools belong in module top tabs, not as global-sidebar mutations.

Visualization section may include:

- 3D-молекулы
- Симуляторы
- Микроскоп
- 3D-клетка
- Анатомия

References section may include:

- Таблица элементов
- Формулы
- Биологические схемы
- Справочник веществ

## Subject Module Top Navigation

Chemistry tabs, strict order:

- Обзор
- Теория
- Лаборатории
- Реакции
- 3D-молекулы
- Таблица элементов
- Задания
- Экзамены
- Прогресс

Physics tabs, strict order:

- Обзор
- Теория
- Симуляторы
- Лабораторные
- Формулы
- Графики
- Задания
- Экзамены
- Прогресс

Biology tabs, strict order:

- Обзор
- Теория
- Микроскоп
- 3D-клетка
- Анатомия
- Генетика
- Практика
- Задания
- Экзамены
- Прогресс

## Mobile Bottom Navigation

Strict order:

- Главная
- Модули
- Задания
- AI
- Профиль

Rules:

- Fixed bottom tab bar.
- Safe-area aware.
- Works on iPhone and Android screen sizes.
- Touch targets are at least `44x44px`.
- Icons use one outline style.
- Active item is highlighted blue/cyan.
- Inactive items are muted.
- Do not add `Live-урок` to bottom navigation.
- Live lesson must be available from dashboard card and quick access, not as a permanent bottom tab.
- AI assistant floating bubble must not overlap bottom navigation.

## Admin Sidebar

Admin logo follows the Allchemist identity and may include `Admin` label, as in the approved admin references.

Strict admin sidebar order:

- Обзор
- Школы
- Пользователи
- Роли и доступы
- Лицензии и платежи
- Модули
- Учебный контент
- Content QA
- Источники
- Live-уроки
- AI-наставник
- Аналитика
- Ошибки
- Журнал действий
- Настройки

Admin rules:

- Admin must not copy the student dashboard layout.
- Admin workspace must be light and highly readable.
- Admin sidebar must be deep blue, not black.
- Admin must look like serious premium SaaS/STEM software.
