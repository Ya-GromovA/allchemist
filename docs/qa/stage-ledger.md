# Allchemist Stage Ledger

Дата фиксации: 2026-05-29

Правило статусов:  ставится только после кода, сборки и соответствующих smoke/regression-проверок.

## Этапы

| Этап | Статус |
| --- | --- |
| 1. Stage ledger | СДЕЛАНО И ПРОВЕРЕНО |
| 2. Роли и вход | СДЕЛАНО И ПРОВЕРЕНО |
| 3. Web layout | СДЕЛАНО И ПРОВЕРЕНО |
| 4. Mobile layout | СДЕЛАНО И ПРОВЕРЕНО |
| 5. Splash | СДЕЛАНО И ПРОВЕРЕНО |
| 6. Assets | СДЕЛАНО И ПРОВЕРЕНО |
| 7. Учебные экраны web/mobile | СДЕЛАНО И ПРОВЕРЕНО |
| 8. Admin | СДЕЛАНО И ПРОВЕРЕНО |
| 9. Контентный pipeline | СДЕЛАНО И ПРОВЕРЕНО |
| 10. Security/subscriptions | СДЕЛАНО И ПРОВЕРЕНО |
| 11. Production infrastructure | СДЕЛАНО И ПРОВЕРЕНО |
| 12. Full smoke | СДЕЛАНО И ПРОВЕРЕНО |
| 13. Интерактивная таблица элементов | СДЕЛАНО И ПРОВЕРЕНО |
| 14. Массы элементов в mobile | СДЕЛАНО И ПРОВЕРЕНО |
| 15. Production hardening gate | СДЕЛАНО И ПРОВЕРЕНО |
| 16. Forced logout для техокон | СДЕЛАНО И ПРОВЕРЕНО |
| 17. CI/CD baseline | СДЕЛАНО И ПРОВЕРЕНО |
| 18. Real VCS provider connection | СДЕЛАНО И ПРОВЕРЕНО |
| 19. Monitoring probe baseline | СДЕЛАНО И ПРОВЕРЕНО |
| 20. CDN/Object Storage readiness | ПЕРЕНЕСЁН В BACKLOG |

## Backlog (в порядке приоритета)

1. **Учебный content production** — наполнение химии/физики/биологии verified corpus, научная/методическая проверка, симуляторы/3D assets.
2. **Payment provider E2E** — подключение реального платёжного провайдера (ЮKassa / Robokassa / Tinkoff), E2E тест с реальной картой (sandbox).
3. **Production monitoring/alerts** — подключение production_monitor_probe.py к внешнему мониторингу (Prometheus + Alertmanager или облачный сервис).
4. **External blockers** — legal sign-off, restore drill evidence, physical ARM device smoke.
5. **Stage 20: CDN/Object Storage** — код готов, нужен выбор провайдера. Перенесён в конец по запросу владельца.

## Stage 21: Учебный content production — ЧАСТИЧНО СДЕЛАНО (2026-05-29)

Первый инкремент закрывает физику на уровне bundled corpus v2.

Что сделано:
- /root/synapse/mobile/assets/content/physics_pack_v1.json обновлен до version 2.
- Физика расширена с 6 lesson_blocks и 6 tasks до 30 lesson_blocks и 78 tasks.
- Добавлены 12 тем на русском и английском: механика, давление, энергия, тепло, электричество, оптика, атомная физика.
- Добавлены 4 physics_scenarios и 4 AI knowledge entries.
- Для новых уроков добавлены grade, branch, formulae, common_mistakes, mini_check, task_ids, source_type editorial_verified, verified=true.

Проверено:
- python3 -m json.tool для physics_pack_v1.json.
- Внутренняя проверка ссылок tasks -> lesson_blocks: missing_task_lessons count 0.
- mobile npx tsc --noEmit.

Остаток этапа:
- Реальный biology content вместо static/demo screen.
- Расширение chemistry task bank под 33 темы.
- Physics UI/simulator rendering для новых payload formulae/scenarios.
- Научная и методическая проверка полного корпуса.

## Permanent QA Rule: Release Gates (2026-05-29)

Server Android tools/emulators:
- adb: /opt/android-sdk/platform-tools/adb
- emulator: /opt/android-sdk/emulator/emulator
- AVD: allchemist_api35, allchemist_api35_aosp
- Preferred smoke AVD: allchemist_api35_aosp

Mobile release gate:
- mobile npx tsc --noEmit
- Android release build
- APK emulator smoke on allchemist_api35_aosp (or explicit BLOCKER)
- public APK metadata/HEAD
- monitoring probe

Web/admin/backend release gate:
- backend regression tests for scope
- node --check for changed web/admin JS
- Playwright/browser smoke for web/admin
- backend health after rebuild/deploy

## Stage 21 APK artifact: 1.0.12 — СДЕЛАНО И ПРОВЕРЕНО (2026-05-30)

- Emulator inventory закреплён: allchemist_api35 и allchemist_api35_aosp; preferred smoke AVD: allchemist_api35_aosp.
- System UI ANR устранён через wipe-data/cold boot AVD.
- Clean install timeout исправлен: mobile App.tsx content init timeout увеличен до 120 секунд.
- APK emulator smoke passed:
  - AVD: allchemist_api35_aosp
  - screenshots: /tmp/allchemist-apk-1012-timeoutfix-smoke.png, /tmp/allchemist-apk-1012-timeoutfix-smoke-late-1.png, /tmp/allchemist-apk-1012-timeoutfix-smoke-late-2.png
  - ui_dump: /tmp/allchemist-apk-1012-timeoutfix-smoke-uiautomator.xml
- Published latest APK:
  - file: allchemist-release-20260529-1.0.12-physics-content-v2-smoke-verified.apk
  - sha256: 81a8bd03bc6008fd15a958be1687da331083a52814270ccf015a4c50cab17e75
  - size: 105406467
- Public metadata/HEAD and monitoring probe verified.

## Этап 1: Аудит текущего состояния — ЗАВЕРШЁН (2026-06-01)

Статус: аудит завершён, функциональный код не менялся. Ниже статус текущего продукта по новому prompt после проверки production-копии `/root/synapse`, public/admin/mobile UI, content packs, APK metadata и тестовых пользователей.

