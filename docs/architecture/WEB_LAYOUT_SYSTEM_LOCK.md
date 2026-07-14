# Web Layout System Lock

## Purpose

This document fixes the reusable web layout structure for Allchemist. The shell is shared across web pages; only the content inside the main workspace should change from page to page.

## Fixed Zones

- Sidebar: fixed left, constant width, deep science-blue background, fixed logo placement, fixed menu order, fixed bottom subscription/user block.
- Topbar: fixed above the content area, with layout control, search, AI button, notification button, and user profile block.
- Notification slot: always right side of topbar, before the user profile block.
- User profile slot: always rightmost topbar block with avatar, full user name, and role.
- Main background: light workspace with subtle scientific pattern.
- Content scroll: only the main content area scrolls on desktop.

## Mutable Zones

- Breadcrumbs.
- Page title and description.
- Module tabs.
- Main content section.
- Optional right aside.
- Optional bottom secondary blocks.

## Fixed Student Menu Order

1. Главная
2. Мои курсы
3. Теория
4. Задания
5. Лаборатории
6. Визуализация
7. Справочники
8. Экзамены
9. Диагностика
10. AI-наставник
11. Прогресс
12. Сообщения
13. Настройки

## Collapsible Menu Sections

`Визуализация` expands inside the sidebar:

- 3D-молекулы
- Симуляторы
- Микроскоп
- 3D-клетка
- Анатомия

`Справочники` expands inside the sidebar:

- Таблица элементов
- Формулы
- Биологические схемы
- Справочник веществ

## Components

- `MainLayout` / `AppShell`
- `Sidebar`
- `SidebarLogo`
- `SidebarMenu`
- `SidebarMenuItem`
- `SidebarSubmenu`
- `Topbar`
- `SearchBar`
- `NotificationButton`
- `UserProfileBlock`
- `Breadcrumbs`
- `PageHeader`
- `ModuleTabs`
- `ContentContainer`
- `RightAsidePanel`
- `BackgroundPatternLayer`

## Usage

Use `MainLayout` from `apps/web/components/platform-layout`:

```tsx
<MainLayout
  activeHref="/dashboard/student"
  breadcrumbs={[{ label: "Главная", href: "/dashboard/student" }, { label: "Раздел" }]}
  title="Название страницы"
  description="Краткое описание"
  tabs={[{ id: "overview", label: "Обзор" }]}
  activeTabId="overview"
  rightAside={<AsideContent />}
>
  <PageSpecificContent />
</MainLayout>
```

Do not rebuild sidebar/topbar per page. Page-specific work belongs inside the content slots.

## Example Route

- `/design-preview/platform-structure`

Smoke screenshot:

- `artifacts/ui-snapshots/layout-system/platform-structure-desktop.png`
