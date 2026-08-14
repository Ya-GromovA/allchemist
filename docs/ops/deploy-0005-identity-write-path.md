# Выкатка: путь записи identity в PostgreSQL (ревизия 0005)

Статус: **готово к выкатке, не выкачено.** Раздел 1.1 контракта требует
отдельного согласования на каждое касание боевого контейнера, поэтому работа
доведена до проверенного образа и остановлена здесь.

Дата подготовки: 2026-08-14
Ветка: `ops/migration-authority-and-ci-gates-20260814`
Головной коммит: `0368575`

---

## 1. Что выкатывается

| Что | Значение |
|---|---|
| Образ | `synapse-backend:release-0368575` |
| Digest | `sha256:013ce378d0187fdd18b767476683d46d879a04871762d2702691b35dd954f43d` |
| Ревизия схемы | `0004` → `0005` |
| Коммиты | `12aee5d`, `8562e40`, `68947e6`, `960d27c`, `0368575` |

Тот же самый digest проверен на канареечном контейнере с копией боевых
данных — это не пересборка «того же кода», а тот же образ.

Ревизия 0005 создаёт шесть **новых пустых** таблиц: `password_reset_codes`,
`telemetry_events`, `learning_events`, `live_sessions`,
`live_session_participants`, `live_session_events`. Ни одна существующая
таблица не меняется, ни одна строка не переносится. Миграция аддитивная.

---

## 2. Что уже проверено (не повторять при выкатке)

| Проверка | Результат |
|---|---|
| `tools/db/verify_migration.sh` | ALL GATES PASSED, включая новый гейт 2a: 0005 применена к клону боевой базы |
| `tools/db/verify_identity_migration.sh` | ALL GATES PASSED, 9 гейтов, ноль осиротевших ссылок |
| `tools/db/check_migration_coverage.sh --chain` | линейная цепочка, одна голова `0005` |
| `tools/db/check_migration_coverage.sh --running` | боевая база на `0004`, образ содержит `0001..0004` — перезапуск сейчас безопасен |
| pytest (изолированная БД) | 98 passed, 1 failed — падает `test_content_quality_snapshot`, он ловит незакоммиченные `tools/brand/**` соседней ветки |
| Канарейка: подъём | миграция `0004 → 0005` на боевых данных, health 200 |
| Канарейка: перезапуск | health 200 через 6 с, миграция — no-op, данные на месте |
| Канарейка: легаси-маршруты | `/api/v1/web` 200, `/api/v1/admin/web` 200, `/api/v1/modules` 200 |
| Канарейка: docs закрыты | `/docs`, `/redoc`, `/openapi.json` → 404 |
| Канарейка: регистрация | `users` 59 → 60, `user_identifiers` 83 → 85, `user_credentials` 21 → 22 |
| Канарейка: вход | 57–74 мс, хеш `$argon2id$v=19$m=19456,t=2` |
| `tools/db/verify_db_roles.sh` | 28 из 28 негативных проверок зелёные |

---

## 3. Порядок выкатки

Два шага **раздельно**. Не объединять: если что-то пойдёт не так, надо знать,
что именно.

### Шаг 1 — код и схема (этот выпуск)

```bash
ssh root@100.67.164.12
cd /root/synapse

# 1. Резервная копия. Без неё дальше не идти.
TS=$(date +%Y%m%d-%H%M%S)
docker exec synapse-db pg_dump -U synapse -d synapse -Fc > /root/backups/synapse-predeploy-$TS.dump
cp backend/data/user_state.json /root/backups/user_state-predeploy-$TS.json
ls -la /root/backups/synapse-predeploy-$TS.dump   # должен быть ~400 КБ, не 0

# 2. Пометить текущий образ как точку отката.
docker tag infra-synapse-backend:latest infra-synapse-backend:rollback-$TS
docker images | grep rollback-$TS

# 3. Поставить проверенный digest под то имя, которым пользуется compose.
docker tag synapse-backend:release-0368575 infra-synapse-backend:latest
docker image inspect infra-synapse-backend:latest --format '{{.Id}}'
# ожидается sha256:013ce378d0187fdd18b767476683d46d879a04871762d2702691b35dd954f43d

# 4. Перезапустить БЕЗ пересборки — иначе поедет не проверенный образ.
docker compose -f infra/docker-compose.yml up -d --no-build synapse-backend

# 5. Дождаться и посмотреть, что сказал entrypoint.
sleep 15
docker logs --since 2m synapse-backend 2>&1 | grep -E 'migrate|entrypoint|startup'
# ожидается: revision before upgrade: 0004 / after upgrade: 0005 / schema is at head
```

### Проверка после выкатки