| Область | Статус | Основание |
| --- | --- | --- |
| Public web вход и CTA | BROKEN | Главный CTA всё ещё `Скачать Android APK`; публичный вход показывает сценарии `Я учусь`, `Я учитель`, `Я родитель`; нет требуемого hero набора `Войти`, `Попробовать демо`, `Купить доступ`, `Активировать код`, `Вход для сотрудника школы`. |
| Public web role routing | PARTIAL | Backend роль определяется по `/auth/login` и `/auth/me`, но frontend всё ещё хранит `selectedRole`, имеет role cards и fallback `state.role || "student"` в consent/profile paths. |
| Mobile вход и роли | BROKEN | `OnboardingRoleScreen.tsx` показывает сценарные карточки ролей, `finishAuth` и phone flow используют fallback `student`; `WebFallbackShell.tsx` содержит свободный выбор профиля `student/teacher/homeroom_teacher/parent`. |
| Logout/session clearing | PARTIAL | Web `clearSession()` вызывается после `/auth/logout`; mobile `signOut()` удаляет `synapse.session.v1`, `synapse.device.sync.v1`, active live session и state tokens, но SecureStore не используется/не очищается, login/password form state очищается только через размонтирование экрана. |
| Admin UI strings | BROKEN | В user-facing admin есть `Publish gate`, `QA workflow`, `workflow`, raw role fallback (`row.role`, `roleLabelMap[value] || value`). |
| Content strings | BROKEN | В bundled content остаются запрещённые English titles: `Find amount of substance`, `Balance the equation`, `Open answer: ...`. |
| Учебный content production | PARTIAL | Physics pack v2: 30 lesson_blocks / 78 tasks; chemistry pack: 4 lesson_blocks / 6 tasks; biology real content не найден как полноценный production pack. |
| Periodic table | PARTIAL | Web/mobile имеют 118 элементов, массы и интерактивные режимы; новый reference asset ещё не интегрирован, mobile enriched details заполнены выборочно. |
| Assets/design structure | NOT STARTED | На production host отсутствуют требуемые `apps/web/...` и `apps/mobile/...` asset directories; source images есть локально в текущем workspace, но не в `/home/usgromov/Allchemist` на production host. |
| APK 1.0.12 metadata | DONE WITH RISK | Public latest metadata указывает smoke-verified `1.0.12`, versionCode 13, SHA256 `81a8bd03bc6008fd15a958be1687da331083a52814270ccf015a4c50cab17e75`; audit ранее выявлял повторный ANR risk, требуется fresh smoke перед следующим mobile release. |
| Test users | DONE | `s2070`, `t2070`, `h2070`, `p2070` успешно вошли через production `/auth/login`; `/auth/me` вернул ожидаемые роли `student`, `teacher`, `homeroom_teacher`, `parent`. |

Выявленные блокеры перед Этапом 2/3:
- Убрать свободный выбор ролей из public web/mobile onboarding и WebFallbackShell.
- Убрать frontend fallback `student` после backend-auth там, где роль должна приходить только с сервера.
- Заменить public hero CTA и маршруты demo/module details/payment/school-staff login.
- Перевести admin content QA labels с technical English на русские user-facing формулировки.
- Перевести запрещённые English content titles в bundled chemistry/physics packs.
- Синхронизировать source assets на production host и создать требуемую asset directory structure.
- До следующего APK релиза повторить `npx tsc --noEmit`, release build, fresh install emulator smoke, metadata/HEAD и monitoring probe.

## APK 1.0.12 Fresh Smoke — ПРОЙДЕН (2026-06-01)

Проверка выполнена перед следующим mobile release из-за ранее выявленного ANR risk.

- APK: `/root/synapse/content_packs/allchemist-release-20260529-1.0.12-physics-content-v2-smoke-verified.apk`
- SHA256: `81a8bd03bc6008fd15a958be1687da331083a52814270ccf015a4c50cab17e75`
- AVD: `allchemist_api35_aosp`
- Режим: clean reinstall (`force-stop`, `uninstall`, fresh install)
- Ожидание: `UI_WAIT_SECONDS=45`, `LATE_WAIT_SECONDS=45` дважды
- Результат: `APK emulator smoke passed`, ANR dialog не найден, bad Android/React Native signals не найдены
- Артефакты:
  - `/tmp/allchemist-apk-1012-fresh-smoke-20260601.png`
  - `/tmp/allchemist-apk-1012-fresh-smoke-20260601-late-1.png`
  - `/tmp/allchemist-apk-1012-fresh-smoke-20260601-late-2.png`
  - `/tmp/allchemist-apk-1012-fresh-smoke-20260601-uiautomator.xml`

## Этап 2: Assets и design baseline — ЧАСТИЧНО СДЕЛАНО И ПРОВЕРЕНО (2026-06-01)

Что сделано:
- Создана требуемая asset directory structure:
  - `/home/usgromov/Allchemist/apps/web/public/assets/brand`
  - `/home/usgromov/Allchemist/apps/web/public/assets/backgrounds`
  - `/home/usgromov/Allchemist/apps/web/public/assets/modules`
  - `/home/usgromov/Allchemist/apps/web/public/assets/icons`
  - `/home/usgromov/Allchemist/apps/web/public/assets/periodic-table`
  - `/home/usgromov/Allchemist/apps/mobile/src/assets/brand`
  - `/home/usgromov/Allchemist/apps/mobile/src/assets/backgrounds`
  - `/home/usgromov/Allchemist/apps/mobile/src/assets/modules`
  - `/home/usgromov/Allchemist/apps/mobile/src/assets/icons`
- Source assets перенесены на production host в `/home/usgromov/Allchemist/assets/source`:
  - `main-bg-science.png`
  - `alchemist-hero.png`
  - `periodic-table-reference.png`
- Подготовлены `.webp` и `.preview.webp` копии для web/mobile trees.
- Public web начал использовать новые served assets:
  - `/api/v1/web/assets/main-bg-science.webp`
  - `/api/v1/web/assets/alchemist-hero.webp`
- В `/root/synapse/backend/app/api/v1/endpoints/public_web.py` добавлен whitelist для новых assets.
- Auth/API/role logic не менялись в этом этапе.

Проверено:
- `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py`
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py` -> 5 passed
- Backend rebuilt: `docker compose up -d --build synapse-backend`
- GET checks:
  - `/api/v1/health` -> 200
  - `/api/v1/web` -> 200
  - `/api/v1/web/assets/main-bg-science.webp` -> 200
  - `/api/v1/web/assets/alchemist-hero.webp` -> 200
  - `/api/v1/web/assets/periodic-table-reference.webp` -> 200
- Browser smoke passed:
  - `node tools/playwright-visual-smoke.mjs`
  - `node tools/playwright-admin-auth-roles-smoke.mjs`
  - `node tools/playwright-authenticated-roles-smoke.mjs`
- Monitoring probe passed: `production_monitor_probe.py --api-base https://api.allchemist.ru/api/v1 --format json`

Остаток:
- Этап 3: исправить public login/demo/module/payment/staff routes и убрать свободный выбор ролей.
- Mobile assets пока подготовлены в tree, но не подключены к APK; при подключении потребуется полный mobile release gate.


