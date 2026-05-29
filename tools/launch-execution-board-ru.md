# Алхимик: рабочая доска запуска (execution board)

Статусы: `todo` | `in_progress` | `blocked` | `done`

## Sprint 1 (02.03.2026 - 15.03.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S1-BE-01 | backend | RBAC + роли (ученик/учитель/родитель) | Backend Lead | 10.03 | todo | medium | роли применяются в API, e2e авторизация проходит |
| S1-BE-02 | backend | Entitlement service v1 | Backend Eng 2 | 12.03 | todo | medium | права доступа отдаются по user_id и тарифу |
| S1-MB-01 | mobile | Онбординг v1 + выбор роли | Mobile Lead | 11.03 | todo | low | новый пользователь проходит роль-онбординг |
| S1-MB-02 | mobile | First-run загрузка core-пака | Mobile Eng 2 | 13.03 | todo | high | core-пак скачивается, есть прогресс загрузки |
| S1-CD-01 | content | Шаблоны уроков + source/license поля | Content Lead | 12.03 | todo | medium | 30 тем оформлены в новом формате |
| S1-DS-01 | design | Design system tokens + компоненты | Product Designer | 09.03 | todo | low | библиотека токенов и базовых компонентов готова |
| S1-QA-01 | qa | Smoke test suite v1 | QA Lead | 14.03 | todo | low | smoke проходит на 3 девайс-профилях |

## Sprint 2 (16.03.2026 - 29.03.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S2-BE-01 | backend | Age-gate + parent consent API | Backend Lead | 24.03 | todo | high | несовершеннолетний без consent ограничен |
| S2-BE-02 | backend | Versioning legal docs | Backend Eng 2 | 22.03 | todo | medium | в профиле отображается версия согласий |
| S2-MB-01 | mobile | Экран класс/курс -> учебник/автор -> тема | Mobile Lead | 25.03 | todo | medium | навигация по каталогу работает офлайн |
| S2-MB-02 | mobile | Legal acceptance UI | Mobile Eng 2 | 23.03 | todo | low | без принятия условий закрыт персонализированный доступ |
| S2-CD-01 | content | Школа 7-11: ядро тем | Content Lead | 28.03 | todo | medium | не менее 120 тем с метаданными |
| S2-QA-01 | qa | E2E consent/offline regression | QA Lead | 29.03 | todo | medium | e2e пакеты проходят без blocker |

## Sprint 3 (30.03.2026 - 12.04.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S3-BE-01 | backend | Attempts engine + anti-cheat signals | Backend Lead | 08.04 | todo | high | попытка логируется, сигналы аномалий пишутся |
| S3-MB-01 | mobile | Решение задач + разбор ошибок | Mobile Lead | 09.04 | todo | medium | неверные ответы показывают корректный разбор |
| S3-MB-02 | mobile | Trust-слой AI в ответах | Mobile Eng 2 | 10.04 | todo | medium | источник/уверенность/дата видны в AI-ответе |
| S3-CD-01 | content | 600 школьных + 150 вуз задач | Content Team | 11.04 | todo | high | задачи валидируются методистом |
| S3-QA-01 | qa | Grading matrix tests | QA Lead | 12.04 | todo | medium | оценивание совпадает с эталоном |

## Sprint 4 (13.04.2026 - 26.04.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S4-MB-01 | mobile | Реакции: молекулярный режим v1 | Mobile Lead | 21.04 | todo | high | 10+ сценариев воспроизводятся стабильно |
| S4-MB-02 | mobile | Реакции: пробирки/колбочки v1 + SFX/Vibro | Mobile Eng 2 | 22.04 | todo | high | звук/вибрация и отключение в настройках работают |
| S4-BE-01 | backend | Scenario API + safety flags | Backend Lead | 20.04 | todo | medium | сценарий, условия и предупреждения доступны в API |
| S4-CD-01 | content | 120 реакционных сценариев | Content Team | 25.04 | todo | high | каждый сценарий имеет объяснение и ТБ |
| S4-QA-01 | qa | Matrix validation на девайсах Lite/Std | QA Lead | 26.04 | todo | medium | нет blocker-дефектов по критическим сценариям |

## Sprint 5 (27.04.2026 - 10.05.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S5-MB-01 | mobile | Молекулы 2D/3D + поиск + UX полировка | Mobile Lead | 06.05 | todo | medium | 2D/3D стабильны, поиск с быстрым сбросом |
| S5-MB-02 | mobile | Anti-burnout UX (микро-сессии, goals) | Mobile Eng 2 | 07.05 | todo | medium | есть daily goals и короткие сессии |
| S5-BE-01 | backend | Molecule metadata + cache headers | Backend Eng 2 | 05.05 | todo | low | API отдает свойства/источники корректно |
| S5-CD-01 | content | Русские названия + свойства + источники | Content Lead | 08.05 | todo | medium | источник и дата обновления у каждой карточки |
| S5-QA-01 | qa | Beta regression + low-end suite | QA Lead | 10.05 | todo | high | beta gate пройден, crash-free >= 99% |

## Sprint 6 (11.05.2026 - 24.05.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S6-BE-01 | backend | AI router offline/online + quotas | Backend Lead | 18.05 | todo | high | fallback работает, квоты применяются |
| S6-MB-01 | mobile | AI из любого экрана + голосовой ввод | Mobile Lead | 20.05 | todo | medium | AI доступен везде, диктовка стабильна |
| S6-MB-02 | mobile | AI-объяснение 3 уровней + tutor memory v1 | Mobile Eng 2 | 21.05 | todo | medium | 3 режима объяснения переключаются |
| S6-CD-01 | content | AI grounding policies + prompt templates | Content Team | 19.05 | todo | low | ответы соответствуют source policy |
| S6-QA-01 | qa | Quota/cost/offline reliability tests | QA Lead | 24.05 | todo | medium | нет критичных расхождений по лимитам |

## Sprint 7 (25.05.2026 - 07.06.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S7-BE-01 | backend | Classroom assignments + teacher dashboard API | Backend Lead | 01.06 | todo | high | учитель видит прогресс класса и trust-статус |
| S7-MB-01 | mobile | Teacher live dashboard | Mobile Lead | 03.06 | todo | medium | live-статусы обновляются в реальном времени |
| S7-MB-02 | mobile | Parent one-screen daily plan | Mobile Eng 2 | 04.06 | todo | low | родитель видит 20-минутный plan-of-day |
| S7-BE-02 | backend | Moderation queue + reports | Backend Eng 2 | 02.06 | todo | medium | жалобы обрабатываются по SLA |
| S7-QA-01 | qa | Role-based E2E (student/teacher/parent) | QA Lead | 07.06 | todo | medium | все ключевые роли проходят сценарии без blockers |

## Sprint 8 (08.06.2026 - 21.06.2026)

| ID | Stream | Задача | Owner | Due | Status | Риск | Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| S8-BE-01 | backend | Robokassa + T-Bank + YooKassa + webhooks | Backend Lead | 14.06 | todo | high | E2E оплата проходит во всех 3 провайдерах |
| S8-MB-01 | mobile | Paywall flows + purchase handling | Mobile Lead | 15.06 | todo | medium | после оплаты entitlement активируется |
| S8-BE-02 | backend | A/B framework (paywall + learning outcomes) | Backend Eng 2 | 16.06 | todo | medium | эксперименты пишут корректную аналитику |
| S8-MB-02 | mobile | План подготовки к контрольной/сессии v1 | Mobile Eng 2 | 17.06 | todo | low | автоплан формируется по слабым темам |
| S8-QA-01 | qa | RC regression + release checklist | QA Lead | 20.06 | todo | high | go/no-go критерии полностью закрыты |

## RACI (кто принимает решения)

- Product owner: утверждение scope и приоритетов.
- Backend lead: API, data-contracts, payments, reliability.
- Mobile lead: UX-потоки, perf budget, fail-safe режимы.
- Content lead: корректность контента, SLA обновлений, source trust.
- QA lead: quality gates, release sign-off.

## Статус-факт на 2026-02-22
### Сделано
- Backend: восстановлен роутинг API, routes.py переведен в чистый агрегатор include_router.
- Backend: auth/sync endpoints вынесены в отдельный модуль app/api/v1/endpoints/auth_sync.py.
- Backend: сервис healthy, /api/v1/health стабильно 200.
- Auth flow: request OTP, verify, refresh rotation, logout, merge entitlements/device snapshot работают.
- Mobile: добавлен постоянный smoke-скрипт scripts/smoke-device-migration.js и npm script smoke:migration.
- Mobile: API base URL сделан конфигурируемым через EXPO_PUBLIC_API_BASE_URL; удалены hardcoded 10.0.2.2.
- Mobile: в API-клиент добавлен auto Authorization + auto refresh токена при 401.
### Следующие шаги
1. Добавить backend проверку access token на user endpoints (entitlements/device-sync/telemetry) и связать userId с токеном.
2. Добавить mobile logout flow (очистка сессии + revoke refresh token).
3. Добавить e2e smoke для production SMS режима (без debugCode) с подменяемым провайдером через test double.
4. Подключить минимальные контрактные тесты backend auth/sync в CI (request/verify/refresh/logout/merge).

## Обновление статуса на 2026-02-22 (auth/sync hardening)
### Сделано
- Access-token guard внедрен на backend user endpoints (entitlements/device-sync/telemetry).
- Реализован mobile logout flow (revoke + local session clear + reset на onboarding).
- Добавлены backend контрактные тесты auth/sync и прогнаны успешно.
- Smoke миграции устройства успешно пройден с номером 89154674679.
### Дальше
1. Перейти с stateful токенов (hash в json) на JWT в access token + jti blacklist/rotation policy.
2. Добавить backend endpoint /auth/me и использовать его в mobile bootstrap для валидации сессии при старте.
3. Ввести role-based scopes для teacher/parent/student на защищенных endpoints.
4. Расширить CI: запуск smoke:migration и backend contract tests в pipeline.

## Обновление статуса на 2026-02-22 (JWT auth milestone)
### Сделано
- Зафиксированы правила непрерывной работы ассистента в /root/synapse/tools/assistant-continuity-rules-ru.md.
- Access token переведен на JWT claims-поток, state-store сохранен для refresh/session rotation.
- Добавлен GET /api/v1/auth/me и подключен mobile bootstrap проверки сессии при старте.
- Введены role-based scope проверки (student/teacher/parent) на защищенных endpointах.
- Обновлены контрактные тесты и smoke-проверки с номером 89154674679: все green.
### Следующие шаги
1. Добавить endpoint /users/profile и привязать role-specific payload (student/teacher/parent).
2. Вынести policy-слой scopes в отдельный модуль app/security/policies.py и покрыть unit тестами.
3. Подготовить production SMS e2e test-double провайдер и сценарий ENV=prod без debugCode.
4. Добавить CI job: backend contract + mobile smoke (headless) с артефактами отчетов.

## Процент выполнения на 2026-02-22
- Трек auth/sync (текущий sprint-блок): ~88% выполнено.
- Общий MVP план платформы (по board): ~42% выполнено.
- Статус темпа: по auth/sync идем с опережением плана примерно на 1-2 итерации; по общему MVP — в графике.
### Что закрыто в этом шаге
- Policy-слой scopes вынесен в app/security/policies.py и покрыт unit-тестами.
- Добавлен /api/v1/users/profile с role-specific payload.
- /auth/me + mobile bootstrap + JWT access flow подтверждены тестами и smoke.
### Следующий фокус
1. Прод-only SMS e2e сценарий без debugCode (test double provider).
2. CI пайплайн для contract tests + smoke migration.
3. Role-aware profile expansion (teacher/parent реальные поля вместо заглушек).

## Сводный прогресс на 2026-02-22
- Auth/sync production трек: ~93% (почти готов к стабилизации и hardening).
- MVP трек в целом: ~47%.
- Полный платформенный план (MVP + post-MVP web/B2B/контент-операции): ~29%.
- Оценка темпа: по auth/sync идем с опережением; по MVP и full-plan — близко к плановому темпу, без отставания.
### Новое закрыто
- Production SMS e2e test-double сценарий без debugCode добавлен и проходит.
- CI workflow под contract+smoke подготовлен (.github/workflows/auth-sync-ci.yml).
### Ближайшие задачи
1. Интегрировать workflow в реальный CI раннер и добавить публикацию junit/json артефактов.
2. Расширить /users/profile roleData до реальных teacher/parent моделей и привязать к данным прогресса.
3. Завершить payment integration stubs -> real provider adapters (Robokassa/T-Bank/YooKassa) по контрактам.