```bash
# Схема и здоровье
docker exec synapse-db psql -U synapse -d synapse -tAc 'select version_num from alembic_version'   # 0005
curl -sS -o /dev/null -w '%{http_code}\n' https://api.allchemist.ru/api/v1/health                   # 200

# Легаси обязано работать (AGENTS.md, правило 2)
for p in /api/v1/web /api/v1/web/assets/app.js /api/v1/admin/web /api/v1/modules; do
  printf '%-30s %s\n' "$p" "$(curl -sS -o /dev/null -w '%{http_code}' https://api.allchemist.ru$p)"
done

# Контрольные счёты: ничего не потеряно
docker exec synapse-db psql -U synapse -d synapse -tAc \
  "select 'users=' || (select count(*) from users)
        || ' identifiers=' || (select count(*) from user_identifiers)
        || ' credentials=' || (select count(*) from user_credentials)
        || ' sessions=' || (select count(*) from user_sessions)"
# до выкатки: users=59 identifiers=83 credentials=21 sessions=1021

# Покрытие миграций после выкатки
bash tools/db/check_migration_coverage.sh --running    # должно быть 0005

# Живой вход реальным аккаунтом — единственная проверка, которую нельзя
# заменить синтетикой. Выполняет владелец в браузере.
```

### Откат шага 1

```bash
TS=<та же метка, что и при выкатке>

# Если после выкатки успели зарегистрироваться новые пользователи, СНАЧАЛА
# вернуть их в JSON: старый образ читает файл, а не таблицы, и без этого
# новые аккаунты станут для него невидимыми.
docker exec -w /app synapse-backend python -m app.scripts.export_state_to_json --dry-run
docker exec -w /app synapse-backend python -m app.scripts.export_state_to_json --apply

# Вернуть образ.
docker tag infra-synapse-backend:rollback-$TS infra-synapse-backend:latest
docker compose -f infra/docker-compose.yml up -d --no-build synapse-backend
sleep 15 && curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/v1/health
```

Схему откатывать **не нужно**: 0005 только добавляет пустые таблицы, старый код
их не знает и не задевает. `alembic downgrade 0004` понадобится, только если
надо получить в точности прежнюю схему, и он уничтожит всё, что успело
записаться в новые таблицы.

Полный откат данных, если понадобится:

```bash
docker compose -f infra/docker-compose.yml stop synapse-backend
docker exec -i synapse-db pg_restore -U synapse -d synapse --clean --if-exists \
  < /root/backups/synapse-predeploy-$TS.dump
cp /root/backups/user_state-predeploy-$TS.json backend/data/user_state.json
```

### Шаг 2 — раздельные роли БД (ОТДЕЛЬНОЕ согласование, после того как шаг 1 отстоится)

Не делать в один день с шагом 1.

```bash
cd /root/synapse
bash tools/db/provision_db_roles.sh synapse-db synapse synapse
bash tools/db/verify_db_roles.sh    synapse-db synapse synapse   # ожидается 28/28

# Затем в infra/docker-compose.yml для synapse-backend добавить:
#   POSTGRES_USER: synapse_app
#   POSTGRES_PASSWORD: ${SYNAPSE_APP_PASSWORD}
#   ALEMBIC_DATABASE_URL: postgresql+psycopg://synapse_migrate:${SYNAPSE_MIGRATE_PASSWORD}@synapse-db:5432/synapse
# с подстановкой из /root/ops-secrets/synapse/db-roles.env через env_file.
```

**ALEMBIC_DATABASE_URL обязателен.** Приложение под `synapse_app` не имеет прав
DDL, и entrypoint не сможет применить следующую миграцию. Это проверено на
канарейке в обе стороны: без переменной контейнер честно падает с
`[migrate] FAILED: database schema was not brought to head` и не начинает
обслуживать трафик; с переменной — мигрирует под `synapse_migrate` и работает
под `synapse_app`.

Откат шага 2: вернуть в compose `POSTGRES_USER=synapse` и убрать
`ALEMBIC_DATABASE_URL`, перезапустить контейнер. Роли в кластере можно оставить
— они ничему не мешают, пока ими не пользуются.

---

## 4. Чего этот выпуск НЕ делает

* Не переключает `allchemist.ru` на новый стек. Маршруты не трогаются.
* Не переносит платежи: у них до сих пор нет схемы, они остаются в JSON.
  Это ревизия 0006.
* Не включает row-level security. Изоляция тенантов держится на прикладной
  цепочке доступа; `synapse_app` технически читает строки любой школы.
* Не удаляет `backend/data/user_state.json`. Файл остаётся источником отката
  и продолжает обслуживать коллекции, которые ещё не перенесены.

---

## 5. Канареечный стенд

Пока поднят и доступен для осмотра:

* `http://127.0.0.1:8010/api/v1/health` — приложение под ролью `synapse_app`
* `pg-canary` на `127.0.0.1:5436` — копия боевой базы, уже на ревизии 0005

Снять, когда больше не нужен:

```bash
docker rm -f synapse-backend-canary pg-canary
docker network rm synapse-canary
```
