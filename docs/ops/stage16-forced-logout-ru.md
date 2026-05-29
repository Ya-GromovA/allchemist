# Stage 16: Forced Logout For Maintenance

Дата фиксации: 2026-05-28

Цель этапа: добавить явный и проверяемый механизм принудительного выхода пользователей из кабинета во время технических окон.

## Почему это нужно

Rotation `JWT_SECRET` инвалидирует старые access JWT, но не отзывает refresh-сессии. Web-клиент при `401` автоматически вызывает `/api/v1/auth/refresh`, поэтому пользователь может остаться в кабинете, если refresh-сессия активна.

## Реализация

1. В `/root/synapse/backend/app/services/user_state_store.py` добавлена функция `revoke_all_sessions`.
2. Функция отзывает все active sessions или сессии одного `userId`.
3. Каждая отозванная session получает `revoked`, `revokedAt`, `revokedBy`, `revokeReason`.
4. Добавлен audit trail в `session_revocations` и `auth_audit`.
5. Добавлен CLI `/root/synapse/tools/revoke_sessions.py`.

## Безопасный запуск

Dry-run по всем активным сессиям:

```bash
/root/synapse/tools/revoke_sessions.py
```

Dry-run по одному пользователю:

```bash
/root/synapse/tools/revoke_sessions.py --user-id <user_id>
```

Фактический global logout:

```bash
/root/synapse/tools/revoke_sessions.py --apply --changed-by ops --reason "maintenance window"
```

Фактический logout одного пользователя:

```bash
/root/synapse/tools/revoke_sessions.py --apply --user-id <user_id> --changed-by ops --reason "security support request"
```

## Проверки

1. `python3 -m py_compile` для backend service и CLI.
2. Focused auth tests: forced logout и role-switch tests -> `2 passed`.
3. Regression: `tests/test_auth_sync_contract.py tests/test_public_web.py tests/test_content_quality_snapshot.py` -> `13 passed`.
4. CLI dry-run работает и не меняет state без `--apply`.
5. Backend rebuild выполнен.
6. Local/public health -> `200`.
7. Stage 15 production hardening gate -> `OK: stage15 production hardening check completed`.

## Важно

На production фактический `/root/synapse/tools/revoke_sessions.py --apply` в рамках Stage 16 не запускался. Механизм готов и проверен, но активные пользователи не выброшены без отдельного решения на техокно.