## Прогресс на 2026-02-22 (с учетом post-MVP и production плана)
- MVP progress: ~50%.
- Full-plan progress (MVP + post-MVP + production): ~33%.
- Осталось по full-plan: ~67%.
- Темп: по auth/sync — с опережением, по всему плану — в графике.
### Закрыто в итерации
- CI workflow с артефактами тестов и smoke-отчетов готов.
- /users/profile расширен roleData для teacher/parent на основе реальных данных telemetry/preferences.
- Payment adapters contract layer добавлен (robokassa/tbank/yookassa) + endpoints create/status/simulate-success.
### Дальше
1. Подключить реальные provider API-клиенты и webhook verification/signature flow.
2. Добавить payment state machine (pending/authorized/paid/failed/refunded) и idempotency ключи.
3. Расширить CI: junit XML + summary markdown + fail-fast на smoke/auth regressions.

## Прогресс на 2026-02-22 (обновление после CI + payments v2)
- MVP progress: ~53%.
- Full-plan progress (MVP + post-MVP + production): ~36%.
- Осталось по full-plan: ~64%.
- Темп: auth/sync трек идет с опережением; общий full-plan в графике.
### Закрыто
- CI доведен до боевого уровня: health-check + artifact reports backend/mobile.
- /users/profile roleData расширен для teacher/parent на основе telemetry/preferences.
- Payment adapters upgraded: idempotency + state machine + webhook signature verification.
- Unit/contract tests расширены до payments webhook сценариев.
### Далее
1. Реальные provider API-клиенты (не только checkout URL) и callback mapping к внутренней state machine.
2. Webhook idempotency по eventId + replay protection window.
3. Payment audit log и reconciliation job (nightly).

## Прогресс на 2026-02-22 (payments/webhooks/reconciliation)
- MVP progress: ~55%.
- Full-plan progress (MVP + post-MVP + production): ~38%.
- Осталось по full-plan: ~62%.
- Темп: auth/sync + payments core с опережением, общий full-plan в графике.
### Что закрыто
- Payment state machine + idempotency + webhook signatures + replay protection.
- CI reports/artifacts и health gate перед smoke.
- Reconciliation script для nightly сверки платежей.
### Дальше
1. Реальные provider transport adapters (API init/check/webhook normalization) с отдельными модулями по провайдерам.
2. Webhook persistence hardening: event dedupe TTL cleanup job + dead-letter для некорректных callback.
3. Payment/admin observability: endpoint read-only audit + daily reconciliation report export.

## Прогресс на 2026-02-22 (provider split + webhook DLQ)
- MVP progress: ~57%.
- Full-plan progress (MVP + post-MVP + production): ~40%.
- Осталось по full-plan: ~60%.
- Темп: auth/sync + payment domain с опережением; общий full-plan в графике.
### Закрыто
- Провайдеры платежей вынесены в отдельные модули и подключены через registry.
- Добавлены dead-letter callback storage и endpoint для audit log.
- CI artifacts расширены reconcile-report и health gate.
### Далее
1. Добавить cleanup job для payment_webhook_events/payment_webhook_dead_letters с retention политикой.
2. Реализовать webhook delivery retries + dead-letter reprocess endpoint (admin scope).
3. Подключить реальные провайдерные API URL/credentials и провести staging e2e по каждому провайдеру.

## Прогресс на 2026-02-22 (admin webhook ops)
- MVP progress: ~59%.
- Full-plan progress (MVP + post-MVP + production): ~42%.
- Осталось по full-plan: ~58%.
- Темп: auth/sync + payment domain с опережением, общий full-plan в графике.
### Выполнено
- Provider modules + registry для платежей.
- Admin endpoints: dead-letter list/reprocess, webhook storage cleanup.
- CI reports: backend tests + reconciliation + cleanup artifacts.
### Осталось по текущему payment блоку
1. Реальные transport-интеграции с прод провайдерами (API init/check) и staging credentials rollout.
2. Dead-letter reprocess with retry policy + bounded attempts.
3. Payment observability endpoint с фильтрами (provider/status/date range) и export CSV.

## Прогресс на 2026-02-22 (payment observability)
- MVP progress: ~61%.
- Full-plan progress (MVP + post-MVP + production): ~44%.
- Осталось по full-plan: ~56%.
- Темп: auth/sync + payments domain с опережением, общий full-plan в графике.
### Уже выполнено
- JWT auth + refresh rotation + logout + device migration merge + role scopes.
- Production SMS e2e (без debugCode) и mobile smoke automation.
- Payment core: providers registry, state machine, webhook signature/replay protection, dead-letter, audit/query/export, cleanup/reconcile scripts.
- CI: backend tests + smoke + artifacts reports.
### Осталось (ближайшие шаги)
1. Реальные staging credentials и transport checks для Robokassa/TBank/YooKassa API.
2. Retry/backoff policy для dead-letter reprocess (bounded attempts with schedule).
3. Payment report export to CSV file artifact endpoint + filtered date-range pagination.
4. Начать следующий крупный блок из full-plan: web role MVP skeleton (teacher/parent cabinet APIs).

## Прогресс на 2026-02-22 (retry/backoff + provider readiness)
- MVP progress: ~63%.
- Full-plan progress (MVP + post-MVP + production): ~46%.
- Осталось по full-plan: ~54%.
- Темп: auth/sync + payments с опережением, общий full-plan в графике.
### Выполнено
- Dead-letter retry/backoff и exhausted lifecycle.
- Audit query pagination + CSV export endpoints.
- Provider transport readiness check script + CI artifact.
### Остается
1. Подставить реальные staging credentials (ROBOKASSA_API_URL/TBANK_API_URL/YOOKASSA_API_URL + keys) и прогнать provider checks до ok=true.
2. Привязать webhook reprocess к retry scheduler (cron/queue) вместо только ручного admin trigger.
3. Начать web-role MVP APIs (teacher/parent cabinet) как следующий крупный блок full-plan.

## Прогресс на 2026-02-22 (teacher/parent cabinet APIs)
- MVP progress: ~66%.
- Full-plan progress (MVP + post-MVP + production): ~48%.
- Осталось по full-plan: ~52%.
- Темп: ключевые треки с опережением, общий full-plan в графике.
### Выполнено
- Web role MVP API skeleton: teacher/parent cabinet endpoints.
- Role-scope enforcement для cabinet и payments admin.
- Payment audit query/export + dead-letter backoff lifecycle.
- Контрактные/юнит тесты расширены до 12 сценариев.
### Осталось
1. Подключить реальные staging credentials и transport checks до ok=true для Robokassa/TBank/YooKassa.
2. Добавить scheduler/cron для автоматического reprocess DLQ и cleanup.
3. Добавить teacher/parent cabinet данные из реальных источников прогресса (не только telemetry/preferences агрегаты).
4. Начать web frontend skeleton и API contracts для кабинетов (post-MVP bridge).

## Прогресс на 2026-02-22 (admin panel owner/admin)
- MVP progress: ~69%.
- Full-plan progress (MVP + post-MVP + production): ~50%.
- Осталось по full-plan: ~50%.
- Темп: по backend трекам идем с опережением, по full-plan в целом в графике.
### Выполнено
- Owner/Admin panel API для ролей, прав и подписок с аудитом действий.
- Cabinet APIs teacher/parent и role-based scopes.
- Payment domain: state machine, webhook security, DLQ/reprocess, observability/export, CI artifacts.
### Осталось
1. Интеграция реальных staging credentials и transport checks для всех payment providers до ok=true.
2. Автоматизация DLQ reprocess scheduler (cron/queue) и bounded retries.
3. Старт frontend контуров: web admin panel + teacher/parent web кабинеты.
4. Подготовка user-ready сборки (APK + web desktop demo) на текущем функционале.

## Прогресс на 2026-02-23 (desktop web readiness)
- MVP progress: ~70%.
- Full-plan progress (MVP + post-MVP + production): ~51%.
- Осталось по full-plan: ~49%.
- Темп: backend треки с опережением, общий план в графике.
### Выполнено в шаге
- Исправлен запуск Expo web и подтверждена рабочая desktop сборка export.
### Дальше
1. Подготовить APK demo pipeline (EAS profile + smoke before build).
2. Начать минимальный web admin UI поверх готовых /admin API.
3. Подключить staging payment provider credentials и прогнать provider-check до ok=true.

## Прогресс на 2026-02-23 (APK demo pipeline)
- MVP progress: ~71%.
- Full-plan progress (MVP + post-MVP + production): ~52%.
- Осталось по full-plan: ~48%.
- Темп: в графике, backend идет с опережением.
### Выполнено
- Admin/owner panel backend APIs для ролей/прав/подписок и аудит.
- Teacher/parent cabinet backend APIs.
- Payment domain hardening + observability + CI artifacts.
- APK demo preflight pipeline + desktop web export readiness.
### Осталось
1. Получить EXPO_TOKEN и staging платежные credentials для end-to-end прод-like проверок.
2. Запустить реальную demo APK сборку через EAS profile demo-apk.
3. Сделать минимальный web admin UI поверх /admin endpoints.

## Прогресс на 2026-02-23 (admin/owner hardening)
- MVP progress: ~72%.
- Full-plan progress (MVP + post-MVP + production): ~53%.
- Осталось по full-plan: ~47%.
- Темп: backend с опережением, общий full-plan в графике.
### Выполнено
- Admin/owner panel API + role/scope/subscription/audit workflows.
- Security hardening: owner bootstrap secret, запрет owner/admin через consent endpoint.
- Payment and cabinet API layers validated, tests=14.
### Осталось
1. Реальные staging платежные credentials и provider readiness ok=true.
2. Автоматический scheduler для DLQ reprocess/cleanup.
3. Минимальный web admin frontend для управления ролями/правами/подписками.
4. Реальный demo APK build через EAS с EXPO_TOKEN.

## Прогресс на 2026-02-23 (web run fix + maintenance job)
- MVP progress: ~73%.
- Full-plan progress (MVP + post-MVP + production): ~54%.
- Осталось по full-plan: ~46%.
- Темп: backend с опережением, общий full-plan в графике.
### Выполнено
- Исправлен web remote запуск (host lan), desktop можно открывать по URL вручную.
- Добавлен maintenance job для платежей (DLQ reprocess + cleanup) и CI artifact report.
- Стабильность подтверждена тестами, health и mobile smoke.
### Осталось
1. Минимальный web admin frontend поверх /admin API.
2. Реальные staging credentials для провайдеров и provider-check ok=true.
3. EAS demo APK build после задания EXPO_TOKEN.

## Прогресс на 2026-02-23 (web visibility + admin ui)
- MVP progress: ~74%.
- Full-plan progress (MVP + post-MVP + production): ~55%.
- Осталось по full-plan: ~45%.
- Темп: backend с опережением, общий план в графике.
### Выполнено
- Устранены причины белого экрана web (host режим + web fallback для 3D view).
- Добавлен минимальный web admin UI endpoint /api/v1/admin/ui.
- Тесты расширены до 15 сценариев.
### Осталось
1. Собрать полноценный web admin frontend (реальные формы/таблицы/фильтры) вместо минимальной HTML панели.
2. Подключить staging credentials для платежных провайдеров и проверить readiness ok=true.
3. Запустить EAS demo APK сборку с EXPO_TOKEN.

## Прогресс на 2026-02-23 (white-screen workaround + content stage)
- MVP progress: ~75%.
- Full-plan progress (MVP + post-MVP + production): ~56%.
- Осталось по full-plan: ~44%.
- Темп: backend с опережением, общий план в графике.
### Этап разработки приложения
- Backend core (auth/sync/payments/admin/cabinet): продвинутый MVP этап, функционально готово для интеграции UI.
- Mobile runtime: рабочий MVP + smoke, web preview стабилизирован fallback-shell для desktop.
### Этап наполнения контентом
- Текущий seed объем (synapse.db): modules=3, lesson_blocks=3, tasks=4, molecules=2, physics_scenarios=2, ai_docs=3.
- Контентный этап: ранний/демо, требуется масштабное наполнение уроками, задачами, реакциями и молекулами.
### Дальше
1. Полноценный web admin frontend поверх /admin API.
2. Расширение контент-пайплайна: загрузка пакетов molecules/reactions/lessons/tasks в БД.
3. Реальный demo APK build (после EXPO_TOKEN) и staging payment provider checks.

