# Allchemist Production Infrastructure Gate

Дата: 2026-05-25

Этот gate фиксирует минимальный production-контур для Allchemist после этапов 1-10. Он не заменяет CI/CD и мониторинг провайдера, но задает обязательные preflight-проверки перед релизом и ручные блокеры, которые нельзя скрывать как `готово`.

## Контуры

| Контур | Факт | Правило |
| --- | --- | --- |
| Production API | `https://api.allchemist.ru/api/v1/health` | Перед изменениями и после rebuild должен возвращать `status=ok`. |
| Production host | `root@100.67.164.12`, внешний IP `45.128.205.38` | Работы выполнять в `/root/synapse`; backend rebuild только через `infra/docker compose up -d --build synapse-backend`. |
| Backup host | `root@100.87.124.71` | Off-server backup/restore evidence остается owner/ops action, пока нет CI secret и расписания в этом репозитории. |
| APK latest | `/root/synapse/content_packs/allchemist-apk-latest.json` | Download endpoint обязан брать latest из metadata, не по mtime. |
| Android signing | `/root/synapse/secrets/android/...` | Release key не ротировать без отдельного migration plan. |

## Release Gates

Перед публикацией backend/web/admin/mobile изменений должны пройти:

1. `python3 -m py_compile` для измененных backend файлов.
2. Targeted pytest для затронутых контрактов.
3. `node --check` для измененных web/admin JS.
4. `cd /root/synapse/infra && docker compose up -d --build synapse-backend`.
5. `curl -fsS https://api.allchemist.ru/api/v1/health`.
6. `node tools/playwright-visual-smoke.mjs`.
7. `node tools/playwright-authenticated-roles-smoke.mjs`.
8. `node tools/playwright-admin-auth-roles-smoke.mjs`.
9. Если менялся mobile код/assets: `cd /root/synapse/mobile && npx tsc --noEmit`, Android release build, APK emulator smoke, APK metadata publish, public metadata/HEAD check, local APK copy.
10. Если менялись payments/legal/security/content gates: admin go/no-go и security export проверить через admin smoke или targeted API.

## Monitoring Baseline

Минимум до подключения внешнего мониторинга:

| Сигнал | Источник | Действие |
| --- | --- | --- |
| API health | `/api/v1/health` | Ошибка health блокирует релиз. |
| Docker health | `synapse-backend` healthcheck в compose | Если unhealthy, смотреть logs и не продолжать публикацию. |
| Admin security | `/api/v1/admin/security/checklist`, go/no-go | High alerts должны быть разобраны или явно зафиксированы как остаточный риск. |
| APK latest | `/api/v1/content/downloads/apk/latest/metadata` и HEAD | Version, size, sha256 должны совпадать с metadata. |
| Backups | backup host evidence | Нет свежего off-server evidence -> Stage 11 фиксирует ручной блокер. |

## Backup And Restore

Текущий кодовый gate проверяет только доступность механизмов и runbook. Для production acceptance нужны внешние evidence:

1. Свежий `pg_dump` production DB на backup host.
2. Свежий rsync project snapshot на backup host.
3. Restore drill в отдельную временную БД или контейнер без записи в prod.
4. SHA256/размеры backup artifacts в ops-журнале.
5. Owner confirmation, что Android release key backup вынесен off-server.

## Payments And Legal

Этап 11 не утверждает реальные платежные E2E без provider secrets. До публичного запуска нужны:

1. Staging credentials Robokassa/T-Bank/YooKassa или выбранного провайдера.
2. Webhook delivery smoke с реальной подписью и dead-letter проверкой.
3. Legal checklist в admin docs со статусами `APPROVED` для блокирующих документов.
4. Финальный legal memo от владельца/юриста.

## Manual Blockers

Эти пункты нельзя закрыть только кодом в текущей среде:

1. Object Storage/CDN для APK/content packs.
2. CI/CD с dev/stage/prod promotion и secrets.
3. External monitoring/alerts provider.
4. Off-server restore drill evidence.
5. Payment provider E2E с настоящими staging/prod credentials.
6. Финальная юридическая валидация документов.

## Stage 11 Status Rule

Stage 11 считается закрытым как кодово-операционный baseline, если:

1. Production preflight script проходит локально на prod host.
2. Backend/web/admin/mobile smoke checks проходят.
3. APK latest metadata/HEAD совпадают с published artifact.
4. Ledger и assistant log фиксируют manual blockers отдельно от выполненных проверок.
