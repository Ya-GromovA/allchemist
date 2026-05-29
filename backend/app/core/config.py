from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Общее
    PROJECT_NAME: str = "Алхимик API"
    API_V1_PREFIX: str = "/api/v1"
    ENV: str = "dev"

    # БД (на будущее, сейчас можно не поднимать Postgres)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "synapse"
    POSTGRES_PASSWORD: str = "synapse"
    POSTGRES_DB: str = "synapse"

    # Redis (для кэша, сессий, очередей)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Database
    DATABASE_URL: str = ""

    # Auth/JWT
    JWT_SECRET: str = "change-me-please"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MIN: int = 30
    REFRESH_TOKEN_TTL_DAYS: int = 30

    # OTP security
    OTP_TTL_MIN: int = 10
    OTP_REQUEST_LIMIT: int = 5
    OTP_REQUEST_WINDOW_SEC: int = 3600
    OTP_MAX_VERIFY_ATTEMPTS: int = 5
    OTP_LOCK_MIN: int = 15

    # SMS provider (production)
    SMS_PROVIDER_URL: str = ""
    SMS_PROVIDER_TOKEN: str = ""
    SMS_SENDER_NAME: str = "AllChemist"

    # Payment provider settings
    PAYMENT_RETURN_BASE_URL: str = "https://allchemist.ru/return"
    ROBOKASSA_MERCHANT_LOGIN: str = ""
    ROBOKASSA_PASSWORD_1: str = ""
    ROBOKASSA_API_URL: str = ""
    TBANK_TERMINAL_KEY: str = ""
    TBANK_PASSWORD: str = ""
    TBANK_API_URL: str = ""
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_API_URL: str = ""

    # Webhook signatures
    WEBHOOK_SECRET_ROBOKASSA: str = "robokassa-secret"
    WEBHOOK_SECRET_TBANK: str = "tbank-secret"
    WEBHOOK_SECRET_YOOKASSA: str = "yookassa-secret"
    PAYMENT_WEBHOOK_REPLAY_WINDOW_SEC: int = 86400

    # Admin bootstrap
    ADMIN_BOOTSTRAP_SECRET: str = "change-me-admin-bootstrap"

    # Admin UI password login
    ADMIN_UI_LOGIN: str = "admin"
    ADMIN_UI_PASSWORD: str = "admin123"
    ADMIN_UI_USER_ID: str = "admin_console"
    ADMIN_UI_ROLE: str = "owner"

    # Alerts/ops
    ALERTS_CHANNEL_TARGET: str = ""

    # Push notifications
    PUSH_PROVIDER: str = "expo"  # expo | fcm | apns
    EXPO_PUSH_URL: str = "https://exp.host/--/api/v2/push/send"
    EXPO_ACCESS_TOKEN: str = ""

    FCM_PROJECT_ID: str = ""
    FCM_SERVICE_ACCOUNT_JSON: str = ""

    APNS_TEAM_ID: str = ""
    APNS_KEY_ID: str = ""
    APNS_PRIVATE_KEY_P8: str = ""
    APNS_BUNDLE_ID: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()


def resolve_database_url() -> str:
    explicit = (settings.DATABASE_URL or "").strip()
    if explicit:
        return explicit
    return (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )
