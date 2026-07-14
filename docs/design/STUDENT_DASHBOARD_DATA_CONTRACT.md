# Student Dashboard Data Contract

## Purpose

This document maps every approved student dashboard UI zone to its current static typed data source and future real domain/API source. Static demo data is allowed for UI-PROD-2 visual parity work, but it must stay meaningful, deterministic, and replaceable.

| UI zone | Current static data source | Future real source | Update rules | Status rules | Empty state | Loading state | Error state | Never show |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Student profile | `learner`, `topbar.notificationCount`, sidebar `messages.badge` in `approved-student-dashboard.ts` | Auth/session profile, school roster, notifications/messages APIs | Refresh after login, profile update, notification polling | Student must belong to current account/school | Minimal profile with initials and no counters | Skeleton avatar/name/counters | Profile unavailable banner | Another student's name/avatar/counters |
| Continue learning | `currentCourses[0]`, `nextCourse` adapter field | Enrollment/progress service | Recompute when lesson/module progress changes | active/review/locked from enrollment | "Нет активного курса" CTA to courses | Hero skeleton | Course unavailable message | Random course not enrolled by student |
| Live lesson | `liveLesson` | Schedule/classroom service | Update by timetable and live-session state | upcoming/live/finished/cancelled | "Сегодня live-уроков нет" | Schedule skeleton | Calendar unavailable | Teacher/session not assigned to this student |
| AI recommendations | `aiRecommendations`, `aiHints`, `assistantContext` | AI recommendation service using learner progress and module context | Refresh after attempts, diagnostics, lab completions | hint/warning/success/typing, priority | "Рекомендаций пока нет" | AI thinking state | AI temporarily unavailable | Random advice unrelated to current module or safety level |
| Quick access | `quickAccess` | Feature registry + role/license permissions | Update when license/role/features change | available/new/locked | Hide unavailable shortcuts or show "Нет доступных разделов" | Icon grid skeleton | Feature registry unavailable | Links to disabled/nonexistent features |
| Teacher tasks | `upcomingTasks` | Assignment service by teacher/class | Update on assignment publish, submission, grading | todo/in_progress/done/overdue | "Заданий нет" | Task row skeleton | Assignment service unavailable | Tasks not assigned to this student/class |
| Progress rings | `modules`, `toModuleMetrics` | Progress/attempt tracking service | Update after every lesson/lab/task attempt | active/review/locked | "Прогресс появится после первого урока" | Ring skeleton | Progress unavailable | Aggregates from other users |
| Weak topics | `weakTopics` | Diagnostic/analytics service | Update after diagnostics and repeated mistakes | needs_review/improving/mastered | "Слабых тем пока нет" | Topic skeleton | Diagnostics unavailable | Unsupported claims without evidence |
| Popular content | `popularContent` | Content discovery service filtered by grade/license | Refresh daily or after curriculum change | experiment/simulation/model/lesson, available/locked | "Подборка скоро появится" | Thumbnail skeleton | Content unavailable | Random content outside grade/license/language |
| Weekly progress | `weeklyProgress` | Analytics aggregation by day | Update daily and after completed events | positive/neutral/negative delta | "Неделя еще не началась" | Chart skeleton | Analytics unavailable | Fabricated deltas |
| Locked feature | `lockedFeature` | License/entitlement service | Update when license changes | locked/requested/unlocked | Hide when no upsell is allowed | License skeleton | License unavailable | Upsell forbidden by school policy |
| Floating assistant | `aiHints[0]`, `assistantContext` | AI assistant state machine + current module/task context | Update by page context and chat state | idle/blink/thinking/hint/warning/success/typing/chatOpen | Collapsed assistant icon | Typing/thinking animation | Non-blocking assistant unavailable state | Sensitive/private data or unsafe lab guidance |

## Current Static Data Status

- All visible zones are backed by typed demo data or adapter-derived fields.
- Quick access and popular content now include route/type/status metadata.
- Weak topics include reasons.
- Weekly progress includes an explanation field.
- Locked feature includes required license metadata.
- UI-PROD-2 keeps all content in `approved-student-dashboard.ts`; JSX does not create random dashboard content.
- Topbar/profile/search, hero/media cards, AI recommendations, quick access, progress, weak topics, locked feature, and floating assistant are all driven by typed fields from `ApprovedStudentDashboardSource`.
- Visual CSS/SVG decoration is allowed only as non-data ornamentation; it must not imply untyped lessons, tasks, grades, or recommendations.

## Remaining Contract Gaps

- No real backend integration is wired for this route yet.
- No loading/empty/error UI states are implemented in the component surface yet.
- AI assistant context is typed but not connected to live route/module state.
- Pixel-level media parity still needs dedicated approved-quality science assets rather than screenshot crops.