## Этап 3: Backend-driven auth routes and mobile role cleanup — СДЕЛАНО И ПРОВЕРЕНО (2026-06-01)

Что сделано:
- Public web больше не показывает свободный выбор служебных ролей до входа.
- Hero CTA заменён на русские действия: `Войти`, `Попробовать демо`, `Купить доступ`, `Активировать код`, `Вход для сотрудника школы`.
- `Попробовать демо` открывает публичный demo-mode без реального кабинета, роли и local session.
- `Подробнее` у модулей открывает публичное описание, не кабинет.
- После login роль берётся только из backend `/auth/login` и `/auth/me`; frontend fallback на `student` в изменённых auth paths убран.
- Web `clearSession()` очищает access/refresh token, active role, cached profile/module state и login/password/access-code form state.
- Mobile onboarding больше не показывает local role scenario cards и не продолжает как `student` без backend role.
- Mobile WebFallbackShell больше не показывает role chips/free profile selection; guest/demo остаётся public preview only.
- Тесты public web обновлены под backend-driven role contract и отсутствие `selectedRole`.
- Playwright visual smoke selector уточнён на `#openAccessCodeBtn`.

Проверено:
- `node --check backend/app/web_public/app.js` -> OK
- `cd /root/synapse/mobile && npx tsc --noEmit` -> OK
- `/usr/bin/rg` по удалённым public/mobile role-choice строкам -> no matches
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py tests/test_auth_sync_contract.py` -> 12 passed
- Backend rebuilt: `cd /root/synapse/infra && docker compose up -d --build synapse-backend`
- Production checks:
  - `/api/v1/health` -> 200
  - `/api/v1/web` -> 200
  - deployed `roleChoice` scan -> false
- Browser smokes passed:
  - `node tools/playwright-visual-smoke.mjs`
  - `node tools/playwright-admin-auth-roles-smoke.mjs`
  - `node tools/playwright-authenticated-roles-smoke.mjs`
- Android release built and smoke-verified after wipe-data + cold boot on `allchemist_api35_aosp`.
- APK emulator smoke result: `APK emulator smoke passed`; ANR dialog not found after clean run.
- Public APK metadata/HEAD verified; monitoring probe OK.
- Local downloaded APK copy verified in `/home/usgromov/Allchemist/apk` with matching size/hash.

Published APK:
- file: `allchemist-release-20260601-1.0.13-stage3-auth-routes-smoke-verified.apk`
- server path: `/root/synapse/content_packs/allchemist-release-20260601-1.0.13-stage3-auth-routes-smoke-verified.apk`
- local path: `/home/usgromov/Allchemist/apk/allchemist-release-20260601-1.0.13-stage3-auth-routes-smoke-verified.apk`
- versionName: `1.0.13`
- versionCode: `14`
- sha256: `15cc7d893e53e7d9578958591aea23308575e2c73048ab0aa7088d641e4f48bc`
- size: `105404755`

Остаток:
- Admin cleanup: заменить `Publish gate`, `QA workflow`, `workflow`, raw role fallbacks на русские user-facing labels.
- Content cleanup: перевести запрещённые English titles в chemistry/physics packs.
- Periodic-table reference asset ещё нужно интегрировать глубже в UI.
- Biology production content и chemistry expansion остаются следующими content stages.

## Этап 4: Admin user-facing technical strings cleanup — СДЕЛАНО И ПРОВЕРЕНО (2026-06-01)

Что сделано:
- В admin UI заменены user-facing `Publish gate`, `QA workflow`, `workflow ID`, `content QA`, `legal review`, `license metadata` на русские формулировки.
- Очереди content review теперь называются очередями проверки/редакционной проверки.
- Admin role label fallback больше не выводит raw role key пользователю; известные роли имеют русские fallback labels, неизвестная роль показывается как `Неизвестная роль`.
- Test marker в `tests/test_admin_panel.py` обновлён под русскую формулировку.

Проверено:
- `node --check backend/app/web_admin/app.js` -> OK
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_admin_panel.py tests/test_ui_labels.py` -> 6 passed
- `/usr/bin/rg` по admin app/index/test markers больше не находит `Publish gate`, `QA workflow`, `Очереди workflow`, `workflow ID`, `publish gate` в active admin UI files.
- Backend rebuilt: `cd /root/synapse/infra && docker compose up -d --build synapse-backend`
- Production checks:
  - `https://api.allchemist.ru/api/v1/health` -> 200
  - `https://admin.allchemist.ru` -> 200
  - deployed admin HTML/assets scan: forbidden admin labels -> false
- Browser smoke passed: `node tools/playwright-admin-auth-roles-smoke.mjs`
- Monitoring probe passed: `production_monitor_probe.py --api-base https://api.allchemist.ru/api/v1 --format json`

Остаток:
- Content cleanup: перевести запрещённые English titles в bundled chemistry/physics packs.
- Tools/docs могут содержать слово `workflow` как внутреннюю документацию/тестовые forbidden arrays; active admin UI очищен.

## Этап 5: Content forbidden English titles cleanup + APK 1.0.14 — СДЕЛАНО И ПРОВЕРЕНО (2026-06-01)

Что сделано:
- В bundled content переведены запрещённые English task titles:
  - Find amount of substance -> Найдите количество вещества
  - Balance the equation -> Уравняйте химическое уравнение
  - Open answer: balancing algorithm -> Развёрнутый ответ: алгоритм уравнивания
  - Open answer: apply Ohm's law -> Развёрнутый ответ: примените закон Ома
- Структура content packs не менялась.
- Android release повышен до versionName 1.0.14, versionCode 15.
- Published latest APK обновлён на smoke-verified 1.0.14.

Проверено:
- /usr/bin/rg по Find amount of substance|Balance the equation|Open answer|Next lesson|available: false в mobile/assets/content, content_packs, web_public, web_admin -> no matches
- python3 -m json.tool для physics_pack_v1.json и chemistry_pack_v1.json -> OK
- cd /root/synapse/mobile && npx tsc --noEmit -> OK
- cd /root/synapse/mobile/android && ./gradlew assembleRelease -> BUILD SUCCESSFUL
- APK emulator smoke on allchemist_api35_aosp -> APK emulator smoke passed
- Public metadata -> versionName 1.0.14, versionCode 15, fileName allchemist-release-20260601-1.0.14-content-titles-smoke-verified.apk
- Public APK HEAD -> 200, Content-Length 105404759
- Monitoring probe -> OK
- Local HTTPS download verified in /home/usgromov/Allchemist/apk with matching size/hash.