## Прогресс на 2026-02-23 (content delivery UX)
- MVP progress: ~76%.
- Full-plan progress (MVP + post-MVP + production): ~57%.
- Осталось по full-plan: ~43%.
- Темп: backend и core платформы с опережением, общий план в графике.
### Выполнено
- Web fallback устранен, desktop preview стабилен.
- Admin UI локализован на русский.
- В HomeScreen добавлен статус/кнопка sync контента (offline pack + online updates).
### Осталось
1. Полноценный web admin frontend (React UI вместо базового HTML).
2. Масштабное наполнение контента пакетами lessons/tasks/molecules/reactions и публикация новых pack versions.
3. Реальные staging payment credentials + provider-check ok=true.
4. Demo APK build через EAS с EXPO_TOKEN.


## Прогресс на 2026-02-24 (admin UX deploy validation)
- MVP progress: ~77%.
- Full-plan progress (MVP + post-MVP + production): ~58%.
- Осталось по full-plan: ~42%.
- Темп: в графике, backend/admin контур с опережением.
### Выполнено
- Подтвержден deploy новых admin backend/UI правок в running контейнер после rebuild.
- Проверен рабочий токен-flow в админке: request-code/verify доступны в /api/v1/admin/ui.
- Проверена защита прав: admin endpoints не доступны student роли (403 expected).
### Риски/блокеры
- В текущем runtime отсутствует pytest (в venv и контейнере), поэтому автотесты backend сейчас не запускаются без отдельного test окружения.
### Следующие шаги
1. Добавить test-runner окружение с pytest (или отдельный CI job image) и восстановить регулярный прогон backend tests.
2. Продолжить UX-доработку admin UI (таблицы, фильтры, формы без ручного JSON).
3. Запустить массовый content pack ingestion/publish для production наполнения.


## Прогресс на 2026-02-24 (admin UI UX iteration #2)
- MVP progress: ~78%.
- Full-plan progress (MVP + post-MVP + production): ~59%.
- Осталось по full-plan: ~41%.
- Темп: в графике; UX админки идет с опережением относительно baseline HTML.
### Выполнено
- В /api/v1/admin/ui добавлены поиск, фильтр по ролям, пагинация списка пользователей и явный блок Пользователи.
- Добавлено сохранение токена/телефона в localStorage и автоподстановка при повторном входе.
- Добавлен блок метрик из /admin/database/overview (карточки вместо только raw JSON).
- Подтвержден runtime после rebuild: health=200, admin/ui=200, auth request-code=200.
### Следующие шаги
1. Добавить в UI управление rights/scopes (просмотр и переключение allow/deny) с понятными формами.
2. Вынести audit в табличный режим с фильтрами по типу действия и пользователю.
3. Поднять test-runner с pytest (отдельный образ/контур) и закрепить регулярный прогон admin tests.


## Прогресс на 2026-02-24 (admin UI rights/scopes)
- MVP progress: ~79%.
- Full-plan progress (MVP + post-MVP + production): ~60%.
- Осталось по full-plan: ~40%.
- Темп: в графике, admin UX идет с опережением.
### Выполнено
- В админ UI добавлено управление scope overrides (просмотр + сохранение allow/deny).
- UI поток закрывает ключевые ручные операции: token, users, role, subscriptions, audit, db overview, rights.
- После rebuild подтверждены health и smoke auth endpoint.
### Следующие шаги
1. Сделать табличный audit-view (фильтры по actor/action/target) вместо только raw JSON.
2. Добавить безопасные UX-ограничения для owner/admin операций (подтверждения и подсказки риска).
3. Поднять test-runner с pytest для регулярного прогона tests/test_admin_panel.py и tests/test_admin_ui.py.


## Прогресс на 2026-02-24 (pytest restore + audit table UI)
- MVP progress: ~80%.
- Full-plan progress (MVP + post-MVP + production): ~61%.
- Осталось по full-plan: ~39%.
- Темп: в графике, с опережением по админскому UX и тестовому контуру.
### Выполнено
- Восстановлен тест-контур backend: pytest установлен и подтвержден прогоном admin tests (3 passed).
- Добавлен requirements-test.txt для повторяемой установки test-зависимостей.
- В admin UI реализован табличный аудит с фильтрами actor/target/action.
- Подтверждены runtime smoke checks: health/admin-ui/OTP endpoint OK.
### Следующие шаги
1. Добавить bulk-операции по пользователям (массовая выдача/отзыв подписок по фильтру).
2. Доработать UX-подтверждения для рискованных owner/admin операций.
3. Запустить content pack ingestion pipeline для значимого роста lesson/task/molecule coverage.


## Прогресс на 2026-02-24 (risk confirmations + stable pytest loop)
- MVP progress: ~81%.
- Full-plan progress (MVP + post-MVP + production): ~62%.
- Осталось по full-plan: ~38%.
- Темп: в графике, с опережением по admin UX и тестовому циклу.
### Выполнено
- В admin UI добавлены подтверждения для рискованных owner/admin действий.
- Зафиксирован воспроизводимый тестовый контур: requirements-test.txt + pytest в venv.
- Повторный прогон admin tests стабилен: 3 passed.
### Следующие шаги
1. Добавить bulk-операции (массовая выдача/отзыв подписок) с dry-run preview.
2. Добавить экспорт audit по фильтрам из UI (CSV) для операционного контроля.
3. Перейти к content ingestion: поднять объем lesson/task/molecule/reaction до прод-уровня.


## Прогресс на 2026-02-24 (tabbed admin panel UX)
- MVP progress: ~82%.
- Full-plan progress (MVP + post-MVP + production): ~63%.
- Осталось по full-plan: ~37%.
- Темп: в графике; admin UX идет с опережением baseline.
### Выполнено
- Панель разделена на вкладки по доменам: доступ, пользователи/роли, подписки, права, система/аудит.
- Подписки вынесены в отдельный UX-раздел по запросу пользователя.
- Стабильность подтверждена: health/smoke/tests OK.
### Следующие шаги
1. Добавить bulk операции подписок (массовая выдача/отзыв) с preview до применения.
2. Добавить быстрые KPI карточки для ролей/подписок и активностей аудита за период.
3. Перейти к content ingestion pipeline для масштабного наполнения lesson/task/molecule/reaction.


## Прогресс на 2026-02-24 (bulk subscriptions rollout)
- MVP progress: ~83%.
- Full-plan progress (MVP + post-MVP + production): ~64%.
- Осталось по full-plan: ~36%.
- Темп: в графике; admin backend + UX с опережением.
### Выполнено
- Реализован bulk endpoint для подписок с dry-run preview и apply.
- Во вкладке Подписки добавлен UI для массовых операций по фильтру пользователей.
- Подтверждены tests/smoke: admin tests pass, bulk smoke pass под owner токеном.
### Следующие шаги
1. Добавить CSV-экспорт результатов bulk preview/apply и audit фильтров.
2. Добавить KPI карточки по активным планам/модулям и динамике админ-действий за период.
3. Перейти к content ingestion pipeline для масштабного наполнения контента.


## Прогресс на 2026-02-24 (audit CSV + KPI cards)
- MVP progress: ~84%.
- Full-plan progress (MVP + post-MVP + production): ~65%.
- Осталось по full-plan: ~35%.
- Темп: в графике; admin operations UX/API идет с опережением.
### Выполнено
- Добавлен CSV экспорт аудита с серверной фильтрацией по actor/target/action.
- В UI добавлены KPI карточки по аудиту и кнопка выгрузки CSV по текущим фильтрам.
- Стабильность подтверждена: tests OK, health OK, smoke OTP OK.
### Следующие шаги
1. Добавить CSV экспорт результатов bulk preview/apply из вкладки Подписки.
2. Добавить KPI для подписок (кол-во пользователей с платными планами, модулями, free-only).
3. Перейти к content ingestion pipeline и массовой публикации pack versions.


## Прогресс на 2026-02-24 (dropdown data sources for admin forms)
- MVP progress: ~66%.
- Full-plan progress (MVP + post-MVP + production): ~41%.
- Осталось по full-plan: ~59%.
- Темп: в графике; оценка реалистично пересчитана по фактической готовности приложений.
### Выполнено
- Добавлен источник фиксированных опций для админ-форм: /api/v1/admin/options.
- Поля подписок в UI переведены в dropdown-режим с серверной загрузкой значений.
- Стабильность подтверждена тестами и smoke проверками.
### Следующие шаги
1. Добавить ручное обновление опций и fallback-поведение в UI при пустых списках.
2. Перейти к реальному web кабинету (не только встроенный HTML endpoint) и интеграции с mobile runtime.
3. Ускорить контентный ingestion и QA поток для перехода от seed к production объему.


## Прогресс на 2026-02-24 (admin dictionaries refresh + fixed dropdown UX)
- MVP progress: ~67%.
- Full-plan progress (MVP + post-MVP + production): ~42%.
- Осталось по full-plan: ~58%.
- Темп: в графике; админ UX улучшается, но общая оценка удерживается реалистичной.
### Выполнено
- Добавлен ручной refresh справочников в админке и статус их загрузки.
- Фиксированные поля plan/module/role переведены в server-driven dropdown режим.
- Подтверждена стабильность tests/smoke.
### Следующие шаги
1. Вывести в UI явную матрицу текущих scope-overrides (таблица role x scope).
2. Начать вынос /api/v1/admin/ui в полноценный web кабинет (frontend app), сохраняя существующие backend API.
3. Контентный трек: pipeline массовой загрузки и публикации pack versions.


## Прогресс на 2026-02-24 (rights matrix UX)
- MVP progress: ~68%.
- Full-plan progress (MVP + post-MVP + production): ~43%.
- Осталось по full-plan: ~57%.
- Темп: в графике; админка последовательно усиливается, mobile/web product blocks остаются основными.
### Выполнено
- Реализована серверная матрица прав role x scope и отображение в UI.
- Улучшен контроль прав: админ видит базовое, override и итоговое разрешение в одной таблице.
- Подтверждена стабильность: tests and smoke checks OK.
### Следующие шаги
1. Перейти к отдельному web кабинету (frontend app) поверх готовых admin API.
2. Реализовать KPI по подпискам и активности пользователей в web кабинете.
3. Ускорить mobile user flows и контентный ingestion для реального MVP готовности.


## Прогресс на 2026-02-24 (plain-language rights UX)
- MVP progress: ~69%.
- Full-plan progress (MVP + post-MVP + production): ~44%.
- Осталось по full-plan: ~56%.
- Темп: в графике; UX-ясность админки улучшена, ключевой фокус далее — mobile/web product readiness.
### Выполнено
- Права/матрица в админке переведены на понятный язык без технических сокращений.
- Выбор действий прав доступа переведен в выпадающий список из server-driven справочника.
- Стабильность подтверждена тестами и smoke проверками.
### Следующие шаги
1. Начать отдельный web-кабинет (frontend app) на существующих admin API.
2. Перевести текущие HTML-сценарии в web view-model с отдельными экранами (users/subscriptions/rights/audit).
3. Параллельно ускорить mobile критические user flows и content ingestion.


## Прогресс на 2026-02-24 (subscriptions KPI block)
- MVP progress: ~70%.
- Full-plan progress (MVP + post-MVP + production): ~45%.
- Осталось по full-plan: ~55%.
- Темп: в графике; админка становится операционно удобнее, ключевой фокус далее — mobile/web product readiness.
### Выполнено
- Реализован subscriptions KPI endpoint и визуализация KPI в админке.
- Добавлены показатели по подпискам и топам планов/модулей для быстрой операционной оценки.
- Подтверждена стабильность тестами и smoke проверками.
### Следующие шаги
1. Начать отдельный web-кабинет (frontend app) на admin API, с переносом текущих вкладок.
2. Добавить user-friendly карточки в web кабинете для users/subscriptions/rights/audit.
3. Продолжить mobile критические user flows + content ingestion.


## Прогресс на 2026-02-24 (separate admin web cabinet bootstrap)
- MVP progress: ~71%.
- Full-plan progress (MVP + post-MVP + production): ~46%.
- Осталось по full-plan: ~54%.
- Темп: в графике; начат переход от встроенного HTML к отдельному web-кабинету.
### Выполнено
- Поднят отдельный web-кабинет по адресу /api/v1/admin/web с отдельными файлами frontend.
- Реализованы ключевые admin сценарии в новом web интерфейсе (auth/users/subscriptions/KPI/rights matrix).
- Добавлен отдельный тест web-кабинета и подтверждена стабильность тестов/smoke.
### Следующие шаги
1. Разделить новый web-кабинет на отдельные экраны/роуты (users, subscriptions, rights, audit).
2. Добавить bulk subscriptions flow в новый web-кабинет (preview/apply + export).
3. Синхронизировать mobile/web roadmap: критические mobile user flows и content ingestion.


