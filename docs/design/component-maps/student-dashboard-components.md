# Student Dashboard Component Map

Preview route: `/design-preview/student-dashboard`
Source file: `apps/web/components/student-dashboard-preview.tsx`
Demo data: `apps/web/lib/demo/student-dashboard-demo-data.ts`

| Visual zone | React component | Source file | Data source | Zone type | Test id | Interaction states |
| --- | --- | --- | --- | --- | --- | --- |
| Page shell | `StudentDashboardPreview`, `StudentAppShell` | `apps/web/components/student-dashboard-preview.tsx` | static shell plus demo data children | static | `student-dashboard-page` | none |
| Sidebar | `StudentSidebar` | same | static navigation, license copy | static/hybrid | `student-sidebar` | active nav, hover/focus, license CTA |
| Topbar | `StudentTopbar` | same | `user`, `notifications` | hybrid | `student-topbar` | search focus, notification/calendar/profile buttons |
| Greeting/header | `StudentTopbar` | same | `user.greeting`, `user.subtitle` | dynamic | `student-greeting` | none |
| First row cards | section in `StudentDashboardPreview` | same | child components | static layout | `student-first-row-cards` | none |
| Continue learning card | `ContinueLearningCard` | same | `continueLearning` | hybrid | `continue-learning-card` | continue CTA hover/focus/click |
| Live lesson card | `LiveLessonCard` | same | `liveLesson` | hybrid | `live-lesson-card` | join CTA, joined state |
| AI recommendations card | `AiRecommendationCard` | same | `aiRecommendations` | hybrid | `ai-recommendations-card` | see all link |
| Quick access strip | `QuickAccessCard` | same | `quickAccess` | hybrid | `quick-access-strip` | item hover/focus/click, AI item |
| Assignments card | `AssignmentListCard` | same | `assignments` | hybrid | `assignments-card` | see all link |
| Subject progress card | `SubjectProgressCard` | same | `subjectProgress` | hybrid | `subject-progress-card` | details link |
| Weak topics card | `WeakTopicsCard` | same | `weakTopics` | hybrid | `weak-topics-card` | repeat topic toggle |
| Popular now card | `PopularNowCard` | same | `popularContent` | hybrid | `popular-now-card` | item links, see all link |
| Weekly progress card | `WeeklyProgressCard` | same | `weeklyProgress` | hybrid | `weekly-progress-card` | none |
| Locked feature card | `LockedFeatureCard` | same | `lockedFeature` | hybrid | `locked-feature-card` | CTA, requested state |
| AI assistant widget | `AIAssistantWidget` | same | `assistantState` | hybrid | `ai-assistant-widget` | bubble open/close, panel close, CTA |
| Debug overlay | `StudentGoldenOverlay` | same | golden reference asset | non-production debug | none | enabled only with `?overlay=1`, pointer-events none |

## Notes

- Static/dynamic/hybrid classification must stay aligned with `docs/design/screen-contracts/student-dashboard.screen-contract.md`.
- Test ids are contract-facing and should not be renamed without updating `student-dashboard.layout-contract.json`.
- Demo data is not a backend contract. It is only a stable preview fixture.
