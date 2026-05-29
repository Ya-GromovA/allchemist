# Алхимик: исполняемый delivery-план + монетизация (MVP)

## 1) Команда и мощность на спринт

Модель: 8 спринтов по 2 недели, старт `2026-03-02`.

- Backend: 2 инженера (`~28 SP/спринт`)
- Mobile: 2 инженера (`~34 SP/спринт`)
- Content: 3 автора-методиста (`~36 SP/спринт`)
- Design: 1 продуктовый дизайнер (`~14 SP/спринт`)
- QA: 1 инженер + 1 part-time auto QA (`~18 SP/спринт`)

Суммарная плановая мощность: `~130 SP/спринт`.

## 2) Календарь спринтов и дедлайны

- Sprint 1: `02.03.2026 - 15.03.2026`
- Sprint 2: `16.03.2026 - 29.03.2026`
- Sprint 3: `30.03.2026 - 12.04.2026`
- Sprint 4: `13.04.2026 - 26.04.2026`
- Sprint 5: `27.04.2026 - 10.05.2026`
- Sprint 6: `11.05.2026 - 24.05.2026`
- Sprint 7: `25.05.2026 - 07.06.2026`
- Sprint 8: `08.06.2026 - 21.06.2026`

Ключевые вехи:

- Alpha: конец Sprint 2 (`29.03.2026`)
- Beta: конец Sprint 5 (`10.05.2026`)
- Release Candidate: конец Sprint 8 (`21.06.2026`)

## 3) Исполняемый план по ролям (кто делает что)

## Sprint 1 — Foundation + Governance

- Backend (26 SP): RBAC, entitlements, consent log, payment abstraction skeleton, telemetry API.
- Mobile (30 SP): onboarding, first-run загрузка core-пака, роль-профили, crash/perf events.
- Content (22 SP): контент-шаблоны, source/license policy, 30 стартовых тем (школа).
- Design (12 SP): дизайн-система, user flows onboarding/lessons/paywall draft.
- QA (10 SP): test strategy, smoke suites, bug taxonomy.

Зависимости: backend RBAC -> mobile onboarding; content schema -> mobile lessons rendering.

## Sprint 2 — Lessons + Legal

- Backend (28 SP): curriculum API, legal docs versioning, age-gate and parental consent flow.
- Mobile (34 SP): класс/курс -> учебник/автор -> тема, офлайн-кэш уроков, legal acceptance UI.
- Content (30 SP): 7–11 классы (ядро), старт вузового каталога, метки сложности/целей.
- Design (10 SP): lesson UX, legal screens, progress components.
- QA (12 SP): regression пакеты, consent-flow E2E, offline tests.

Зависимости: legal APIs -> release gating; content packs v2 -> lesson catalog.

## Sprint 3 — Tasks + Anti-cheat

- Backend (30 SP): attempts engine, answer validation, anti-cheat signals, share-link service.
- Mobile (33 SP): задачи/тесты, разбор ошибок, правильные ответы с обоснованием.
- Content (34 SP): 600 задач школа + 150 вуз (базовые), шаблоны экзаменационных вопросов.
- Design (12 SP): task UX, feedback states, anti-cheat user messaging.
- QA (16 SP): grading correctness matrix, anti-cheat smoke checks.

Зависимости: attempts API -> teacher analytics basis; anti-cheat events -> reports.

## Sprint 4 — Reactions v1 (2 режима)

- Backend (24 SP): reaction scenario API, safety flags, lab events logging.
- Mobile (38 SP): молекулярный режим, колбочки режим, звук+вибрация, safety warnings.
- Content (36 SP): 120 сценариев реакций (школа+база вуза), описания и условия.
- Design (14 SP): motion specs, lab controls, accessibility in animations.
- QA (18 SP): scenario validation matrix, device perf tiers Lite/Standard.

Зависимости: content scenarios -> both reaction engines; performance budget gate.

## Sprint 5 — Molecules + Beta

- Backend (22 SP): molecule metadata API, source tracking, caching headers.
- Mobile (36 SP): 2D/3D молекулы, подписи, связи, поиск, быстрый сброс, performance tuning.
- Content (30 SP): расширение свойств/совместимости, источники, русские названия.
- Design (12 SP): molecule cards, transition polish, micro-interactions.
- QA (18 SP): beta regression, low-end device suite, install/update checks.