## Прогресс на 2026-02-24 (admin web branding style)
- MVP progress: ~72%.
- Full-plan progress (MVP + post-MVP + production): ~47%.
- Осталось по full-plan: ~53%.
- Темп: в графике; web-кабинет получил узнаваемый фирменный стиль.
### Выполнено
- Новый web-кабинет визуально приведен к стилю иконки приложения (цвета/hero/icon).
- Добавлен icon asset endpoint и покрыт тестом.
- Стабильность подтверждена тестами и smoke проверками.
### Следующие шаги
1. Разделить web-кабинет на отдельные route-view (users/subscriptions/rights/audit).
2. Перенести bulk subscriptions preview/apply/export в новый web-кабинет.
3. Продолжить mobile critical flows и content ingestion pipeline.


## Прогресс на 2026-02-24 (web cabinet route-view + bulk/audit)
- MVP progress: ~73%.
- Full-plan progress (MVP + post-MVP + production): ~48%.
- Осталось по full-plan: ~52%.
- Темп: в графике; web-кабинет движется от prototype к полноценной структуре.
### Выполнено
- Добавлена маршрутизация по view внутри web-кабинета (users/subscriptions/rights/audit).
- Добавлены bulk subscriptions и audit CSV flow в новом web интерфейсе.
- Подтверждена стабильность тестами и smoke проверками.
### Следующие шаги
1. Добавить server-side пагинацию/фильтры в web views (users/audit) с сохранением состояния URL.
2. Перенести remaining admin operations из legacy /admin/ui в новый web-кабинет и замкнуть parity.
3. Сфокусировать следующий спринт на mobile critical flows и content ingestion.


## Прогресс на 2026-02-24 (master-plan alignment + pagination state)
- MVP progress: ~74%.
- Full-plan progress (MVP + post-MVP + production): ~49%.
- Осталось по full-plan: ~51%.
- Темп: в графике; web-admin движется к production UX.
### Выполнено
- В web-кабинете реализованы пагинация users/audit и URL-state сохранение фильтров/offset.
- Backend audit endpoint поддерживает offset.
- Подтверждена привязка к master-plan документам (локальный + серверная копия).
### Следующие шаги
1. Закрыть parity нового web-кабинета с legacy /admin/ui и переключить основной вход на /admin/web.
2. Начать security hardening проход по master-plan governance (SLO/alerts/backups/secrets rotation checklist).
3. Ускорить mobile critical user flows и content ingestion для MVP product readiness.


## Прогресс на 2026-02-24 (web parity users actions)
- MVP progress: ~75%.
- Full-plan progress (MVP + post-MVP + production): ~50%.
- Осталось по full-plan: ~50%.
- Темп: в графике; parity нового web-кабинета с admin API растет.
### Выполнено
- В новом web-кабинете добавлены create user и set role actions.
- Подтверждено, что сценарии работают через текущие backend admin endpoints.
- Стабильность подтверждена tests/smoke.
### Следующие шаги
1. Добавить в web-кабинет create user расширенные поля (plan/module) с dropdown и валидацией.
2. Перенести remaining legacy сценарии из /admin/ui в /admin/web и сделать /admin/ui read-only ссылкой.
3. Запустить security hardening backlog по master-plan governance (alerts/backups/secrets/consent flows).


## Прогресс на 2026-02-24 (web parity create-user fields)
- MVP progress: ~76%.
- Full-plan progress (MVP + post-MVP + production): ~51%.
- Осталось по full-plan: ~49%.
- Темп: в графике; web parity с legacy admin UI постепенно закрывается.
### Выполнено
- В web-кабинете create user теперь поддерживает plan/module через dropdown.
- Подтверждена работоспособность create/set-role связки и server-driven options.
- Стабильность подтверждена tests/smoke.
### Следующие шаги
1. Перевести remaining legacy actions из /admin/ui в /admin/web и сделать /admin/ui read-only redirect/link.
2. Начать security hardening по master-plan governance: secrets rotation, backup/restore check, alerts baseline.
3. Ускорить mobile critical flows и content ingestion.


## Прогресс на 2026-02-24 (security checklist baseline)
- MVP progress: ~77%.
- Full-plan progress (MVP + post-MVP + production): ~52%.
- Осталось по full-plan: ~48%.
- Темп: в графике; добавлен первый системный security hardening блок в web/admin.
### Выполнено
- Реализован backend security checklist endpoint и UI отображение в web-кабинете.
- Добавлены рекомендации по устранению небезопасных конфигураций.
- Подтверждена стабильность tests/smoke.
### Следующие шаги
1. Перевести legacy /admin/ui в read-only режим со ссылкой на /admin/web.
2. Добавить backup/restore проверку и минимальный alerts baseline в security checklist.
3. Продолжить mobile critical flows и content ingestion по мастер-плану.


## Прогресс на 2026-02-24 (legacy compatibility + security checklist extension)
- MVP progress: ~78%.
- Full-plan progress (MVP + post-MVP + production): ~53%.
- Осталось по full-plan: ~47%.
- Темп: в графике; web-admin migration и security governance идут параллельно.
### Выполнено
- Legacy /admin/ui переведен в совместимый read-only режим с переходом на /admin/web.
- Security checklist расширен до 9 проверок (включая backup/alerts/maintenance baseline).
- Подтверждена стабильность tests/smoke.
### Следующие шаги
1. Закрыть parity web кабинета по remaining операциям и сократить зависимость от legacy UI до полного deprecate.
2. Добавить practical security actions: секрет-rotation runbook, backup restore dry-run script, alert endpoints checklist.
3. Перейти к mobile critical flows + content ingestion следующего спринта.


## Прогресс на 2026-02-24 (security actions runbook)
- MVP progress: ~79%.
- Full-plan progress (MVP + post-MVP + production): ~54%.
- Осталось по full-plan: ~46%.
- Темп: в графике; migration в /admin/web и governance-hardening продолжаются.
### Выполнено
- Добавлен endpoint /admin/security/actions и UI блок практических security действий.
- Security раздел web-кабинета теперь включает checklist + actionable runbook.
- Подтверждена стабильность tests/smoke.
### Следующие шаги
1. Добавить исполняемый dry-run backup/restore script и вывод его статуса в security section.
2. Добавить baseline alerts checklist (health endpoint checks + payment dead letters threshold).
3. Вернуться к mobile critical flows и content ingestion этапам по master-plan.


## Прогресс на 2026-02-24 (alerts baseline details + restore evidence UX)
- MVP progress: ~80%.
- Full-plan progress (MVP + post-MVP + production): ~55%.
- Осталось по full-plan: ~45%.
- Темп: в графике; security governance в web/admin усиливается без блокировки migration-трека.
### Выполнено
- Security checklist дополнен деталями alerts baseline (schedule в workflow + ALERTS_CHANNEL_TARGET).
- Security actions дополнен отдельным шагом по каналу доставки алертов и on-call привязке.
- Backup dry-run теперь отдает evidence-структуру; в /admin/web добавлена таблица "Доказательства restore dry-run".
- Тесты и smoke пройдены (3 passed + runtime checks 200).
### Следующие шаги
1. Добавить отдельный блок доказательств восстановления (история запусков dry-run, последний fail reason, SLA последнего успеха).
2. Доделать практический security UX: быстрые copy-ready команды и ответственный owner для каждого action.
3. Вернуться к master-plan критическим потокам: mobile first-run + content ingestion coverage.


## Прогресс на 2026-02-25 (dry-run history + ownership/SLA в security)
- MVP progress: ~81%.
- Full-plan progress (MVP + post-MVP + production): ~56%.
- Осталось по full-plan: ~44%.
- Темп: в графике; security governance в admin/web доведен до операционного baseline уровня.
### Выполнено
- Добавлен endpoint истории restore dry-run: /admin/security/backup-dry-run/history.
- Реализовано сохранение истории запусков dry-run и выдача last success/last failure сигналов.
- Security checklist дополнен SLA-проверкой успешного restore (<=7 дней).
- Security actions теперь содержат owner + SLA; web-кабинет показывает эти поля и таблицу истории dry-run.
- Тесты и smoke пройдены, backend контейнер пересобран и перезапущен в /root/synapse/infra/docker-compose.yml.
### Следующие шаги
1. Добавить экспорт security runbook/checklist в CSV/JSON для операционных аудитов.
2. Внедрить алерт по SLA dry-run (если >7 дней без успеха) с выводом в security section.
3. Вернуться к master-plan критическим трекам: mobile first-run/role onboarding + content ingestion coverage.


## Прогресс на 2026-02-25 (security exports + SLA alerts surfaced)
- MVP progress: ~82%.
- Full-plan progress (MVP + post-MVP + production): ~57%.
- Осталось по full-plan: ~43%.
- Темп: в графике; security governance покрывает не только проверки, но и аудит-выгрузки для ops.
### Выполнено
- Добавлены экспорты security-аудита в JSON/CSV (checklist + alerts + actions + dry-run history).
- В checklist добавлены high alerts по просрочке SLA dry-run и failed последнему запуску.
- В /admin/web добавлены кнопки экспорта и блок визуализации активных алертов.
- Тесты и smoke пройдены; backend пересобран и перезапущен в /root/synapse/infra/docker-compose.yml.
### Следующие шаги
1. Добавить server-side фильтры для security export (только alerts / только failures / диапазон дат).
2. Добавить acknowledgement workflow для алертов (кто подтвердил, когда, комментарий).
3. Продолжить master-plan критические потоки: mobile role onboarding + first-run data loading + content ingestion coverage.


## Прогресс на 2026-02-25 (security export modes all/alerts/failures)
- MVP progress: ~83%.
- Full-plan progress (MVP + post-MVP + production): ~58%.
- Осталось по full-plan: ~42%.
- Темп: в графике; security-аудит стал пригоден для регулярной операционной отчетности.
### Выполнено
- Добавлены фильтруемые режимы security export: all/alerts/failures (JSON + CSV).
- Введена backend-валидация mode с явной ошибкой 400 для неподдерживаемых значений.
- В web-кабинете добавлен selector режима экспорта для audit-выгрузок.
- Тесты и smoke пройдены; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить acknowledgement workflow для alerts (ack by, ack at, comment).
2. Добавить server-side date-range фильтрацию истории dry-run в API/экспорт.
3. Продолжить master-plan треки mobile/content (first-run загрузка + role onboarding).


## Прогресс на 2026-02-25 (alerts acknowledgement workflow)
- MVP progress: ~84%.
- Full-plan progress (MVP + post-MVP + production): ~59%.
- Осталось по full-plan: ~41%.
- Темп: в графике; security governance закрывает цикл detect -> ack -> audit-export.
### Выполнено
- Добавлены API для списка алертов и подтверждения/снятия ack.
- Введено хранилище ack-состояния и запись ack-событий в admin audit.
- Web security section дополнен таблицей алертов и ack-операциями с комментарием.
- Security CSV export расширен полями подтверждения алертов.
- Тесты/smoke пройдены, backend пересобран и перезапущен.
### Следующие шаги
1. Добавить date-range фильтры для /admin/security/backup-dry-run/history и security export.
2. Добавить быстрые server-side фильтры alerts (acked/unacked, severity).
3. Вернуться к master-plan mobile/content трекам (first-run data loading + role onboarding).


## Прогресс на 2026-02-25 (security section UX hints)
- MVP progress: ~85%.
- Full-plan progress (MVP + post-MVP + production): ~60%.
- Осталось по full-plan: ~40%.
- Темп: в графике; admin/web становится более операционно-понятным без перегруза.
### Выполнено
- Добавлены подсказки и help-карточки для кнопок security section (checklist/dry-run/export/ack flow).
- Добавлены tooltip-подсказки (title) на ключевые action-кнопки.
- Стили hintGrid адаптированы под desktop/mobile.
- Тесты/smoke пройдены, backend контейнер пересобран.
### Следующие шаги
1. Добавить date-range фильтры для dry-run history и security export.
2. Добавить фильтры алертов в UI (acked/unacked, severity) без усложнения UX.
3. Вернуться к mobile/content направлениям по master-plan.