Published APK:
- file: allchemist-release-20260601-1.0.14-content-titles-smoke-verified.apk
- server path: /root/synapse/content_packs/allchemist-release-20260601-1.0.14-content-titles-smoke-verified.apk
- local path: /home/usgromov/Allchemist/apk/allchemist-release-20260601-1.0.14-content-titles-smoke-verified.apk
- versionName: 1.0.14
- versionCode: 15
- sha256: 640de17f0c1538a2cb86e879a06f03c21f865dbc33ced2eda90c5a90989a6805
- size: 105404759

Остаток:
- Periodic-table reference asset deeper UI integration.
- Biology production content and chemistry expansion.
- Git commit/push не выполнялись без явного запроса.

## Этап 2: Assets и design baseline — ЗАВЕРШЁН ДО КОНЦА (2026-06-01)

Что дополнено после частичного завершения:
- Production source assets подключены не только к public web, но и к mobile bundle:
  - mobile/assets/backgrounds/main-bg-science.png
  - mobile/assets/brand/alchemist-hero.png
  - mobile/assets/periodic-table/periodic-table-reference.png
- Mobile AppBackground использует production background и alchemist hero assets вместо старых root assets.
- Mobile PeriodicTableScreen получил опорную схему таблицы элементов из reference asset.
- Public web interactive periodic panel получил reference-card с served periodic-table-reference image.
- Android release повышен до versionName 1.0.15, versionCode 16.
- APK 1.0.15 опубликован как latest после clean emulator smoke.

Проверено:
- node --check backend/app/web_public/app.js -> OK
- node --check backend/app/web_admin/app.js -> OK
- pytest tests/test_public_web.py tests/test_admin_panel.py tests/test_ui_labels.py -> 11 passed
- backend rebuild -> OK
- GET https://api.allchemist.ru/api/v1/health -> 200
- GET https://api.allchemist.ru/api/v1/web -> 200
- GET https://api.allchemist.ru/api/v1/web/assets/periodic-table-reference.webp -> 200
- Playwright visual/admin/authenticated smokes -> passed
- cd /root/synapse/mobile && npx tsc --noEmit -> OK
- cd /root/synapse/mobile/android && ./gradlew assembleRelease -> BUILD SUCCESSFUL
- APK emulator smoke on allchemist_api35_aosp -> APK emulator smoke passed
- Public APK metadata/HEAD -> versionName 1.0.15, versionCode 16, HEAD 200, Content-Length 111267571
- production_monitor_probe.py -> OK

Published APK:
- file: allchemist-release-20260601-1.0.15-stage2-assets-complete-smoke-verified.apk
- server path: /root/synapse/content_packs/allchemist-release-20260601-1.0.15-stage2-assets-complete-smoke-verified.apk
- versionName: 1.0.15
- versionCode: 16
- sha256: b259743fa9da3261b95478c23e232cad020622b6e66ddb94da93c33083625b08
- size: 111267571

Остаток перенесён в новый Figma migration backlog: полная controlled migration всего web-интерфейса по Figma export.

## Figma migration audit and stage ledger — НАЧАТ (2026-06-01)

Source files:
- Prompt path `/home/usgromov/Allchemist/apk/доки/figma-export.zip` отсутствует.
- Correct export found under another name: `/home/usgromov/Allchemist/apk/доки/Execute prompt.zip`.
- Распаковано локально в `/tmp/opencode/allchemist-figma-export`.
- Required images present:
  - `/home/usgromov/Allchemist/apk/доки/fon-2.png`
  - `/home/usgromov/Allchemist/apk/доки/alchemist-hero.png`
  - `/home/usgromov/Allchemist/apk/доки/Таблица.png`

Figma export findings:
- Stack: React/Vite/Tailwind/Lucide, not production Allchemist stack.
- Active routes in export: `/`, `/login`, `/pricing`/`/plans`, `/activate`/`/activate-code`, `/staff-login`/`/school-login`, `/demo/*`, `/student/*`, `/teacher`, `/parent`, `/homeroom`.
- Alternative unused routes file exists with `/admin`, `/class-teacher`, `/chemistry`, `/physics`, `/biology`, `/ai-tutor`, `/periodic-table`, `/virtual-lab`.
- Useful migration inputs: Landing, Login, Activate, StaffLogin, Pricing, demo pages, dashboards, NavBar, DashboardLayout, PageBackground, GlassCard, PeriodicTable, design tokens, icons, assets.
- Not safe to copy directly: fake login navigates to `/student`, activation code navigates to `/student`, StaffLogin navigates to `/school`, logout is a link only, dashboards are hardcoded/mock, permissions are local UI only.

Production architecture findings:
- Web public is backend-served static `backend/app/web_public/index.html`, `app.js`, `styles.css`, served by `/api/v1/web` and `/api/v1/web/assets/{asset}`.
- Admin is backend-served static `backend/app/web_admin/index.html`, `app.js`, `styles.css`, served by `/api/v1/admin/web` and `/api/v1/admin/web/assets/{asset}`.
- Auth/API are real backend endpoints in `auth_sync.py`: `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/auth/invite/activate`, `/auth/role/switch`, access/profile/payments/device sync.
- Admin/API endpoints exist for users, schools, rights, subscriptions, security, audit, database overview.
- Content endpoints exist for packs, catalog, exams, QA sources/blocks/queues, molecules, reactions, AI search and APK downloads.
- Mobile session restore uses AsyncStorage and backend `/auth/me`; logout removes session/device sync keys. SecureStore is not used.
- Test users listed in `docs/qa/test-users.md` and `docs/qa/demo-accounts.txt`, including the long `alch_test_*` list from prompt.

Already correct or recently completed:
- Role choice removed from public/mobile auth flow; server determines role after login.
- Public demo/module details do not open real dashboard without auth.
- Admin user-facing technical strings cleanup done.
- Forbidden English bundled task titles cleanup done.
- Public web has 118-element periodic table and newly added reference image card.
- Mobile APK latest 1.0.15 smoke-verified after Stage 2 asset completion.

Incorrect/partial relative to prompt:
- Full Figma visual system is not yet applied to all web surfaces; public/admin/dashboard still mix legacy production UI with partial new assets.
- Production web is not React route-based; Figma route map must be adapted into current static shell or a deliberate new web app layer.
- Demo routes are UI states, not full URL routes for every `/demo/...` path yet.
- Protected web dashboards are in one shell state, not real URL routes like `/student`, `/teacher`, `/parent`, `/admin/content`.
- Student/parent/teacher/homeroom dashboards need UX cleanup and role-specific separation beyond current cards.
- Admin/content remains functional but still too dense; needs staged UX redesign and help sections.
- Content depth remains partial: chemistry 4 lesson_blocks/6 tasks; physics 30 lesson_blocks/78 tasks; biology full production pack not complete.
- Email registration/password reset production SMTP flow remains blocked on env secrets.

