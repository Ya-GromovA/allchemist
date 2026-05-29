# Stage 15: Production Hardening Gate

Дата фиксации: 2026-05-27

Цель этапа: превратить уже существующий production baseline в повторяемую проверку, которая не требует внешних секретов провайдеров и не скрывает ручные блокеры.

## Что проверяет gate

`/root/synapse/tools/stage15-production-hardening-check.sh` выполняет:

1. Stage 11 production preflight: APK metadata/artifact, public health, public APK metadata, Docker health.
2. Наличие runbook-документов production readiness и SLO/alerts/backup.
3. Sanity-check production `.env`: `POSTGRES_PASSWORD` и `JWT_SECRET` не должны быть дефолтными/короткими placeholder-значениями.
4. Backup/restore evidence без изменения production state: создаёт временный `pg_dump`, копию `user_state.json`, manifest SHA256, проверяет `gzip -t`, JSON parse и `sha256sum -c`.
5. Наличие CI/CD workflow directory, если checkout содержит `.github/workflows`.

## Что исправлено в backup

`/root/synapse/tools/backup_synapse.sh` теперь:

1. Берёт state из корректного пути `/root/synapse/backend/data/user_state.json`.
2. Позволяет переопределить путь через `SYNAPSE_STATE_PATH`.
3. Пишет SHA256 manifest рядом с DB/state backup artifacts.
4. Выставляет права `700` на backup directory и `600` на DB/state/manifest artifacts.

## Controlled Rotation

2026-05-27 выполнена controlled rotation production secrets после подтверждения владельца:

1. Перед изменением создан backup DB/state и копии env в `/root/synapse/backups/stage15-secret-rotation-20260527-174404`.
2. Сгенерированы новые значения `POSTGRES_PASSWORD` и `JWT_SECRET` на сервере без вывода секретов в лог.
3. Пароль роли PostgreSQL `synapse` обновлён внутри `synapse-db`.
4. `/root/synapse/infra/.env` и `/root/synapse/backend/.env` синхронно обновлены.
5. Backend перезапущен через `cd /root/synapse/infra && docker compose up -d --build synapse-backend`.
6. Старые access JWT после rotation больше не проходят проверку подписи, но существующие refresh-сессии не были отозваны и могут автоматически выпустить новый access JWT. Поэтому web-пользователь мог остаться в кабинете после обновления страницы.

## Проверка после rotation

1. Public health: `200`, `status=ok`.
2. Stage 15 gate: `OK: stage15 production hardening check completed`.
3. Default secret marker audit: старые placeholder-значения не найдены в `infra/.env` и `backend/.env`.
4. Targeted backend regression: `tests/test_content_quality_snapshot.py tests/test_public_web.py tests/test_auth_sync_contract.py` -> `12 passed`.
5. Backup permissions check: directory `700`, artifacts `600`.

## Session Behavior

Stage 15 был rotation секретов, а не global logout. Если нужно принудительно выбросить всех пользователей во время технического окна, нужно отдельно отозвать строки `sessions` в `/root/synapse/backend/data/user_state.json` или добавить server-side `sessionVersion`/`notBefore` policy и покрыть это тестом.

## Внешние blockers

Остаются отдельными owner/provider actions:

1. CDN/Object Storage для APK/content packs.
2. CI/CD с dev/stage/prod promotion и секретами в провайдере репозитория.
3. External monitoring/alerts provider.
4. Payment provider E2E с настоящими staging/prod credentials.
5. Legal sign-off и финальные публичные документы.
6. Physical Android ARM smoke и release-key backup вне сервера.
