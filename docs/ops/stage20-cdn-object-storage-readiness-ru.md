# Stage 20: CDN/Object Storage Readiness

Дата фиксации: 2026-05-28

Цель: подготовить APK/content delivery к выносу в CDN/Object Storage без переключения production на непроверенный внешний провайдер.

## Backend readiness

`/api/v1/content/downloads/apk/latest/metadata` теперь поддерживает `APK_CDN_BASE_URL`:

1. Если `APK_CDN_BASE_URL` не задан, `downloadUrl` остаётся локальным: `/api/v1/content/downloads/apk/latest`.
2. Если `APK_CDN_BASE_URL` задан, `downloadUrl` и `cdnDownloadUrl` указывают на CDN URL `<APK_CDN_BASE_URL>/<apkFile>`.
3. `localDownloadUrl` всегда остаётся fallback на backend endpoint.
4. Сам backend download endpoint не удалён и продолжает отдавать APK metadata-driven.

## Readiness tool

Добавлен `/root/synapse/tools/cdn_object_storage_readiness.py`.

Проверяет:

1. `allchemist-apk-latest.json` содержит `versionName`, `versionCode`, `apkFile`, `sha256`, `size`.
2. APK artifact существует рядом с metadata.
3. Размер APK совпадает с metadata.
4. Формирует ожидаемый CDN URL при переданном `--cdn-base-url`.

## Команды

Локальная readiness-проверка:

```bash
/root/synapse/tools/cdn_object_storage_readiness.py
```

Проверка с будущим CDN base URL:

```bash
/root/synapse/tools/cdn_object_storage_readiness.py --cdn-base-url https://cdn.example.ru/allchemist/apk
```

## Что остаётся внешним

1. Выбрать provider: S3-compatible Object Storage, Yandex Object Storage, Selectel, Cloudflare R2 или другой.
2. Создать bucket и upload policy.
3. Загрузить APK artifact и content packs.
4. Настроить CDN hostname/TLS/cache headers.
5. Задать `APK_CDN_BASE_URL` в production env и выполнить backend rebuild.
6. Проверить public metadata/HEAD/download и Android install flow.