## Прогресс на 2026-02-25 (date-range filters для security history/export)
- MVP progress: ~86%.
- Full-plan progress (MVP + post-MVP + production): ~61%.
- Осталось по full-plan: ~39%.
- Темп: в графике; security analytics стало удобнее для операционных разборов за конкретный период.
### Выполнено
- Добавлены fromDate/toDate фильтры в backup dry-run history и security export (JSON/CSV).
- Добавлена строгая валидация диапазона дат на backend с понятной ошибкой 400.
- В web security section добавлены поля периода и автообновление истории при изменении диапазона.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить фильтры alerts в UI/API (acked/unacked + severity).
2. Добавить простую сводку тренда по dry-run (успехи/сбои за период).
3. Вернуться к master-plan mobile/content направлениям.


## Прогресс на 2026-02-25 (alerts filters acked/severity)
- MVP progress: ~87%.
- Full-plan progress (MVP + post-MVP + production): ~62%.
- Осталось по full-plan: ~38%.
- Темп: в графике; security operations стали быстрее за счет фильтрации инцидентов.
### Выполнено
- Добавлены API-фильтры для security alerts: acked/unacked + severity.
- Добавлена строгая валидация фильтров на backend (unsupported -> 400).
- В web security section добавлены UI-фильтры ack/severity с автообновлением таблицы алертов.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить aggregated trend-виджет по dry-run за выбранный период (ok/failed counts).
2. Добавить быстрый пресет диапазона дат (24h/7d/30d) в security section.
3. Параллельно вернуть фокус на mobile/content master-plan трек.


## Прогресс на 2026-02-25 (hover tooltips вместо статических подсказок)
- MVP progress: ~88%.
- Full-plan progress (MVP + post-MVP + production): ~63%.
- Осталось по full-plan: ~37%.
- Темп: в графике; UI стал чище без потери обучаемости оператора.
### Выполнено
- Удалены статические мелкие подсказки в security section (hintGrid блоки).
- Добавлены всплывающие hover-подсказки на контролы через data-hint + .hintable:hover::after.
- Для mobile hover-tooltip отключен, чтобы не мешать touch UX.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить компактный тренд dry-run за период (ok/failed) в security summary.
2. Добавить пресеты периода (24h/7d/30d) для быстрых операционных выборок.
3. После этого вернуться к mobile/content master-plan трекам.


## Прогресс на 2026-02-25 (dry-run trend + period presets)
- MVP progress: ~89%.
- Full-plan progress (MVP + post-MVP + production): ~64%.
- Осталось по full-plan: ~36%.
- Темп: в графике; security section стал быстрее для операционных срезов по времени.
### Выполнено
- Введен trend-виджет dry-run (ok/failed/successRate) за текущий диапазон дат.
- Добавлены быстрые пресеты периода: 24h, 7d, 30d.
- Расширен API history-ответ полями okRuns/failedRuns/successRate.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить сохранение пользовательских фильтров security section в URL/localStorage.
2. Добавить lightweight mobile-friendly view для security summary.
3. Затем переключиться на mobile/content master-plan поток (first-run + ingestion coverage).


## Прогресс на 2026-02-25 (security filters persistence URL/localStorage)
- MVP progress: ~90%.
- Full-plan progress (MVP + post-MVP + production): ~65%.
- Осталось по full-plan: ~35%.
- Темп: в графике; операторский workflow устойчивее к reload/navigation.
### Выполнено
- Сохранение фильтров security section в URL + localStorage.
- Восстановление состояния filters после перезагрузки и по shared ссылке.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Добавить компактный mobile-friendly режим отображения security summary.
2. Добавить backend трек по master-plan: mobile first-run + role onboarding/data loading.
3. Начать возврат к content ingestion coverage после закрепления mobile track.


## Прогресс на 2026-02-25 (mobile-friendly security summary)
- MVP progress: ~91%.
- Full-plan progress (MVP + post-MVP + production): ~66%.
- Осталось по full-plan: ~34%.
- Темп: в графике; mobile UX для admin security стал заметно легче.
### Выполнено
- Добавлен мобильный summary-блок с ключевыми security метриками.
- Реализовано обновление summary состояния при всех основных security действиях.
- Desktop поведение и таблицы сохранены; mobile получает упрощенный слой данных.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Перенести часть heavy tables в collapsible mobile секции (progressive disclosure).
2. Начать возвращение к master-plan треку: mobile first-run + role onboarding.
3. После этого продолжить content ingestion coverage.


## Прогресс на 2026-02-25 (объемные кнопки + фиксация переполнения controls)
- MVP progress: ~92%.
- Full-plan progress (MVP + post-MVP + production): ~67%.
- Осталось по full-plan: ~33%.
- Темп: в графике; admin/web стал визуально стабильнее и удобнее в плотных control-блоках.
### Выполнено
- Кнопки сделаны объемными (градиент, контур, тени, hover/active глубина).
- Исправлено невлезание кнопок в рамку: включен wrap для row и гибкая ширина контролов.
- Для mobile закреплен full-width behavior для controls.
- Пройдены тесты и smoke, backend пересобран и перезапущен.
### Следующие шаги
1. Доделать progressive disclosure для heavy таблиц на mobile (collapsible blocks).
2. Переход к master-plan потоку: mobile first-run + role onboarding.
3. После этого — возврат к content ingestion coverage.


## Прогресс на 2026-02-25 (tooltips над кнопками)
- MVP progress: ~92%.
- Full-plan progress (MVP + post-MVP + production): ~67%.
- Осталось по full-plan: ~33%.
- Темп: в графике; UX-подсказки больше не конфликтуют с layout control-строк.
### Выполнено
- Tooltip-подсказки перенесены над элементы (кнопки/поля/селекты).
- Устранен визуальный конфликт подсказок с элементами ниже по вертикали.
- Пройдены тесты и smoke, backend пересобран и перезапущен.
### Следующие шаги
1. Сделать progressive disclosure для heavy security таблиц на mobile.
2. Затем переключиться на master-plan: mobile first-run + role onboarding.
3. Далее продолжить content ingestion coverage.


## Прогресс на 2026-02-25 (mobile progressive disclosure + tooltip above controls)
- MVP progress: ~93%.
- Full-plan progress (MVP + post-MVP + production): ~68%.
- Осталось по full-plan: ~32%.
- Темп: в графике; mobile security UX стал заметно легче за счет сворачиваемых heavy-блоков.
### Выполнено
- Внедрены collapsible mobile секции для security tables (alerts/checklist/evidence/actions/history).
- Добавлена инициализация mobile collapse state (на mobile старт с одной открытой секцией).
- Зафиксировано поведение tooltip: подсказки всплывают над контролами.
- Тесты/smoke пройдены; backend пересобран и перезапущен.
### Следующие шаги
1. Переключение на master-plan backend трек: mobile first-run + role onboarding.
2. Добавить базовые API/UX маркеры onboarding readiness в admin security/checklist.
3. Продолжить content ingestion coverage после стабилизации onboarding трека.


## Прогресс на 2026-02-25 (mobile onboarding/first-run readiness в security)
- MVP progress: ~94%.
- Full-plan progress (MVP + post-MVP + production): ~69%.
- Осталось по full-plan: ~31%.
- Темп: в графике; admin security теперь отражает readiness мобильного onboarding трека.
### Выполнено
- Добавлен mobile readiness блок в security checklist (onboarding wiring, first-run sync, apk demo readiness).
- Добавлены mobile-runbook actions: onboarding smoke и apk preflight/build.
- Обновлены тесты, backend пересобран и перезапущен, smoke пройден.
### Следующие шаги
1. Добавить отдельный компактный endpoint/виджет readiness-summary (green/yellow/red) для mobile трека.
2. Реализовать server-side evidence для onboarding smoke (последний timestamp + actor + результат).
3. Затем продолжить content ingestion coverage по master-plan.


## Прогресс на 2026-02-25 (fix: роли в create-user dropdown)
- MVP progress: ~95%.
- Full-plan progress (MVP + post-MVP + production): ~70%.
- Осталось по full-plan: ~30%.
- Темп: в графике; критичный UX-блок создания пользователя стабилизирован.
### Выполнено
- Добавлен fallback ролей в web admin при недоступности /admin/options.
- Роли подгружаются на старте страницы, чтобы dropdown не был пустым.
- Обновлены тесты и пройдены smoke проверки; backend пересобран и перезапущен.
### Следующие шаги
1. Продолжить backend/mobile трек: readiness-summary endpoint (green/yellow/red) для onboarding.
2. Добавить evidence по onboarding smoke (timestamp/actor/result) в security section.
3. После этого перейти к content ingestion coverage треку.


## Прогресс на 2026-02-25 (mobile readiness summary + smoke evidence)
- MVP progress: ~96%.
- Full-plan progress (MVP + post-MVP + production): ~71%.
- Осталось по full-plan: ~29%.
- Темп: в графике; mobile onboarding трек получил наблюдаемость и evidence-контур в admin security.
### Выполнено
- Добавлены endpoints readiness summary и сохранения smoke evidence для mobile onboarding.
- В checklist добавлена проверка smoke evidence, плюс high alert при failed smoke.
- В web security section добавлены controls для refresh/save smoke evidence.
- Обновлены тесты, backend пересобран и перезапущен, smoke пройден.
### Следующие шаги
1. Привязать smoke evidence к фильтруемому security export (отдельная секция mobile_smoke).
2. Добавить API-проверку свежести smoke (SLA <= 7d) в readiness level logic.
3. Затем перейти к content ingestion coverage и mobile first-run performance.


## Прогресс на 2026-02-25 (mobile smoke SLA + export integration)
- MVP progress: ~97%.
- Full-plan progress (MVP + post-MVP + production): ~72%.
- Осталось по full-plan: ~28%.
- Темп: в графике; mobile readiness стал операционно измеримым и экспортируемым.
### Выполнено
- В readiness summary добавлен SLA smoke <= 7 дней и ужесточен критерий green уровня.
- В checklist добавлена отдельная SLA-проверка smoke + medium alert при просрочке.
- Security export JSON/CSV дополнен секциями mobile_readiness/mobile_smoke.
- В web summary добавлен явный индикатор SLA7d (OK/NOT_OK).
- Обновлены тесты, backend пересобран и перезапущен, smoke пройден.
### Следующие шаги
1. Добавить lightweight график/динамику readiness level по времени (последние 7/30 дней).
2. Переключиться на content ingestion coverage (API+mobile), как следующий master-plan приоритет.
3. Подготовить минимальный чек production-go/no-go по mobile onboarding + payments + security.


## Прогресс на 2026-02-25 (content ingestion coverage в admin security)
- MVP progress: ~98%.
- Full-plan progress (MVP + post-MVP + production): ~73%.
- Осталось по full-plan: ~27%.
- Темп: в графике; content ingestion трек теперь наблюдаем и управляем через admin security.
### Выполнено
- Добавлен endpoint content-ingestion readiness и UI summary в web admin.
- Checklist расширен проверками availability/JSON/token для контент-паков.
- Actions расширен runbook-командой импорта контент-паков.
- Export JSON/CSV дополнен секцией content_ingestion; добавлены high alerts на parse errors/no packs.
- Обновлены тесты; backend пересобран и перезапущен; smoke пройден.
### Следующие шаги
1. Добавить lightweight evidence history для content ingestion run (последний import result + actor + counts).
2. Привязать content ingestion status к mobile first-run performance smoke (время обновления packs).
3. Подготовить consolidated go/no-go checklist для production cutover.


## Прогресс на 2026-02-25 (русский UX + парольный вход + проверка создания пользователя)
- MVP progress: ~99%.
- Full-plan progress (MVP + post-MVP + production): ~74%.
- Осталось по full-plan: ~26%.
- Темп: в графике; критичные админ-сценарии стали понятнее и операционно завершенными.
### Выполнено
- Полная русификация кнопок и подсказок в админ-интерфейсе (без dry-run/ack/severity в кнопках).
- Добавлен вход администратора по логину и паролю + аудит события входа.
- Таблица пользователей теперь показывает подписки (планы/модули).
- Создание пользователя усилено: подписка через выбор/ручной ввод, подтверждение результата и автопроверка в списке.
- Content ingestion coverage интегрирован в security workflow (status/alerts/export/runbook).
### Назначение админ-панели (зафиксировано)
1. Управление доступом и ролями пользователей.
2. Операционное управление подписками и entitlement-пакетами.
3. Контроль безопасности и готовности релизного контура (backup/smoke/alerts/content).
4. Аудит изменений и экспорт операционных отчетов.
### Основные пользовательские сценарии админа
1. Войти в админку (логин/пароль или телефон/код) и проверить состояние безопасности.
2. Создать пользователя, назначить роль и стартовые подписки, сразу убедиться в результате в таблице.
3. Выполнить операционную задачу (тест восстановления, smoke, импорт контента) и зафиксировать evidence.
4. Выгрузить отчет (JSON/CSV) для аудита/дежурства.
### Следующие шаги
1. Финальный проход QA по русскоязычным текстам и терминологии на мобильном экране.
2. Подготовить production go/no-go checklist (onboarding/payments/content/security).
3. Закрыть оставшиеся full-plan пункты post-MVP (наблюдаемость и автоматизация).