Controlled migration stages:
1. Public Figma shell and assets: copy exact prompt assets, apply fon-2 background, alchemist feathered hero, concise landing CTA, subject cards to demo/details, no protected access from public. Files: `backend/app/web_public/index.html`, `styles.css`, `app.js`, `public_web.py`, served assets, `tests/test_public_web.py`, Playwright smoke if needed.
2. URL-aware public/demo routes inside current architecture: support `/login`, `/plans`, `/activate-code`, `/school-login`, `/demo`, `/demo/chemistry`, `/demo/physics`, `/demo/biology`, `/demo/ai`, `/demo/periodic-table` without fake session. Files: public web JS/HTML/tests/Nginx/backend route if needed.
3. Auth/login cleanup: simplify login page, ensure no role selection, clear password/login on logout, logo behavior by auth state. Files: public web JS/HTML/tests, auth smoke.
4. Dashboard layout migration: adapt Figma DashboardLayout/NavBar patterns into authenticated role workspace while preserving backend role/access/profile data. Files: public web JS/CSS/tests.
5. Role-specific dashboards: student, parent, teacher, homeroom, school-admin/admin/content/support/owner separation and access-gated nav. Files: public/admin JS/CSS/tests, role smokes.
6. Periodic table product UI: complete reference-style table with right card, atom model, trainer, responsive layout, source metadata. Files: public web JS/CSS, mobile if touched, tests/smoke/APK if mobile touched.
7. Admin/content UX redesign: split content page into understandable sections, help placeholders, audit trail clarity, invalid-token handling. Files: web_admin JS/HTML/CSS/tests/smoke.
8. Content production roadmap execution: expand chemistry/biology/physics packs with verified content, source metadata and QA statuses. Mobile APK gate if bundle changes.
9. Full QA matrix: all listed test users, route guards, logo/logout/session, public/demo/auth, admin/content, APK smoke if mobile changed.

Immediate Stage selected:
- Stage 1 public Figma shell and assets, because it is isolated, visible, and does not require changing backend auth/data contracts.

## Figma migration Stage 1 — public shell/assets verified (2026-06-01)

Scope:
- Production public web remains backend-served static HTML/CSS/JS; Figma React prototype was not copied over directly.
- Public landing shell now uses prompt visual direction: `fon-2` background, feathered `alchemist-hero`, concise CTA hierarchy, richer subject cards, `#features` anchor.
- Public assets are served through `/api/v1/web/assets/{asset}` with whitelist entries for `fon-2.png` and `fon-2.webp`.
- Existing backend-driven auth/session contract is preserved: public demo stays public preview, module details are public descriptions, protected cabinet opens only after backend auth.

Touched files:
- `backend/app/web_public/index.html`
- `backend/app/web_public/styles.css`
- `backend/app/api/v1/endpoints/public_web.py`
- Served assets: `fon-2.png`, `fon-2.webp`, `alchemist-hero.png`, `alchemist-hero.webp`, `periodic-table-reference.png`, `periodic-table-reference.webp`

Verification:
- `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py` -> OK
- `node --check backend/app/web_public/app.js` -> OK
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py` -> 5 passed
- `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> backend rebuilt and started
- `GET https://api.allchemist.ru/api/v1/health` -> 200, `{"status":"ok","service":"allchemist-api"}`
- `GET https://api.allchemist.ru/api/v1/web` -> 200, 25130 bytes
- `GET https://api.allchemist.ru/api/v1/web/assets/fon-2.webp` -> 200, 114514 bytes
- `GET https://api.allchemist.ru/api/v1/web/assets/alchemist-hero.webp` -> 200, 265550 bytes
- `GET https://api.allchemist.ru/api/v1/web/assets/periodic-table-reference.webp` -> 200, 158120 bytes
- `node tools/playwright-visual-smoke.mjs` -> screenshots saved to `/tmp/allchemist-visual-smoke`
- `node tools/playwright-authenticated-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-auth-roles-smoke`
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-admin-auth-roles-smoke`
- `python3 tools/production_monitor_probe.py` -> OK, latest APK metadata remains 1.0.15 / versionCode 16

Notes:
- `HEAD https://api.allchemist.ru/api/v1/web` returns 405; Stage 1 web availability was verified with `GET` instead.
- A broad forbidden-string scan still finds an existing mobile English-language fallback line in `mobile/app/screens/PhysicsTaskScreen.tsx`; it was not changed in this web-only stage to avoid triggering a new APK gate.

Next controlled stage:
- Stage 2 URL-aware public/demo routes for `/login`, `/plans`, `/activate-code`, `/school-login`, `/demo`, `/demo/chemistry`, `/demo/physics`, `/demo/biology`, `/demo/ai`, `/demo/periodic-table` without fake sessions or protected access.

## Figma migration Stage 2 — URL-aware public/demo routes verified (2026-06-01)

Scope:
- Added backend shell routes for known public paths under `/api/v1/web/...` without changing auth endpoints or protected cabinet contracts.
- Added public JS route mapping for `/login`, `/plans`, `/pricing`, `/activate-code`, `/school-login`, `/staff-login`, `/demo`, `/demo/chemistry`, `/demo/physics`, `/demo/biology`, `/demo/ai`, `/demo/periodic-table`.
- Public CTA clicks now update the browser URL and call existing safe public actions; they do not create local roles, fake sessions or protected dashboards.
- Public periodic-table demo shows the reference image and explains that interactive progress requires login.

Touched files:
- `backend/app/api/v1/endpoints/public_web.py`
- `backend/app/web_public/app.js`
- `backend/tests/test_public_web.py`

