# Android Release Key Ownership

## Статус
- Production release key создан и используется для signed APK.
- Keystore хранится вне git: `/root/synapse/secrets/android/allchemist-release.keystore`.
- Gradle signing properties хранятся вне git: `/root/synapse/secrets/android/release-signing.properties`.
- Права доступа: директория `/root/synapse/secrets/android` должна быть `700`, файлы ключа и properties должны быть `600`.
- Сертификат APK: `CN=Allchemist, OU=Mobile, O=Allchemist, L=Moscow, ST=Moscow, C=RU`.
- SHA256 сертификата: `3d76bf58243a3bd723f3d18aceccb707128aa426b97b5ff2b4a4476dcab8bac1`.

## Правило Владения
- Владельцем ключа должен быть назначенный ответственный за релизы Allchemist.
- Доступ к keystore/password-файлу должен быть только у владельца релиза и резервного ответственного.
- Пароли нельзя отправлять в чат, git, тикеты, email без защищённого секрет-хранилища.
- Потеря ключа означает невозможность бесшовно обновлять уже установленные release-сборки с той же подписью.

## Backup
- На сервере хранится закрытый backup bundle в `/root/synapse/secrets/android/backups`.
- Backup bundle должен содержать keystore, signing properties и manifest с SHA256.
- Минимум две внешние копии должны быть сохранены вне сервера: защищённое облачное секрет-хранилище и офлайн-носитель/корпоративный password manager.
- После переноса внешних копий нужно сверить SHA256 backup archive с manifest.

## Восстановление
- Восстановить `allchemist-release.keystore` и `release-signing.properties` в `/root/synapse/secrets/android`.
- Выставить права: `chmod 700 /root/synapse/secrets/android` и `chmod 600 /root/synapse/secrets/android/allchemist-release.keystore /root/synapse/secrets/android/release-signing.properties`.
- Проверить `cd /root/synapse/mobile/android && ./gradlew :app:assertReleaseSigning`.
- Собрать APK и проверить `apksigner verify --verbose --print-certs`.
- SHA256 сертификата должен совпадать с указанным в этом документе.

## Ротация
- Не ротировать release key без отдельного решения, потому что это ломает бесшовное обновление APK, установленных предыдущим ключом.
- Если переходить в Google Play/RuStore, заранее выбрать схему app signing и сохранить исходный upload/release key по правилам магазина.