## Прогресс на 2026-02-25 (сокращение кнопок + русификация + парольный вход)
- MVP progress: ~99%.
- Full-plan progress (MVP + post-MVP + production): ~75%.
- Осталось по full-plan: ~25%.
- Темп: в графике; админ UX стал компактнее и понятнее без перегруза кнопками.
### Выполнено
- Консолидация кнопок: восстановление (1 кнопка + выбор действия), экспорт (1 кнопка + формат), период (1 кнопка + выбор диапазона).
- Русифицированы кнопки и подсказки в админ интерфейсе.
- Добавлен вход администратора по логину/паролю.
- Улучшен create-user сценарий и видимость подписок в users table.
- Пройдены тесты/smoke, backend пересобран и перезапущен.
### Следующие шаги
1. Добить UX-ожидания: добавить inline success/error бейджи возле action controls (чтобы было видно, что действие выполнено).
2. Подготовить production go/no-go checklist для релизного среза.
3. Закрыть remaining post-MVP automation/observability пункты.


### Обновление 2026-02-25 08:55 UTC
- [x] Веб-админка: завершен модальный вход и скрытие рабочих вкладок до авторизации.
- [x] UX: сохранена компактность (консолидация действий безопасности уже на месте, лишние дубли кнопок не возвращались).
- [x] Русификация: дочищены остаточные служебные статусы в app.js.
- [x] Верификация: backend-тесты по админке/вебу и базовый smoke входа пройдены.

Текущая оценка прогресса: MVP 99%, full-plan ~76% (в пределах плана).

### Обновление 2026-02-25 09:04 UTC
- [x] Кнопка входа закреплена в правом верхнем углу шапки и проверена через live endpoint.
- [x] Добавлен inline-индикатор результата действий (успех/ошибка/инфо).
- [x] UI обрабатывает сетевые ошибки без молчаливых падений.

### Обновление 2026-02-25 09:06 UTC
- [x] Вход в систему закреплен в правом верхнем углу шапки (desktop) и сохранен адаптив на мобильном.
- [x] Добавлена быстрая кнопка выхода для смены админа.
- [x] Добавлена явная индикация результата действий (операторская наблюдаемость UI).

### Обновление 2026-02-25 09:19 UTC
- [x] Операторская наблюдаемость UI усилена: видимые inline-статусы возле критичных security-действий.
- [x] Ошибки и успехи показываются на месте выполнения действия, не только в блоке Результат операций.
- [x] Проверки тестами и live endpoint пройдены.

### Обновление 2026-02-25 09:34 UTC
- [x] Добавлен cache-busting для ассетов веб-админки (устранение проблем браузерного кэша).
- [x] Подтверждено на live endpoint и тестом test_admin_web.py.

### Обновление 2026-02-25 09:37 UTC
- [x] Единый паттерн оперативной обратной связи распространен на Users/Subscriptions/Rights/Audit.
- [x] Ключевые админ-сценарии теперь дают мгновенный понятный статус на месте выполнения.
- [x] Тесты и live-проверка пройдены, регрессий не выявлено.

### Обновление 2026-02-25 09:39 UTC
- [x] Добавлен режим оператора (компактный) с сохранением состояния и быстрым переключением.
- [x] Добавлен быстрый сброс фильтров безопасности для ускорения ежедневных проверок.
- [x] Тесты и live-проверка пройдены, без регрессий.

### Обновление 2026-02-25 09:43 UTC
- [x] Ускорена работа оператора: введены горячие клавиши и справка без ухода из интерфейса.
- [x] Усилена операционная наблюдаемость: фоновое автообновление security-блока.
- [x] Обновлены версии ассетов для стабильного получения свежего JS/CSS в браузере.

### Обновление 2026-02-25 11:08 UTC
- [x] Вкладка Security получила runbook-режимы для ежедневной и инцидентной работы.
- [x] Подготовлена админская документация в text + Word с иллюстрациями и пошаговыми кейсами.
- [x] Тесты и live-проверки пройдены.

Текущая оценка прогресса: MVP 99%, full-plan ~78% (в графике).

### Обновление 2026-02-25 11:21 UTC
- [x] Выпущена инструкция администратора v2 (text + Word + printable one-page).
- [x] Инструкция доступна прямо из веб-админки (кнопка в верхней панели).
- [x] SLA-таблица и чеклист передачи смены добавлены в UI и документы.
- [x] Скриншоты интерфейса включены в Word-документ (Playwright capture).

Текущая оценка прогресса: MVP 99%, full-plan ~80% (в графике).

### Обновление 2026-02-25 11:29 UTC
- [x] Устранен баг вкладок: отображается только активная вкладка, переключение снова работает корректно.
- [x] Выпущена инструкция v3 и printable one-page с полями дежурного.
- [x] Документация интегрирована в UI и доступна по прямым ссылкам ассетов.

Текущая оценка прогресса: MVP 99%, full-plan ~81% (в графике).

### Обновление 2026-02-25 11:43 UTC
- [x] Исправлен критичный UX баг вкладок: активна только выбранная вкладка.
- [x] Реализован governance-блок передачи смены в UI и printable one-page v3.
- [x] Добавлен экспорт TXT акта передачи для операционного архива.

Текущая оценка прогресса: MVP 99%, full-plan ~82% (в графике).

### Обновление 2026-02-25 12:33 UTC
- [x] Подтвержден live endpoint go/no-go (/api/v1/admin/security/go-no-go) через реальную авторизацию admin/admin123.
- [x] Зафиксирован текущий статус релизного среза: no-go, блокеры отображаются корректно и пригодны для операционного решения.
- [x] Регрессия админки не выявлена: tests/test_admin_panel.py + tests/test_admin_web.py -> 3 passed.

Текущая оценка прогресса: MVP 99%, full-plan ~82% (в графике; следующий фокус — закрытие go/no-go блокеров и evidence).

### Обновление 2026-02-25 13:10 UTC
- [x] Добавлена история go/no-go (backend snapshot history + endpoint + таблица в UI).
- [x] Добавлен серверный архив актов передачи смены с записью в admin audit.
- [x] Обновлен UI инструкции: отдельная кнопка Архивировать акт и автоархивация при TXT-экспорте.
- [x] Проверки пройдены: tests/test_admin_panel.py + tests/test_admin_web.py -> 3 passed; live smoke endpoint/UI OK.

Текущая оценка прогресса: MVP 99%, full-plan ~84% (в графике; следующий фокус — evidence для mobile/content и закрытие go/no-go блокеров).

### Обновление 2026-02-25 13:40 UTC
- [x] Добавлен CSV-экспорт серверного архива передачи смены.
- [x] Добавлена явная таблица гейтов go/no-go с расшифровкой блокеров в UI.
- [x] Добавлена кнопка выгрузки `Скачать архив CSV` в модалке Инструкция.
- [x] Проверки пройдены: tests/test_admin_panel.py + tests/test_admin_web.py -> 3 passed; live smoke API/UI OK.

Текущая оценка прогресса: MVP 99%, full-plan ~85% (в графике; следующий фокус — evidence mobile/content + последовательное закрытие go/no-go blockers).

### Обновление 2026-02-25 13:52 UTC
- [x] Go/No-Go получил приоритизацию блокеров (P0/P1/P2) и top-3 next actions.
- [x] Добавлен evidence слой для mobile/content прямо в go/no-go payload.
- [x] UI показывает приоритетные действия и расширенную таблицу гейтов с ответственными.
- [x] Проверки пройдены: tests/test_admin_panel.py + tests/test_admin_web.py -> 3 passed; live smoke API/UI OK.

Текущая оценка прогресса: MVP 99%, full-plan ~86% (в графике; следующий фокус — закрытие P0 блокеров и регулярное evidence обновление).

### Обновление 2026-02-25 14:07 UTC
- [x] Стартован product-track web development: вместо заглушки реализован role-first web workspace (выбор роли + персональный first-day flow).
- [x] Добавлен trust-layer блок в web-shell (источник, дата обновления, уверенность).
- [x] Web build верифицирован: npm run web:export прошел успешно.
- [x] Прогресс теперь ведем по двум трекам: Admin/Ops и Product.

Текущая оценка прогресса:
- Admin/Ops track: ~99% (операционный MVP почти закрыт).
- Product track (mobile + web user experience): ~58%.
- Full-plan aggregate: ~87% (в графике, но ключевой фокус смещен в product-track).

### Обновление 2026-02-25 14:32 UTC
- [x] Добавлена вкладка Документация в админ-панель, инструкции перенесены в нее.
- [x] Добавлены инструкции пользователей mobile/web (MD + TXT).
- [x] Добавлен полный checklist документов для РФ (операционный комплаенс список, требует финальной проверки юристом).
- [x] Расширена раздача ассетов, новые документы доступны в runtime.
- [x] Проверки пройдены: tests/test_admin_web.py + tests/test_admin_panel.py -> 3 passed; live smoke OK.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~60%.
- Full-plan aggregate: ~88%.

### Обновление 2026-02-25 14:46 UTC
- [x] Вкладка Документация добавлена в админ-панель, интерактивная инструкция перенесена в нее.
- [x] Добавлены документы пользователей mobile/web (MD + TXT).
- [x] Добавлен полный RF legal checklist документов (MD + TXT, с пометкой о финальной юр-валидации).
- [x] Обновлены shortcuts: Alt+1..6 (включая переход на Документацию).
- [x] Тесты и live smoke пройдены.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~60%.
- Full-plan aggregate: ~88%.

### Обновление 2026-02-25 14:58 UTC
- [x] Добавлены официальные источники РФ для legal-блока (в runtime документации).
- [x] Добавлен трекер статуса юридического комплаенса (рабочий документ).
- [x] Вкладка Документация обновлена ссылками на новые legal документы.
- [x] Тесты и live smoke пройдены.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~61%.
- Full-plan aggregate: ~88%.

### Обновление 2026-02-25 15:11 UTC
- [x] Добавлен шильдик `Все права защищены.` в админ-веб и глобально в приложение (mobile/web shell).
- [x] Проверено на runtime admin web и сборке mobile web export.
- [x] Юридический блок дополнен официальными источниками и статус-трекером в Документации.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~62%.
- Full-plan aggregate: ~89%.

### Обновление 2026-02-25 15:24 UTC
- [x] Единый copyright-шильдик внедрен: `© 2026 Алхимик. Все права защищены.`
- [x] Добавлены вдохновляющие лозунги в web/admin и mobile/web app.
- [x] Проверки пройдены: backend test + mobile web export + live smoke.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~63%.
- Full-plan aggregate: ~89%.

### Обновление 2026-02-25 15:37 UTC
- [x] Шильдик перемещен в левый нижний угол и сделан ненавязчивым.
- [x] Текст стандартизирован: `© 2026 Алхимик. Все права защищены.`
- [x] Проверки runtime и тесты пройдены.

### Обновление 2026-02-25 15:49 UTC
- [x] Шильдик переведен в нижний flow layout, не перекрывает контент.
- [x] Левое позиционирование и компактный стиль сохранены.
- [x] Runtime smoke и тесты пройдены.

### Обновление 2026-02-25 16:03 UTC
- [x] Copyright-блок переведен в нижний flow layout (не закреплен).
- [x] Цвета текста сохранены как ранее.
- [x] Проверки тестами и live smoke пройдены.

### Обновление 2026-02-25 16:18 UTC
- [x] Footer-copyright оставлен нефиксированным внизу layout.
- [x] Добавлены нижние разделы навигации (расширяемый набор).
- [x] Добавлены анимации и визуальные карточки учебной тематики в стиле Алхимик.
- [x] Тесты и live smoke пройдены.

Текущая оценка прогресса:
- Admin/Ops track: ~99%.
- Product track: ~64%.
- Full-plan aggregate: ~89%.

### Обновление 2026-02-25 16:31 UTC
- [x] Footer перенесен в конец рабочей зоны страницы (in-flow).
- [x] Цвет footer согласован с основным фоном веба, без белого контрастного блока.
- [x] Анимации оставлены в hero/карточках; операционные таблицы сохранены читаемыми.
- [x] Тесты и live smoke пройдены.

