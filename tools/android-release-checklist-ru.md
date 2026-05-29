# Android Release Checklist

## Перед сборкой
- Проверить, что UI не показывает технические строки обычным пользователям: `debugCode`, `paymentId`, raw JSON, stack trace.
- Выполнить `cd /root/synapse/mobile && npx tsc --noEmit`.
- Выполнить `cd /root/synapse/mobile/android && ./gradlew :app:assertReleaseSigning`.
- Проверить, что release signing хранится вне git: `/root/synapse/secrets/android/release-signing.properties` и `/root/synapse/secrets/android/allchemist-release.keystore`.
- Проверить права секретов: директория `700`, файлы `600`.
- Проверить, что backup release key актуален по `/root/synapse/tools/android-release-key-ownership-ru.md`.
- Убедиться, что `reactNativeArchitectures` содержит минимум `arm64-v8a,x86_64` для ARM-устройств и серверного эмулятора.

## Сборка
- Выполнить `cd /root/synapse/mobile/android && ./gradlew :app:assertReleaseSigning :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64`.
- Проверить подпись: `/opt/android-sdk/build-tools/35.0.0/apksigner verify --verbose --print-certs /root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- Зафиксировать SHA256 и размер APK.

## Обязательная Android-Проверка
- Запустить серверный эмулятор `allchemist_api35`, если он не запущен.
- Выполнить `/root/synapse/tools/apk-emulator-smoke.sh /root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- Проверить, что smoke завершился успешно, процесс приложения живой, `MainActivity` в фокусе, в logcat нет `FATAL EXCEPTION`, `SoLoaderDSONotFoundError`, `ReactNativeJS TypeError`.
- Сохранить путь к скриншоту smoke.

## Публикация
- Копировать только проверенный APK в `/root/synapse/content_packs` с именем вида `allchemist-release-YYYYMMDD-HHMM-signed-...-emulator-verified.apk`.
- Проверить `https://api.allchemist.ru/api/v1/content/downloads/apk/latest` через HEAD: статус `200`, корректный `Content-Length`, `Content-Disposition` с новым filename.
- Старый маршрут `/api/v1/content/downloads/apk/layer-a-debug` должен оставаться рабочим как совместимый алиас, пока все публичные ссылки не переведены.
- Скопировать APK в `/home/usgromov/Allchemist/apk` и сверить SHA256 с серверным файлом.

## После Публикации
- Обновить `/root/synapse/assistant_log.md`: имя файла, SHA256, размер, проверки, проблемы и решения.
- Если подпись изменилась относительно предыдущей публичной сборки, предупредить, что пользователям старой debug-сборки может понадобиться удалить старую версию перед установкой новой.
- После первого production-релиза не менять release key без отдельного решения, иначе бесшовные обновления APK с сайта будут невозможны.
- Не публиковать APK, если emulator smoke не пройден.
