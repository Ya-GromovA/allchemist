# Алхимик Desktop Production (Tauri)

## Что уже сделано

- Добавлен `desktop/tauri-shell` каркас приложения.
- Конфиг Tauri настроен на `mobile/dist` как фронтенд.
- Подготовлен CI workflow для сборки Windows/macOS/Linux.

## Что нужно для production

1. Иконки:
   - `src-tauri/icons/icon.ico`
   - `src-tauri/icons/icon.icns`
   - PNG наборы 32x32/128x128/256x256/512x512

2. Signing:
   - создать ключ `tauri signer generate`
   - сохранить в GitHub Secrets:
     - `TAURI_SIGNING_PRIVATE_KEY`
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

3. Updater канал:
   - разместить update manifest + бинарники (S3/Cloudflare R2/GitHub Releases)
   - добавить в `tauri.conf.json` раздел updater endpoint

4. Release pipeline:
   - тэг `desktop-vX.Y.Z`
   - запуск GitHub Action `Desktop Tauri Release`
   - публикация артефактов для установки пользователями