Зависимости: molecule data quality -> search quality; perf budget -> beta sign-off.

## Sprint 6 — AI everywhere + Cost control

- Backend (30 SP): AI router (offline/online), quota service, billing events, abuse limits.
- Mobile (34 SP): AI widget на всех экранах, голосовой ввод (диктовка), context prompts.
- Content (28 SP): базовые AI-answer templates, knowledge grounding policies.
- Design (10 SP): AI panel UX, voice states, fallback states.
- QA (16 SP): AI routing tests, quota/cost tests, offline fallback reliability.

Зависимости: quota service -> paywall offers; voice UX -> accessibility checks.

## Sprint 7 — Teacher/Parent + Moderation

- Backend (32 SP): classroom assignments, teacher dashboards, parent reports, moderation queue.
- Mobile (30 SP): teacher assignment flow, parent progress cards, report/abuse flows.
- Content (24 SP): учительские пакеты лаб.работ, rubric templates.
- Design (12 SP): class dashboards, parent insights, moderation UX.
- QA (18 SP): role-based E2E, moderation SLA checks, privacy tests.

Зависимости: anti-cheat signals from S3 -> teacher trust indicators.

## Sprint 8 — Monetization + Payments + RC

- Backend (34 SP): Robokassa/T-Bank/YooKassa integration, webhooks, entitlement grant, A/B paywall backend.
- Mobile (30 SP): paywall screens, subscriptions/modules purchase flows, receipt handling.
- Content (16 SP): paid bundle packaging + free tier boundary.
- Design (12 SP): paywall variants (A/B), pricing communication.
- QA (20 SP): payment E2E sandbox, recovery flows, release checklist.

Зависимости: payment webhooks -> entitlement; QA payment matrix -> launch go/no-go.

## 4) Общие зависимости (critical path)

- Consent + legal gating (S1/S2) -> открытие персональных функций.
- Attempts/anti-cheat (S3) -> teacher analytics trust.
- Reaction engines + scenario data (S4) -> lab assignment functionality.
- AI quota service (S6) -> монетизация AI и unit economics.
- Payment providers + webhooks (S8) -> revenue start at scale.

## 5) Монетизация: пути и тарифная логика

Каналы дохода:

- Freemium -> Subscription (1/3/12 мес)
- One-time module purchase (класс/дисциплина)
- AI online packs (докупка квот)
- Teacher Pro / School B2B лицензии

Рекомендуемые цены для модели (RUB):

- Подписка 1 мес: `699`
- Подписка 3 мес: `1 790`
- Подписка 12 мес: `5 990`
- Модуль (one-time): `499-1 490` (в расчетах средний чек `499` для MVP-lite)
- AI pack: `199`
- School license (старт): от `45 000`/мес за пилотный пул

## 6) Прогноз выручки по месяцам (базовый сценарий)

Модель считает выручку по потокам:

- первичные оплаты новых пользователей;
- рекуррентная подписка;
- one-time модульные покупки;
- AI packs;
- B2B (с 5-го месяца).

Прогноз (RUB/месяц):

| Месяц | Выручка, RUB |
|---|---:|
| 1 | 49 339 |
| 2 | 91 245 |
| 3 | 155 841 |
| 4 | 236 741 |
| 5 | 392 897 |
| 6 | 570 455 |
| 7 | 774 881 |
| 8 | 1 011 608 |
| 9 | 1 291 030 |
| 10 | 1 593 513 |
| 11 | 1 939 391 |
| 12 | 2 328 975 |

Годовая сумма по базовой модели: `10 435 916 RUB`.

Примечание: это модельный прогноз для планирования; фактический доход зависит от CAC, retention, paywall-conversion и доли B2B.

## 7) Unit economics и A/B paywall (исполняемо)

С первого релиза фиксируются:

- CAC, ARPU, ARPPU, churn, LTV/CAC, cost per online-AI request;
- A/B #1: момент показа paywall;
- A/B #2: подписка-only vs подписка+модули;
- A/B #3: AI trial лимит.