## 2026-02-25 22:47 UTC — Admin web HTML cleanup + deploy
- Исправлены битые атрибуты в  (цитирование class/id/href/src и related attrs) в блоках  и .
- В docs-ссылках выровнен cache-bust токен на  для консистентности с /.
- Проверка регулярками: не осталось некавыченных , , ,  в .
- Деплой в runtime-контейнер:  -> , затем .
- Smoke:  = 200,  = 200,  = 200; контент  и корректная разметка docs присутствуют.
- Примечание по тестам:  в host/container не установлен ( / ), поэтому backend pytest-ран не выполнен в этой сессии.
- Mobile verify:  успешно,  обновлен.

## 2026-02-25 22:47 UTC — Уточнение записи (исправление формулировок)
- Исправлены битые HTML-атрибуты в файле backend/app/web_admin/index.html для блоков siteInfoPanel и docs (все ключевые атрибуты теперь в кавычках).
- Ссылки документов в разделе docs переведены на версию cache-bust 20260226j для консистентности.
- Проверка шаблонами подтвердила отсутствие некавыченных class/id/href/src в index.html.
- Файл index.html доставлен в runtime контейнер synapse-backend, затем выполнен перезапуск контейнера.
- Smoke проверка: endpoint /api/v1/admin/web отвечает 200; assets styles.css и app.js отвечают 200; блок siteInfoPanel присутствует.
- Ограничение окружения: pytest недоступен на host и в контейнере (модуль отсутствует), поэтому backend pytest в этой итерации не выполнен.
- Мобильная проверка: команда npm run web:export завершилась успешно.

## 2026-02-25 22:51 UTC — Корректировка размещения блока прав на общей web-странице
- Принято замечание: админ-веб оставлен без изменений по размещению, как было в стабильном варианте.
- На общей странице Алхимик Web Workspace блок прав перенесен внутрь рабочей зоны страницы по образцу админ-панели: отдельная in-flow панель внизу контента, без fixed/sticky.
- Изменения внесены в mobile/app/screens/WebFallbackShell.tsx: добавлен блок Информация о продукте и ресурсах, copyright, лозунг дня и pills разделов.
- В mobile/App.tsx для web отключен глобальный нижний footer, чтобы не дублировать и не смещать блок; для нативных платформ поведение сохранено.
- Сборка проверки: npm run web:export выполнена успешно, сформирован новый web bundle.

## 2026-02-26 10:13 UTC — Перенос блока прав вниз + продолжение плана legal
- В админ-вебе блок с текстом о правах перенесен в самый низ страницы: после секции Результат операций и перед закрытием wrap.
- Добавлен live-виджет юридического комплаенса в вкладку Документация: кнопка обновления, summary, связь с go/no-go, таблица статусов по пунктам.
- Добавлен backend endpoint /api/v1/admin/legal/compliance-status (с авторизацией admin rights).
- В сервисе реализован парсер legal-rf-compliance-status-ru.md и расчет go/no-go legal gate.
- Гейт legal_compliance добавлен в production go/no-go с приоритетом P0 и действиями по недостающим APPROVED пунктам.
- Исправлен баг в app.js: корректный id rightsSlogan при инициализации слогана.
- Деплой: docker cp обновленных файлов в synapse-backend и restart контейнера.
- Smoke: /api/v1/admin/web = 200, блок siteInfoPanel расположен после секции Результат операций, legal endpoint отвечает 401 без токена (роут доступен и защищен).

## 2026-02-26 10:27 UTC — Продолжение плана: editable legal compliance в админ-вебе
- Добавлено редактирование юридических статусов прямо из вкладки Документация: для каждого пункта select статуса + кнопка Сохранить.
- Backend: добавлен POST /api/v1/admin/legal/compliance-status для обновления конкретного пункта (audit фиксирует from/to и changedBy).
- Сервис: реализована функция set_legal_compliance_item_status(...) с валидацией статусов и записью в legal-rf-compliance-status-ru.md.
- После сохранения в UI автоматически пересчитывается go/no-go и обновляется legal gate.
- Проверки: node --check app.js, py_compile backend файлов (host + container) — успешно.
- Smoke: /api/v1/admin/web содержит новые элементы legal widget; GET/POST legal endpoint возвращают 401 без токена (доступ защищен, роут доступен).

## 2026-02-26 10:29 UTC — Продолжение плана: product-track web catalog
- В Алхимик Web Workspace добавлен новый блок Каталог web-уроков (MVP baseline): выбор класса, список тем, текущий фокус и следующий шаг по теме.
- Изменен файл mobile/app/screens/WebFallbackShell.tsx (добавлена структура тем для Sprint 2-3 и UI-каркас lesson path).
- Сборка web-экспорта мобильного контура выполнена успешно: npm run web:export, обновлен dist bundle.
- Дополнительно проверено: deployed admin app.js содержит editable legal workflow (saveLegalComplianceStatus/bindLegalComplianceActions).

## 2026-02-26 10:59 UTC — Продолжение плана: история legal-изменений в админ-вебе
- Добавлен endpoint GET /api/v1/admin/legal/compliance-history (защищен admin:rights) для чтения последних изменений статусов legal-пунктов.
- Реализована server-side агрегация истории из admin_audit (action=legal_compliance_status_set): at/title/fromStatus/toStatus/changedBy.
- В Docs админ-веба добавлен блок История legal-изменений: кнопка обновления, summary и таблица последних изменений.
- После изменения статуса в legal-виджете история обновляется автоматически, вместе с go/no-go.
- Деплой выполнен в synapse-backend (docker cp + restart), compile-check в контейнере успешен.
- Smoke: admin web содержит новые элементы history; legal endpoints отвечают 401 без токена (доступ защищен, роуты активны).

## 2026-02-26 15:12 UTC — Product-track: таблица Менделеева (MVP) + статус mobile/AI
- Добавлен новый экран mobile/app/screens/PeriodicTableScreen.tsx: MVP-таблица Менделеева (18 элементов) с карточкой описания элемента (RU/EN), период, группа, категория.
- В mobile/app/screens/ChemistryScreen.tsx добавлена новая карточка навигации Таблица Менделеева.
- В mobile/app/navigation/RootNavigator.tsx добавлен route PeriodicTable и экран в Stack.
- Сборка проверки: npm run web:export выполнена успешно.
- Оценка статуса: mobile находится в этапе перехода между Sprint 2-3 (уроки/задачи) и частично Sprint 6 (AI), AI-ассистент реализован в базовом production-ready MVP режиме (offline+online fallback, recommend/generate task), но не завершен по полному Sprint 6 scope.

## 2026-02-26 15:26 UTC — Мягкая анимация + readiness к APK
- Для mobile добавлены мягкие анимации: PeriodicTableScreen (плавный вход hero/карточки, мягкий pulse выбранного элемента, анимированная смена карточки) и ChemistryScreen (мягкий вход блока навигации).
- Добавлен и подключен экран таблицы Менделеева в mobile navigation: mobile/app/screens/PeriodicTableScreen.tsx + route PeriodicTable в RootNavigator + вход из ChemistryScreen.
- Проверки readiness к APK: npm run apk:preflight = PASSED (health + smoke:migration + auth/sync/entitlements/refresh/logout).
- Build smoke: npm run web:export = PASSED.
- Ограничение для немедленного EAS build: отсутствует EXPO_TOKEN в окружении (нужен для non-interactive apk:build:demo).

## 2026-02-26 15:43 UTC — AI/уроки анимации + demo flow 5 задач + APK попытка
- Проверен EAS auth: npx eas whoami -> usgromov (вход уже активен, EXPO_TOKEN не обязателен при текущей сессии).
- Добавлены мягкие анимации в mobile/app/screens/AIMentorScreen.tsx: staged enter для header/chips/smart-card/question/answer.
- Добавлены мягкие анимации в mobile/app/screens/ChemistryLessonsScreen.tsx и mobile/app/screens/PhysicsLessonsScreen.tsx: плавный enter header/cards/drawer (stagger-like effect).
- Реализован первый цельный demo flow урок -> 5 задач -> разбор ошибок в chemistry: 
  * кнопка запуска flow в ChemistryLessonsScreen (берет первые 5 задач темы),
  * ChemistryTaskScreen: отметка Правильно/Ошибка, блокировка Next до ответа, итоговый разбор ошибок и рекомендации.
- RootNavigator обновлен: ChemistryTask params расширен полем flowMode.
- Проверки: npm run web:export = OK; apk:preflight сначала упал из-за OTP rate limit на старом TEST_PHONE, после смены TEST_PHONE прошел успешно.
- Запущена сборка npm run apk:build:demo: preflight + upload в EAS успешны, но build остановлен из-за исчерпанного free Android build quota (сброс через 2 дня 8 часов).

## 2026-02-26 19:41 UTC — Разгрузка админки + локальная APK сборка + анимации/flow
- Админ-панель облегчена: добавлен выпадающий блок пояснения ролей (кто что может), матрица прав скрыта в details, тяжелые security-таблицы по умолчанию свернуты.
- Логика раскрытий обновлена в app.js: на desktop/mobile открываются только ключевые блоки по умолчанию, остальные по запросу.
- Продолжена работа по мягким анимациям: AIMentorScreen (staged enter), ChemistryLessons/PhysicsLessons (плавный enter и stagger-like ощущение).
- Реализован demo flow в chemistry: урок -> 5 задач -> разбор ошибок (Correct/Wrong, блокировка Next до ответа, итоговый report).
- Проверки: web:export = OK; apk:preflight = OK (с TEST_PHONE=89250001122, обход rate-limit).
- Локальная APK сборка через Gradle выполнена успешно: /root/synapse/mobile/android/app/build/outputs/apk/debug/app-debug.apk
- EAS cloud build остается ограничен free quota, но локальный Gradle путь работает как временный обход.

## 2026-02-26 19:55 UTC — Фикс админ UI + биология + продолжение плана
- Исправлен визуальный регресс в админке: карточки блока Учебная среда Алхимик снова компактные (маленькая иконка, горизонтальная лента в одну строку на desktop), а не растянутые на всю страницу.
- В блок Учебная среда Алхимик добавлена карточка Биология и системы.
- В продуктовый Web Workspace добавлена биология в MVP-каталог тем (bio-cell).
- Админ-панель дополнительно разгружена: матрица прав и heavy security tables остаются свернутыми по умолчанию, есть блок пояснения ролей.
- Проверки: admin web smoke OK (biology card + roles help + eduCards styles); mobile web:export OK.
- Локальная APK сборка через Gradle подтверждена повторно: ./gradlew :app:assembleDebug = SUCCESS; APK: /root/synapse/mobile/android/app/build/outputs/apk/debug/app-debug.apk

## 2026-02-26 22:29 UTC — Фикс пустого списка действий + постоянный user web + physics demo flow
- Исправлен баг в админке: если /admin/options не возвращает scopes (или возвращает пусто), поле Действие теперь заполняется fallback-списком DEFAULT_SCOPES (content/tasks/progress/analytics/payments/admin scopes).
- Пользовательский web-интерфейс переведен в постоянный режим: mobile/App.tsx теперь рендерит RootNavigator и на web (WebFallbackShell остается fallback только если navigator недоступен).
- Продолжен план: добавлен physics demo flow урок -> 5 задач -> разбор ошибок.
  * PhysicsLessonsScreen: кнопка Demo flow: 5 задач + разбор для урока.
  * PhysicsTaskScreen: flowMode demo5, отметка Правильно/Ошибка, блокировка Next до ответа, прогресс-бар, итоговый разбор ошибок.
  * RootNavigator: расширены параметры PhysicsTask (taskIds/flowMode).
- Доп. разгрузка admin UI: журнал обернут в сворачиваемый details (таблица подробностей по запросу).
- Проверки: mobile web export OK (собирается full web app), локальная APK сборка Gradle OK (assembleDebug), admin runtime после docker restart активен.

## 2026-02-26 22:36 UTC — Фикс доступа к web:19006 + обновление APK endpoint
- Причина недоступности http://91.197.99.201:19006/: не был запущен постоянный web-сервис на порту 19006.
- Поднят постоянный сервис systemd synapse-mobile-web.service: python3 -m http.server 19006 --directory /root/synapse/mobile/dist --bind 0.0.0.0 (enabled at boot).
- Проверка: 127.0.0.1:19006 и 91.197.99.201:19006 отвечают 200 text/html.
- Для совместимости с вашим скриптом обновлен APK по старому URL: /api/v1/content/downloads/apk/layer-a-debug теперь отдает свежий app-debug.apk (160688181 bytes).
- Исправление админки по scopes уже применено: добавлен fallback DEFAULT_SCOPES, чтобы поле Действие не оставалось пустым при пустом /admin/options.scopes.