Verification:
- `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py` -> OK
- `node --check backend/app/web_public/app.js` -> OK
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py` -> 6 passed
- `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> backend rebuilt and started
- Production route GET checks -> 200 for `/api/v1/health`, `/api/v1/web`, `/api/v1/web/login`, `/api/v1/web/plans`, `/api/v1/web/pricing`, `/api/v1/web/activate-code`, `/api/v1/web/school-login`, `/api/v1/web/staff-login`, `/api/v1/web/demo`, `/api/v1/web/demo/chemistry`, `/api/v1/web/demo/physics`, `/api/v1/web/demo/biology`, `/api/v1/web/demo/ai`, `/api/v1/web/demo/periodic-table`
- `node tools/playwright-visual-smoke.mjs` -> screenshots saved to `/tmp/allchemist-visual-smoke`
- `node tools/playwright-authenticated-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-auth-roles-smoke`
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-admin-auth-roles-smoke`
- `python3 tools/production_monitor_probe.py` -> OK, latest APK metadata remains 1.0.15 / versionCode 16

Next controlled stage:
- Stage 3 auth/login cleanup: simplify login page behavior, keep backend role as source of truth, ensure logo/logout/session cleanup behavior remains correct across URL routes.

## Figma migration Stage 3 — auth/login cleanup verified (2026-06-02)

Scope:
- Kept backend-driven auth as source of truth: login still uses `/auth/login`, restored sessions verify `/auth/me`, and the client now rejects missing server role after `/auth/me`.
- Expanded frontend role normalization to include all backend roles used by authenticated smoke users: `student`, `learner`, `parent`, `teacher`, `homeroom_teacher`, `school_admin`, `admin`, `owner`, `content_editor`, `support`.
- Added route-aware logout: clears session/forms/panels and returns to `/login` without preserving protected state.
- Added clickable brand behavior: public users return to public hero; authenticated users return to cabinet workspace.
- Added `safeUserMessage()` guard so technical backend details are not shown as user-facing auth/status text.

Touched files:
- `backend/app/web_public/index.html`
- `backend/app/web_public/styles.css`
- `backend/app/web_public/app.js`
- `backend/tests/test_public_web.py`

Verification:
- `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py` -> OK
- `node --check backend/app/web_public/app.js` -> OK
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py tests/test_auth_sync_contract.py` -> 13 passed
- `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> backend rebuilt and started
- Production GET checks -> 200 for `/api/v1/health`, `/api/v1/web`, `/api/v1/web/login`, `/api/v1/web/demo`, `/api/v1/web/demo/periodic-table`, `/api/v1/web/assets/app.js`, `/api/v1/web/assets/styles.css`
- Forbidden web/admin scan -> no matches for blocked user-facing labels or raw technical strings
- `node tools/playwright-visual-smoke.mjs` -> screenshots saved to `/tmp/allchemist-visual-smoke`
- `node tools/playwright-authenticated-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-auth-roles-smoke`
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> screenshots saved to `/tmp/allchemist-admin-auth-roles-smoke`
- `python3 tools/production_monitor_probe.py` -> OK, latest APK metadata remains 1.0.15 / versionCode 16

Regression found and fixed during verification:
- Initial authenticated role smoke exposed that strengthened `/auth/me` validation was too narrow for admin/support/content roles. Fixed by allowing all backend roles in `normalizeRole()` while keeping public role choice removed.

Next controlled stage:
- Stage 4 dashboard layout migration: adapt Figma DashboardLayout/NavBar patterns into authenticated role workspace while preserving backend role/access/profile data.

## Figma full UI migration pass — React bundle deployed and smoke-verified (2026-06-02)

Source audit:
- Requested `/home/usgromov/Allchemist/apk/доки/figma-export.zip` was not present.
- Actual Figma export used: `/home/usgromov/Allchemist/apk/доки/Execute prompt.zip`.
- Fresh unpack: `/tmp/opencode/allchemist-figma-fresh`.
- Required prompt assets copied into the bundle source: `fon-2.png`, `alchemist-hero.png`, `Таблица.png`.
- Figma source files used: `package.json`, `src/main.tsx`, `src/app/App.tsx`, `src/app/routes.ts`, `src/app/components/{Layout,NavBar,PageBackground,GlassCard,PeriodicTable,DashboardLayout,AlhimikIcon}.tsx`, `src/app/pages/Landing.tsx`, `Login.tsx`, `Activate.tsx`, `StaffLogin.tsx`, `Pricing.tsx`, `demo/*`, `student/*`, role dashboards, `src/app/data/elements.ts`, `src/styles/*`.

Architecture decision:
- Production web was changed from old backend-served static layout to backend-served React/Vite bundle under `backend/app/web_public_react`.
- Backend/API/auth/database/admin/mobile endpoints were not replaced.
- `/api/v1/web` and known `/api/v1/web/...` app routes now serve the React index; hashed assets are served by `/api/v1/web/figma-assets/{asset_path}`.
- Legacy `/api/v1/web/assets/{asset}` remains for old static assets where still needed.

Route/component map implemented:
- `/` and `/api/v1/web` -> Figma `Landing.tsx` with hero, subjects, features, AI, exams, audience, CTA, footer.
- `/login` -> Figma `Login.tsx` adapted to real `/auth/login` and backend role redirect.
- `/plans` and `/pricing` -> Figma `Pricing.tsx`.
- `/activate-code` and `/activate` -> Figma `Activate.tsx`, fake `/student` redirect removed.
- `/school-login` and `/staff-login` -> Figma `StaffLogin.tsx` adapted to real login.
- `/demo`, `/demo/chemistry`, `/demo/physics`, `/demo/biology`, `/demo/ai`, `/demo/periodic-table`, `/demo/labs`, `/demo/molecules`, `/demo/physics-simulator`, `/demo/microscope`, `/demo/cell`, `/demo/exams`, `/demo/revision-plan` -> Figma demo/features pages with public guest nav and no logout.
- `/student`, `/student/chemistry`, `/student/physics`, `/student/biology`, `/student/chemistry/periodic-table`, `/student/ai-tutor` -> Figma student dashboard/subject/periodic pages behind real auth guard.
- `/teacher`, `/parent`, `/homeroom`, `/school-admin`, `/admin`, `/support`, `/content` -> Figma role dashboard pages behind real auth guard.

Auth/demo fixes:
- Added React auth adapter `src/app/auth.ts`: compatible `allchemist_web_session_v1`, `/auth/login`, `/auth/me`, `/auth/logout`, backend role normalization, role home routing, localStorage/sessionStorage cleanup.
- Added `ProtectedRoute.tsx`: unauthenticated protected routes redirect to `/login`; wrong-role sessions redirect to backend role home.
- Removed Figma mock navigation `navigate('/student')` from active login/activation flows.
- Demo feature pages no longer use student navbar or logout; CTAs go to `/login`/`/plans`/`/activate-code`.
- Public buttons now route to canonical public/demo URLs instead of protected dashboards.

Touched production files/directories:
- `backend/app/web_public_react/` (new React build output)
- `backend/app/api/v1/endpoints/public_web.py`
- `backend/tests/test_public_web.py`
- `tools/playwright-visual-smoke.mjs`
- `tools/playwright-authenticated-roles-smoke.mjs`

Build and verification:
- Local Figma build: `npm install`; `npm run build` -> Vite build OK, bundle JS 515 KB minified / 129 KB gzip, CSS 173 KB / 23 KB gzip. Warning: JS chunk >500 KB; code-splitting remains performance backlog.
- Production branch created: `figma-full-ui-migration-20260602`.
- `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py` -> OK.
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_public_web.py tests/test_auth_sync_contract.py` -> 13 passed.
- Backend rebuild: `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> OK.
- Production GET checks -> 200 for `/api/v1/health`, `/api/v1/web`, `/api/v1/web/login`, `/api/v1/web/plans`, `/api/v1/web/activate-code`, `/api/v1/web/school-login`, `/api/v1/web/demo`, `/api/v1/web/demo/chemistry`, `/api/v1/web/demo/labs`, `/api/v1/web/demo/periodic-table`, `/api/v1/web/student`, `/api/v1/web/student/chemistry/periodic-table`, `/api/v1/web/admin`.
- React index markers -> `id="root"`, `/api/v1/web/figma-assets/assets/index-*.js`, `/api/v1/web/figma-assets/assets/index-*.css`; no old `authPanel`/`appShell` in served index.
- Forbidden web/admin scan on `web_public_react` and `web_admin` -> no matches.
- `node tools/playwright-visual-smoke.mjs` -> OK, screenshots `/tmp/allchemist-visual-smoke`.
- `node tools/playwright-authenticated-roles-smoke.mjs` -> OK, screenshots `/tmp/allchemist-auth-roles-smoke`.
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> OK, screenshots `/tmp/allchemist-admin-auth-roles-smoke`.
- Manual Playwright smoke: `/demo` shows demo marker and no logout; unauthenticated `/student` is guarded -> OK.
- `python3 tools/production_monitor_probe.py` -> OK, latest APK remains 1.0.15 / versionCode 16.

Known remaining gaps after this pass:
- Figma dashboards are now visually deployed and auth-guarded, but many dashboard cards still use Figma mock content instead of real `/users/profile`, `/users/access`, `/modules`, teacher/parent/class analytics APIs.
- Periodic table uses Figma component and 118-element data plus prompt assets, but reference-level refinements such as atomic model/trainer layout parity with `Таблица.png` still need another focused pass.
- React bundle is a single large JS chunk; route-level code splitting/lazy loading remains performance backlog.
- The original prompt path `figma-export.zip` still does not exist; source mismatch must stay documented.


## 2026-06-02 — Periodic reference pass: visual smoke follow-up verified
- Investigated intermittent `tools/playwright-visual-smoke.mjs` failure after the periodic-table reference deploy.
- Root cause: the smoke selected the first `Войти` link on the responsive landing page; on the mobile profile that could target a hidden/non-current link and change the URL before the React route content finished rendering.
- Minimal smoke fix applied in `tools/playwright-visual-smoke.mjs`: click the visible `Войти` link and explicitly wait for demo/login page markers before reading `body` text.
- Verification passed: `cd /root/synapse && node tools/playwright-visual-smoke.mjs` -> `Visual smoke screenshots saved to /tmp/allchemist-visual-smoke`.
- Product route diagnostic remains OK: `/api/v1/web` -> `Попробовать` opens `/api/v1/web/demo`; demo marker is present and logout is absent.


## 2026-06-08 — Allchemist Admin mockup integration pass
- Audited production architecture before edits: FastAPI backend, backend-served static admin app under `backend/app/web_admin`, admin API in `backend/app/api/v1/endpoints/admin_panel.py`, real state in `backend/app/data/user_state.json`, content QA tables created by `backend/app/db/init_db.py` (`content_sources`, `content_blocks`, `content_qa_events`).
- Used design source `/home/usgromov/Allchemist/docs/design/allchemist_admin_mockup.html` as visual reference; did not iframe or replace project architecture.
- Added protected real-data admin endpoints: `/admin/dashboard/summary`, `/admin/dashboard/activity`, `/admin/dashboard/subjects-activity`, `/admin/dashboard/schools-map`, `/admin/events/recent`, `/admin/content/qa/summary`, `/admin/directory/{section}`.
- Endpoint access is restricted via existing `_require_system_admin`; non-admin tokens receive 403.
- Dashboard data is aggregated from real `user_state`, `admin_audit`, school/license state and content QA tables. Missing school geography or absent analytics/events produce explicit empty states instead of fake numbers.
- Reworked `backend/app/web_admin/index.html`, `styles.css`, `app.js` toward the admin mockup: dark navy/sidebar composition, topbar, KPI cards, activity chart, platform metrics, subject activity, SVG/CSS map panel, recent events and directory pages for students/teachers/parents/labs/analytics/events/settings/support.
- Preserved existing admin workflows and smoke markers: users, schools, subscriptions/accesses, content, security, roles/rights, help/docs, audit journal.
- Added tests for dashboard API authorization, summary/activity/subjects/map/events/content QA/directory responses.

Verification:
- `python3 -m py_compile backend/app/api/v1/endpoints/admin_panel.py backend/app/services/admin_panel_service.py` -> OK.
- `node --check backend/app/web_admin/app.js` -> OK.
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_admin_panel.py tests/test_admin_ui.py tests/test_admin_web.py` -> 7 passed.
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_auth_sync_contract.py tests/test_ui_labels.py` -> 9 passed.
- Backend rebuild: `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> container started.
- HTTP checks: `/api/v1/health` 200, `/api/v1/admin/web` 200, admin `app.js` 200, admin `styles.css` 200.
- Production new endpoint checks via admin password login -> 200 for summary, activity, subjects, schools map, recent events, content QA summary, students directory.
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> OK, screenshots `/tmp/allchemist-admin-auth-roles-smoke`.
- `node tools/playwright-visual-smoke.mjs` -> OK, screenshots `/tmp/allchemist-visual-smoke`.
- `python3 tools/production_monitor_probe.py` -> OK; latest APK remains 1.0.15 / versionCode 16.
- Forbidden admin/web scan -> no matches for blocked strings.

Remaining gaps:
- No DB migration added in this pass because required content QA tables already exist and current admin/system events are represented by existing `admin_audit` state. A dedicated `system_events` table can be added later if product needs non-admin event ingestion beyond audit.
- School map shows a correct empty state until schools have city/region plus coordinates in DB/state.
- Analytics/AI/support advanced tables show empty states until dedicated telemetry/ticket tables are introduced.


## 2026-06-08 — Allchemist Admin exact light mockup correction
- Corrected prior dark admin direction to match `docs/design/allchemist_admin_mockup.html` exactly: light blue/white page background, dark left vertical menu, `Алхимик` logo with `Admin Console`, light sticky header, hero `Админка «Алхимик»`, KPI grid, `Активность платформы`, `Требует внимания`, and mockup menu groups (`Управление`, `Контент`, `Система`).
- Kept existing architecture: backend-served static admin app in `backend/app/web_admin`, FastAPI admin API in `backend/app/api/v1/endpoints/admin_panel.py`; no iframe and no parallel frontend app.
- Added missing real-data endpoints/fields for the exact mockup: `/admin/dashboard/activity-totals`, `/admin/dashboard/attention`, `/admin/search`, plus summary fields `schoolsCount`, `usersCount`, `licensesCount`, `publishedMaterialsCount`, `reviewMaterialsCount`, `errors24hCount`, `criticalErrorsCount`, `liveLessonsNowCount`, `monthlyPaymentsAmount`, `serviceUptimePercent`, `currentApkVersion`.
- Updated dashboard JS to render real API values into mockup cards; no demo numbers from the HTML prototype remain in the live dashboard.
- Added exact mockup screens for `Content QA`, `Источники`, `Модули`, `Live-уроки`, `Мобильные версии`, `Логи`, `Аналитика`, `Настройки` with real directory/API loading or explicit empty states.
- Restored auth visibility after CSS override: unauthenticated admin shell no longer shows `Admin Console` or dashboard content before login.
- Updated admin tests and Playwright smoke markers to assert the exact light mockup labels rather than the previous dark dashboard labels.

Verification:
- `python3 -m py_compile backend/app/api/v1/endpoints/admin_panel.py backend/app/services/admin_panel_service.py` -> OK.
- `node --check backend/app/web_admin/app.js` -> OK.
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_admin_panel.py tests/test_admin_ui.py tests/test_admin_web.py` -> 7 passed.
- `POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 PYTHONPATH=/root/synapse/backend ./.venv-test/bin/pytest tests/test_auth_sync_contract.py tests/test_ui_labels.py` -> 9 passed.
- Backend rebuild: `cd /root/synapse/infra && docker compose up -d --build synapse-backend` -> container started.
- HTTP checks: `/api/v1/health`, `/api/v1/admin/web`, admin `app.js`, admin `styles.css` -> 200.
- Production endpoint checks via admin password login -> 200 for summary, activity totals, attention, search, QA directory, apps directory.
- `node tools/playwright-admin-auth-roles-smoke.mjs` -> OK, screenshots `/tmp/allchemist-admin-auth-roles-smoke`.
- `node tools/playwright-visual-smoke.mjs` -> OK, screenshots `/tmp/allchemist-visual-smoke`.
- `python3 tools/production_monitor_probe.py` -> OK; APK remains 1.0.15 / versionCode 16.
- User-facing admin/backend forbidden-string scan -> no matches.
- Unauthenticated admin browser check -> `hasAdminConsoleBeforeAuth=false`, `hasDashboardBeforeAuth=false`.

Remaining gaps:
- Advanced domain datasets that do not yet exist (live lesson telemetry, molecule opens, detailed payments, support tickets) render real zero/empty states until corresponding tables/events are introduced.
- `/admin` external path depends on current nginx/domain routing; backend-served canonical route remains `/api/v1/admin/web` and `https://admin.allchemist.ru`.

## 2026-06-11 — Admin Reference Dashboard Pass
- Scope: backend-served admin UI aligned closer to `docs/design/references/admin-reference.png` without backend contract or DB migration changes.
- Files changed: `backend/app/web_admin/index.html`, `backend/app/web_admin/styles.css`, `backend/app/web_admin/app.js`, `tools/playwright-visual-smoke.mjs`.
- UI changes: light workspace, dark left sidebar, sticky topbar, notification badge, admin profile/email, sidebar collapse/footer, reference hero with flask illustration, KPI grid, activity/attention, subjects, schools map, recent events, Content QA home block.
- Data: reused real admin endpoints `/admin/dashboard/*`, `/admin/events/recent`, `/admin/content/qa/summary`; no new migrations.
- Auth fix: unauthenticated admin route now shows login overlay immediately and still hides dashboard content before auth.
- Checks: `python3 -m py_compile backend/app/api/v1/endpoints/admin_panel.py backend/app/services/admin_panel_service.py` OK; `node --check backend/app/web_admin/app.js` OK; `node --check tools/playwright-visual-smoke.mjs` OK.
- Tests: `tests/test_admin_panel.py tests/test_admin_ui.py tests/test_admin_web.py tests/test_auth_sync_contract.py tests/test_ui_labels.py` -> 16 passed.
- Deploy: `cd /root/synapse/infra && docker compose up -d --build synapse-backend` OK; container started.
- HTTP: GET `/api/v1/health`, `/api/v1/admin/web`, `/api/v1/admin/web/assets/app.js`, `/api/v1/admin/web/assets/styles.css` OK.
- Browser smoke: `node tools/playwright-admin-auth-roles-smoke.mjs` OK, screenshots `/tmp/allchemist-admin-auth-roles-smoke`; `node tools/playwright-visual-smoke.mjs` OK, screenshots `/tmp/allchemist-visual-smoke`.
- Monitor: `python3 tools/production_monitor_probe.py` OK; APK latest remains 1.0.15/versionCode 16/SHA256 b259743fa9da3261b95478c23e232cad020622b6e66ddb94da93c33083625b08.
- Forbidden scan: no matches in `backend/app/web_admin` and `tools/playwright-visual-smoke.mjs` for configured forbidden user-facing strings.

## 2026-06-12 — Public Web HEAD And Network Reachability Check
- Network check from current client IP `185.193.50.61`: DNS still resolves `allchemist.ru`, `www.allchemist.ru`, `api.allchemist.ru` to `45.128.205.38`; TCP/443 to public IP still times out after provider-side change, so propagation/upstream route is not yet visible from this network.
- Server-side check: nginx listens on `0.0.0.0:80/443`; server-local and Tailscale-routed HTTPS reach `allchemist.ru` successfully.
- Fix: added explicit `HEAD /api/v1/web` support in `backend/app/api/v1/endpoints/public_web.py`; this makes `HEAD https://allchemist.ru/` and `HEAD https://www.allchemist.ru/` return `200 OK` through nginx instead of backend `405`.
- Fix: added explicit `HEAD /api/v1/health` support in `backend/app/api/v1/endpoints/system.py`; this makes API health HEAD probes return `200 OK`.
- Test update: `backend/tests/test_public_web.py` now asserts `HEAD /api/v1/web` returns `200` and `text/html`.
- Checks: `python3 -m py_compile backend/app/api/v1/endpoints/public_web.py backend/app/api/v1/endpoints/system.py` OK.
- Tests: `tests/test_public_web.py tests/test_auth_sync_contract.py tests/test_ui_labels.py` -> 15 passed.
- Deploy: `cd /root/synapse/infra && docker compose up -d --build synapse-backend` OK; container started.
- Live checks from server: `HEAD https://allchemist.ru/` -> 200, `HEAD https://www.allchemist.ru/` -> 200, `HEAD https://api.allchemist.ru/api/v1/health` -> 200, `GET https://allchemist.ru/` -> 884 bytes.
- Tailscale-routed check from client: `HEAD https://allchemist.ru/` via `100.67.164.12:443` -> 200.
- Current public route from client remains blocked/timed out pending provider propagation.
- Smoke: `node tools/playwright-visual-smoke.mjs` OK; `python3 tools/production_monitor_probe.py` OK.
- Forbidden scan on changed files: no matches.