Решения по ценам и пакетам принимаются только по статистически значимым данным.

## 8) Пути распространения приложения

### 8.1 Digital каналы (B2C)

- Google Play (если доступно в регионе), RuStore, AppGallery;
- direct APK канал (ваш endpoint) для controlled rollouts;
- web-лендинг с deep links и QR для установки;
- реферальные кампании `пригласи друга`.

### 8.2 Образовательные каналы (B2B/B2G-lite)

- пилоты в школах/колледжах/вузах;
- учительские амбассадор-программы;
- партнерства с онлайн-школами и репетиторскими центрами;
- методические вебинары для преподавателей.

### 8.3 Product-led рост

- шаринг задач/викторин внутри приложения;
- совместные челленджи классов;
- публичные результаты (opt-in) и бейджи прогресса.

## 9) Риски delivery и mitigation

- риск перегруза scope -> lock P0 на Sprint 1-4, P1 после beta;
- риск платежных сбоев -> sandbox matrix + idempotent webhooks + fallback provider;
- риск cost blow-up AI -> quotas + caching + offline-first prompts;
- риск perf на слабых девайсах -> Lite profile как обязательный gate.

## 10) Release gate (go/no-go)

MVP release допускается только если:

- legal/consent flow полностью рабочий;
- ключевые SLO выполнены 14 дней подряд на staging/prod-like;
- платежи проходят E2E во всех 3 провайдерах;
- crash-free sessions `>= 99.0%`;
- критические user journeys (урок -> задача -> прогресс -> шаринг -> оплата) проходят без blockers.

## 11) Дополнительные обязательные блоки (включены в delivery)

### 11.1 Learning outcomes (доказательство эффективности)

- Backend: experiments service + outcome metrics store;
- Mobile: pre-test/post-test flows;
- Content: эталонные контрольные наборы;
- QA: валидация корректности метрик и A/B сегментации.

Цель: подтвердить рост точности и скорости решения задач по темам.

### 11.2 Контент-операционка

- Backend: editorial workflow statuses, SLA timers;
- Content: регламент обновлений и scientific review board;
- QA: контент regression checklist.

Цель: предсказуемые сроки обновления тем и научная корректность.

### 11.3 LTV-удержание и анти-выгорание

- Mobile: ежедневные цели, streak chains, микро-сессии 10-15 минут;
- Backend: персональные планы и напоминания;
- Design: low-friction UX и reward feedback.

Цель: рост D7/D30 retention без перегруза пользователя.

### 11.4 Role onboarding + fail-safe

- Mobile: отдельный first-time сценарий для ученика/учителя/родителя;
- Backend: role templates и quick-start assignments;
- QA: слабая сеть/слабое устройство (graceful degradation matrix).

Цель: стабильная работа в реальных школьных условиях.

### 11.5 Trust-слой AI

- Backend: provenance payload (`source`, `confidence`, `updated_at`);
- Mobile: визуализация доверия в каждом ответе;
- Content: source mapping и freshness policy.

Цель: прозрачность и доверие к AI-ответам.

## 12) Дифференцирующие фичи: delivery-раскладка

### Внутри MVP (без сдвига RC)

- Sprint 4: лаборатория с последствиями (sandbox v1) + ТБ.
- Sprint 6: AI-объяснение в 3 уровнях + персональный AI-репетитор v1.
- Sprint 7: teacher live dashboard + parent one-screen summary.
- Sprint 8: план подготовки к контрольной/сессии v1 + умные карточки ошибок v1.

### Post-MVP Wave (2 спринта после RC)

- Sprint 9: режим "Сдай экзамен" (таймер, стресс-формат, разбор), карьерный мост.
- Sprint 10: реферальный growth-контур и расширенный anti-burnout UX.

## 13) Обновленные KPI для top-features

- learning uplift: `+12%` к точности по темам после 4 недель;
- D30 retention: `>= 22%` для школьного трека;
- teacher weekly active classes: `>= 35%` от созданных;
- share-to-solve conversion: `>= 18%`;
- trust label interaction rate (AI): `>= 25%` просмотров ответа.