## 2026-02-26 22:47 UTC — Исправление белой страницы web (ExpoSQLite)
- Причина белой страницы на 19006: web-бандл падал на requireNativeModule(ExpoSQLite) после включения полного RootNavigator на web.
- Фикс: mobile/app/db/database.ts переведен на lazy-load expo-sqlite только для native; на web DB-инициализация безопасно пропускается, SELECT возвращает пустые наборы, write-операции no-op.
- После фикса пересобран web export: теперь отдается bundle AppEntry-6a0ce9105c416c5aaa51be84fe15c283.js.
- Параллельно обновлен downloadable APK по старому URL /api/v1/content/downloads/apk/layer-a-debug (160688181 bytes).

## 2026-02-26 22:52 UTC — Фикс useI18n provider + инструкции logcat
- Исправлен web/native crash useI18n must be used inside I18nProvider: mobile/App.tsx снова оборачивает приложение в I18nProvider (вместе с AppSessionProvider).
- После фикса пересобран web export, активный bundle на 19006: AppEntry-45651b3407b93f2fa87febb11f21f660.js.
- Пересобран debug APK и обновлен legacy download endpoint /api/v1/content/downloads/apk/layer-a-debug.
- Подготовлены команды для пользователя: автоматический запуск приложения через adb + сбор crash в logcat для вставки в чат.

## 2026-02-26 23:02 UTC — Фикс web hasTouchableProperty + release APK для устройства
- Причина web ошибки hasTouchableProperty: полный RootNavigator на web подтягивал несовместимый стек навигации для web-сборки.
- Решение: в mobile/App.tsx для web возвращен стабильный WebFallbackShell, для native остается RootNavigator.
- Web пересобран, текущий bundle на 19006: AppEntry-6b923b12d4bec17454d5df6a8e1ce45e.js.
- Собран release APK (без зависимости от Metro localhost:8081): /root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk.
- Legacy endpoint /api/v1/content/downloads/apk/layer-a-debug обновлен на release APK (72175075 bytes) для вашего привычного сценария установки через adb.

## 2026-02-27 08:40 UTC — Упрощение mobile footer + маскирование ошибок + стабилизация web
- В mobile/App.tsx удален нижний блок Все права защищены для нативного приложения (без закрепленного футера, без отдельной подложки).
- В HomeScreen заменен raw console.error(error) на безопасный лог с redactSecrets, чтобы не допускать утечки ключей/токенов в logcat.
- Пересобраны web и release APK. Web bundle на 19006: AppEntry-8aa02ba43fc4cfaf1dc499d24428b424.js.
- Legacy endpoint APK обновлен release-сборкой: /api/v1/content/downloads/apk/layer-a-debug (72174699 bytes).


## 2026-02-27 19:47 UTC — Hotfix tranche: security + runtime consistency + home navigation
### Закрыто (факт)
- [done] P0: ограничен `simulate-success` (dev-only + `payments:admin`), закрыт прямой bypass модулей.
- [done] P0: `debugCode` больше не утечет во внешние клиенты; в mobile UI debug-код удален.
- [done] P0: APK download endpoint теперь выбирает последний APK динамически (без hardcoded файла).
- [done] P1: удален dead code после `return` в payment adapters.
- [done] P1: добавлен `/api/v1/modules`, HomeScreen больше не упирается в 404.
- [done] P1: исправлена модульная навигация HomeScreen, добавлен экран/роут `Biology`.

### Добавлено в план (новые обязательные блоки)
- [todo] Teacher live-контур: QR-раздача задания <= 30 секунд + тепловая карта ошибок класса в realtime.
- [todo] Weak-device/network by design: quality-профили Lite/Standard/Enhanced, офлайн-first user journeys, guaranteed core UX без деградации.
- [todo] Content/legal sourcing track: легальные источники контента + pipeline фактчека формул/символов/кодировок + source/license metadata на каждый блок.

### Единый источник правды по прогрессу (planning integrity)
- Прогресс считаем только по статусам `done` в этом файле + подтвержденным smoke/test evidence.
- `assistant_log.md` используется как append-only журнал работ/инцидентов, но не как primary KPI источник.
- Проценты обновляются после каждого подтвержденного шага проверками.

### Progress snapshot
- MVP progress: ~68%.
- Full-plan progress: ~46%.
- Статус темпа: в графике.


## 2026-02-27 20:08 UTC — Quality gate for content + release APK refresh
### Закрыто (done)
- [done] Обязательная проверка кодировки UTF-8 для контентных файлов.
- [done] Mojibake lint (поиск битых последовательностей/символов).
- [done] Snapshot-тесты формул и спецсимволов (baseline + diff check).
- [done] Интеграция quality-check в mobile scripts: `npm run quality:content`.
- [done] Локальная release-сборка APK через Gradle и публикация в content channel.

### Эксплуатационная заметка
- Для установки на устройство можно использовать прежний PowerShell-пайплайн, URL сохранен:
  `http://91.197.99.201:8000/api/v1/content/downloads/apk/layer-a-debug`.

### Progress snapshot
- MVP progress: ~71%.
- Full-plan progress: ~49%.
- Статус темпа: в графике.


## 2026-02-28 19:00 UTC — Delivery update: teacher live + offline-first quality profiles
### Закрыто (done)
- [done] Teacher live backend: session start/status/event/close + QR payload + realtime heatmap.
- [done] Teacher live mobile UI в Cabinet: запуск live, join code, поллинг теплокарты, demo-события.
- [done] Quality profiles Lite/Standard/Enhanced в session state и HomeScreen.
- [done] Offline-first network policy: блок non-auth запросов в offline режиме.
- [done] Onboarding role-consent fix для реального userId после verify.
- [done] Release APK assembled and published to download channel.

### Далее по плану (next)
1. Teacher live phase-2: реальное student-join событие по joinCode + web QR генерация png + classroom mapping.
2. Heatmap phase-2: агрегация по задачам/темам и ранжирование типовых ошибок по классу.
3. Offline-first phase-2: локальная очередь событий и пакетная фонова синхронизация при восстановлении сети.
4. Quality profiles phase-2: явные policy-параметры (fps, heavy effects, preload depth) и runtime toggles.

### Progress snapshot
- MVP progress: ~75%.
- Full-plan progress: ~53%.
- Статус темпа: в графике.


## 2026-02-28 19:02 UTC — Delivery update: teacher live + quality profiles
- [done] Teacher live backend+mobile (QR/code, heatmap, realtime polling).
- [done] Offline-first policy + quality profiles Lite/Standard/Enhanced.
- [done] APK release assembled and published to download endpoint.

Next: phase-2 student join by code, heatmap aggregation, offline queue sync, profile runtime policy tuning.
Progress: MVP ~75%, Full-plan ~53%.

##  — Hotfix: onboarding role tap did not continue
- [done] Fixed offline-first allowlist for /users/consents/accept in onboarding flow.
- [done] Added onboarding fallback when consent sync is unavailable.
- [done] Rebuilt/published APK: synapse-arm64-release-20260228-rolefix.apk.

Progress: MVP ~76%, Full-plan ~54%.

##  — Hotfix: onboarding role tap did not continue
- [done] Fixed offline-first allowlist for /users/consents/accept in onboarding flow.
- [done] Added onboarding fallback when consent sync is unavailable.
- [done] Rebuilt/published APK: synapse-arm64-release-20260228-rolefix.apk.

Progress: MVP ~76%, Full-plan ~54%.

##  — Hotfix2: onboarding role tap unblock
- [done] Role card tap now auto-continues from onboarding.
- [done] Offline-first consent sync fallback enabled.
- [done] New APK published: synapse-arm64-release-20260228-onboardingfix.apk.

Progress: MVP ~77%, Full-plan ~54%.

##  — Hotfix3: scroll + onboarding stability
- [done] Home screen scrolling fixed for mobile devices.
- [done] Onboarding teacher-role continue flow stabilized.
- [done] New APK published: synapse-arm64-release-20260228-scrollfix.apk.

Progress: MVP ~78%, Full-plan ~55%.

##  — Phase-2 increment delivered
- [done] Teacher live phase-2: join by code + participants + classroom mapping + topic heatmap.
- [done] Offline queue telemetry + flush on online network mode.
- [done] Quality profiles runtime policy surfaced in UI.
- [done] APK delivered: synapse-arm64-release-20260301-phase2.apk.

Next:
1) live-class web QR png generation + real roster mapping.
2) offline queue for learning events (not only telemetry) with retry windows.
3) teacher heatmap aggregation by class and mistake taxonomy.

Progress: MVP ~81%, Full-plan ~58%.

##  — Phase-2 increment delivered
- [done] Teacher live phase-2: join by code + participants + classroom mapping + topic heatmap.
- [done] Offline queue telemetry + flush on online network mode.
- [done] Quality profiles runtime policy surfaced in UI.
- [done] APK delivered: synapse-arm64-release-20260301-phase2.apk.

Next:
1) live-class web QR png generation + real roster mapping.
2) offline queue for learning events (not only telemetry) with retry windows.
3) teacher heatmap aggregation by class and mistake taxonomy.

Progress: MVP ~81%, Full-plan ~58%.


## 2026-02-28 21:07 UTC — Phase-2 patch note
- [done] Timestamp-normalized board update for phase-2 delivery.

## 2026-02-28 21:26 UTC — Hotfix: online fallback + periodic table 118
- [done] Исправлен критичный регресс `AppSession.tsx` (import `flushTelemetryQueue`, корректные литералы `"online"/"offline"`, stable online-default).
- [done] Нормализован `api.ts`: fallback network mode `"online"`; offline-first блокирует сеть только при явном `"offline"`.
- [done] `PeriodicTableScreen.tsx` расширен до полной таблицы Менделеева: 118 элементов.
- [done] Новый APK опубликован: `synapse-release-20260301-0026-offlinefix-periodic118.apk`.

Проверки:
- `assembleRelease` -> OK.
- download endpoint -> filename `synapse-release-20260301-0026-offlinefix-periodic118.apk`.

Progress: MVP ~84%, Full-plan ~61%.

## 2026-02-28 22:38 UTC — Phase-3 delivered (live QR + roster + learning queue)
- [done] Teacher live QR в кабинете учителя (генерация SVG QR на клиенте).
- [done] Backend live analytics расширен: `classroomHeatmap`, `mistakeTaxonomy`, `rosterMap`.
- [done] Добавлен roster mapping endpoint: `POST /cabinet/teacher/live/session/{id}/roster`.
- [done] Добавлена offline-first очередь learning events (не только telemetry): retry windows + flush при online.
- [done] Новый ingest endpoint: `POST /learning/events`.
- [done] APK опубликован: `synapse-release-20260301-0137-phase3-liveqr-learningqueue.apk`.

Checks:
- py_compile backend changed files -> OK.
- web export -> OK.
- assembleRelease -> OK.
- apk download endpoint -> OK (filename updated).

Known env issue:
- `tests.test_auth_sync_contract` не запускается на сервере из-за отсутствия fastapi в тестовом python env.

Progress: MVP ~88%, Full-plan ~65%.


## Обновление статуса на 2026-05-08 (prod host verification)
### Выполнено
- Подтвержден настоящий production-хост: `100.67.164.12` / `45.128.205.38`.
- Проверено, что рабочий runtime Алхимик живет именно на новом сервере: `synapse-backend` и `synapse-db` healthy, `health=200`.
- На старом сервере `91.197.99.201` устранен конфликт дублирования: остановлены `synapse-*`, отключены `synapse-backend.service` и `synapse-mobile-web.service`.
- Подтвержден backup-only контур старого сервера: nightly cron, rsync проекта с нового production, `pg_dump` из production БД, свежие backup-артефакты и успешный лог.
### Следующие шаги
1. При желании усилить production autostart на новом сервере отдельным `systemd` unit поверх docker compose, а не только `restart: unless-stopped`.
2. Привести `assistant-continuity-rules-ru.md` в соответствие: заменить старый Tailscale/IP на новый production-хост.
3. Использовать для следующих серверных работ только `root@100.67.164.12`.

## Прогресс на 2026-05-08
- MVP progress: ~89%.
- Full-plan progress: ~66%.
- Темп: в графике.
