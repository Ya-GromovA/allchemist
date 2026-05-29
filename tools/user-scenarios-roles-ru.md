# Алхимик: сценарии без SMS-провайдера

## 1) Вход без SMS

- Учитель и родитель: вход по паролю + email magic link (или TOTP).
- Ученик: вход по школьному коду/учетке + локальный PIN на устройстве.
- Для класса: одноразовый `joinCode` создает учитель, сервер валидирует TTL и лимит попыток.

## 2) Подключение к live через push

- Учитель запускает live и выбирает класс.
- Бэкенд отправляет пуш в `device_push_tokens` всем ученикам класса.
- Пуш содержит только `liveSessionId` и краткий текст, без чувствительных данных.
- Приложение открывает экран "Подключиться" и запрашивает свежий join code с бэкенда.
- Join code также пишется в центр уведомлений в приложении.

## 3) Роли и домашний экран

- `student`: учебные модули + AI наставник.
- `teacher`: live-класс, roster, аналитика класса, быстрый запуск урока.
- `parent`: дашборд ребенка, план на день, отчет и зоны риска.

## 4) Минимальная реализация push

- Таблица: `device_push_tokens(user_id, device_id, token, platform, updated_at, revoked)`.
- Endpoint: `POST /notifications/push/register-token`.
- Endpoint: `POST /cabinet/teacher/live/session/{id}/notify`.
- Очередь отправки: фоновый worker + retry + dead-letter.

## 5) Безопасность

- TTL для join code: 5-10 минут.
- Ограничение попыток ввода кода (rate limit по IP/device).
- Аудит событий: launch/notify/join/close.
