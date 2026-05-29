# Алхимик: правила непрерывной работы ассистента

Этот файл нужен для новой сессии, чтобы не повторять вводные.

## Обязательные правила работы
- Работать только на сервере `root@91.197.99.201` (Wish Hanter), проект: `/root/synapse`.
- Для SSH использовать ключ `~/.ssh/wishhunter_server` и опцию `IdentitiesOnly=yes`.
- Вести append-only лог в `/root/synapse/assistant_log.md` после каждого значимого шага.
- Не откатывать чужие изменения и не выполнять destructive-команды без явного запроса.
- Сначала восстанавливать работоспособность (health/smoke), потом расширять функционал.

## Что нужно делать в каждой сессии
1. Проверить backend health: `GET http://127.0.0.1:8000/api/v1/health`.
2. Проверить mobile smoke миграции: `cd /root/synapse/mobile && TEST_PHONE=89154674679 npm run smoke:migration`.
3. Проверить backend контрактный тест: `cd /root/synapse/backend && ./.venv/bin/python -m unittest tests.test_auth_sync_contract -v`.
4. Обновить:
   - `/root/synapse/assistant_log.md` (что сделано и результаты проверок),
   - `/root/synapse/tools/launch-execution-board-ru.md` (статус: сделано/дальше).
5. Обязательно фиксировать проценты прогресса в каждом ответе по двум срезам:
   - `MVP progress %`,
   - `Full-plan progress %` (MVP + post-MVP + production контур).
   И отдельно указывать: идем с опережением / в графике / есть отставание.
6. По лимиту контекста/токенов:
   - предупреждать пользователя заранее, минимум за 2 сообщения до вероятного достижения лимита текущего диалога,
   - предлагать безопасный handoff: какие файлы/логи прочитать в новой беседе и с какого шага продолжать.

## Текущие технические договоренности
- Phone для smoke-тестов: `89154674679`.
- Mobile API base:
  - env: `EXPO_PUBLIC_API_BASE_URL`,
  - fallback: `http://91.197.99.201:8000/api/v1`.
- Основные auth/sync endpoint'ы: `backend/app/api/v1/endpoints/auth_sync.py`.
- `routes.py` должен оставаться агрегатором роутеров (без бизнес-логики).

## Приоритеты дальнейшей разработки
- Production-grade auth/sync: JWT access + refresh rotation + logout revoke + device migration merge.
- Role-aware доступ: `student/teacher/parent` через scope-проверки.
- Надежный bootstrap mobile-сессии через `/auth/me` и auto-refresh.
