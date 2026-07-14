# Student Dashboard Approved Zone Map

Reference:

- `APPROVED_WEB_STUDENT_DASHBOARD`
- `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`

## A. Sidebar

Approved signals:

- deep blue gradient;
- Allchemist logo lockup: `Алхимик`, `STEM-платформа`;
- menu items: `Главная`, `Мои курсы`, `Теория`, `Задания`, `Лаборатории`, `Визуализация`, `Справочники`, `Экзамены`, `Диагностика`, `AI-наставник`, `Прогресс`, `Сообщения`, `Настройки`;
- active menu item with bright blue fill;
- extended license card;
- collapse menu control.

Implementation mapping:

- `StudentSidebar`
- typed `sidebarItems`
- asset-backed logo mark and navigation icons

## B. Topbar

Approved signals:

- greeting: `Здравствуйте, Алина!`;
- subtitle: `Продолжим обучение с того места, где ты остановилась.`;
- search field;
- notification icon;
- calendar icon;
- learner profile with avatar/name/grade.

Implementation mapping:

- `StudentTopbar`
- typed learner data and topbar copy

## C. Hero Row

Approved signals:

- `Продолжить обучение` chemistry card with flask visual and progress;
- `Ближайший live-урок` physics card with Newton cradle visual;
- `AI-рекомендации` list card.

Implementation mapping:

- `ContinueLearningCard`
- `LiveLessonCard`
- `AIRecommendationCard`
- typed images from public assets

## D. Quick Access Strip

Approved signals:

- `Теория`;
- `Задания`;
- `Лаборатории`;
- `3D-молекулы`;
- `Таблица элементов`;
- `Симуляторы`;
- `Микроскоп`;
- `Экзамены`;
- `AI-наставник`.

Implementation mapping:

- `QuickAccessGrid`
- typed `quickAccess`

## E. Middle Content Grid

Approved signals:

- teacher tasks;
- circular progress rings;
- weak topics list.

Implementation mapping:

- `TeacherTasksCard`
- `ProgressRingGroup`
- `WeakTopicsCard`

## F. Bottom Content Grid

Approved signals:

- popular content with image thumbnails;
- weekly progress mini chart;
- locked basic-license anatomy card;
- floating AI assistant.

Implementation mapping:

- `PopularContentCard`
- `WeeklyProgressCard`
- `LockedFeatureCard`
- `FloatingAssistant`

## G. Visual Style

Approved signals:

- light working area;
- soft blue/cyan background;
- white cards;
- rounded 8-12px card corners;
- subtle borders;
- soft shadows;
- blue/purple gradient buttons;
- scientific image cards;
- small icons;
- readable Russian text.

Implementation mapping:

- `ApprovedStudentDashboard.module.css`
- `packages/design-tokens` color direction
- existing public-safe assets in `apps/web/public/design-assets/student-dashboard/clean`
