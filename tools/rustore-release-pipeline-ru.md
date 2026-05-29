# RuStore Release Pipeline

## Зачем Нужен Магазин
- APK с сайта не может тихо обновляться на обычных Android-телефонах: пользователь подтверждает установку вручную.
- RuStore/Google Play дают привычный канал обновлений: телефон сам предлагает или устанавливает обновления по настройкам пользователя.
- Для школьных управляемых устройств возможен MDM/device-owner сценарий, но это отдельная инфраструктура.

## Что Подготовить
- Юридический аккаунт разработчика RuStore.
- Название приложения: `Алхимик`.
- Package name: `com.usgromov.allchemist`.
- Подписанный release APK/AAB тем же release key, который используется сейчас.
- Иконка приложения, screenshots телефона, короткое и полное описание.
- Политика конфиденциальности на публичном URL.
- Контакты поддержки.
- Описание обработки данных: аккаунт, телефон/код входа, прогресс обучения, устройства, подписки/платежи.
- Возрастной рейтинг и категория: образование.

## Сборка Для Публикации
- Проверить `cd /root/synapse/mobile && npx tsc --noEmit`.
- Проверить `cd /root/synapse/mobile/android && ./gradlew :app:assertReleaseSigning`.
- Собрать APK: `cd /root/synapse/mobile/android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64`.
- Проверить подпись: `/opt/android-sdk/build-tools/35.0.0/apksigner verify --verbose --print-certs /root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- Запустить `/root/synapse/tools/apk-emulator-smoke.sh /root/synapse/mobile/android/app/build/outputs/apk/release/app-release.apk`.
- Зафиксировать SHA256, versionName, versionCode в `/root/synapse/content_packs/allchemist-apk-latest.json`.

## Публикация В RuStore
- Войти в консоль RuStore для разработчиков.
- Создать приложение с package name `com.usgromov.allchemist`.
- Заполнить карточку: название, описание, категория, контакты, политика конфиденциальности.
- Загрузить signed release APK/AAB.
- Заполнить формы по данным и разрешениям.
- Отправить на модерацию.
- После публикации не менять package name и release key без отдельного плана миграции.

## После Публикации
- На сайте оставить APK как fallback, но добавить ссылку на RuStore.
- В приложении update checker может показывать: `Обновление доступно в RuStore` вместо прямого APK, если выбран store channel.
- Для APK с сайта сохранить `/api/v1/content/downloads/apk/latest` как резервный канал.
