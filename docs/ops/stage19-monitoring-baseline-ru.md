# Stage 19: Monitoring Probe Baseline

Дата фиксации: 2026-05-28

Цель: добавить минимальный внешний probe, который проверяет production API и latest APK endpoint и может быть подключён к cron/systemd/Prometheus/external uptime provider.

## Добавлено

`/root/synapse/tools/production_monitor_probe.py`

Проверяет:

1. `GET /api/v1/health`.
2. Latency health endpoint.
3. `GET /api/v1/content/downloads/apk/latest/metadata`.
4. Обязательные APK metadata fields: `versionName`, `versionCode`, `fileName`, `sizeBytes`, `sha256`.
5. `HEAD /api/v1/content/downloads/apk/latest`.
6. Совпадение `Content-Length` с `sizeBytes`.

## Форматы вывода

JSON:

```bash
/root/synapse/tools/production_monitor_probe.py
```

Prometheus text:

```bash
/root/synapse/tools/production_monitor_probe.py --format prometheus
```

## Exit codes

1. `0`: все checks прошли.
2. `2`: endpoint доступен, но один или несколько checks failed.
3. non-zero exception: network/HTTP/JSON failure.

## Подключение к внешнему monitoring provider

1. Добавить external uptime check для `https://api.allchemist.ru/api/v1/health`.
2. Добавить check latest APK metadata endpoint.
3. Для self-hosted Prometheus/node exporter запускать probe cron/systemd и забирать prometheus output.
4. Alert thresholds: health non-200 > 2 min, APK metadata mismatch, latency > 2500 ms.

## Статус

Probe готов и проверен. Реальный внешний provider всё ещё требует аккаунт/секреты/доступ владельца.
