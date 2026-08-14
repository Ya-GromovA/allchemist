import hashlib
from pathlib import Path
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings

from app.core.redaction import install_redaction

# backend/
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
# Backend-local settings (secrets that only the backend needs).
_BACKEND_ENV_FILE = _BACKEND_ROOT / ".env"
# Single source of truth for the database connection parameters, shared with
# infra/docker-compose.yml. Listed last below, so it wins over backend/.env.
# Inside the container neither file exists: the values arrive as real
# environment variables (compose `env_file`), which outrank both.
_CONNECTION_ENV_FILE = _BACKEND_ROOT.parent / "infra" / "db.env"


class Settings(BaseSettings):
    # Общее
    PROJECT_NAME: str = "Алхимик API"
    API_V1_PREFIX: str = "/api/v1"
    ENV: str = "dev"
    SECURITY_ENV: str = ""
    CORS_ORIGINS: str = ""

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
        # Absolute paths on purpose: the suite and the ops scripts must resolve
        # the same files no matter which directory they were started from.
        env_file = (str(_BACKEND_ENV_FILE), str(_CONNECTION_ENV_FILE))
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Every entry point (API, migration runner, tests, one-off scripts) imports this
# module, so this is the one place that guarantees logs and tracebacks are
# redacted before anything can print a secret. Idempotent.
install_redaction()


_PRODUCTION_ENVIRONMENTS = frozenset({"prod", "production"})
_PRODUCTION_SECRET_NAMES = (
    "ADMIN_UI_PASSWORD",
    "ADMIN_BOOTSTRAP_SECRET",
    "WEBHOOK_SECRET_ROBOKASSA",
    "WEBHOOK_SECRET_TBANK",
    "WEBHOOK_SECRET_YOOKASSA",
)
_LOCAL_CORS_ORIGINS = (
    "http://localhost",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
)


def is_production_environment(config: Settings = settings) -> bool:
    environment = config.SECURITY_ENV.strip() or config.ENV.strip()
    return environment.lower() in _PRODUCTION_ENVIRONMENTS


def get_cors_origins(config: Settings = settings) -> list[str]:
    origins = [origin.strip().rstrip("/") for origin in config.CORS_ORIGINS.split(",") if origin.strip()]
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS must not contain a wildcard")

    if is_production_environment(config):
        invalid = []
        for origin in origins:
            parsed = urlsplit(origin)
            if parsed.scheme != "https" or parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
                invalid.append(origin)
        if invalid:
            raise RuntimeError("Production CORS_ORIGINS must contain only non-loopback HTTPS origins")
    else:
        origins.extend(_LOCAL_CORS_ORIGINS)

    return list(dict.fromkeys(origins))


def validate_production_secret_overrides(config: Settings = settings) -> None:
    if not is_production_environment(config):
        return

    unsafe_names = []
    for name in _PRODUCTION_SECRET_NAMES:
        runtime_value = str(getattr(config, name) or "")
        default_value = str(Settings.model_fields[name].default or "")
        runtime_hash = hashlib.sha256(runtime_value.encode()).digest()
        default_hash = hashlib.sha256(default_value.encode()).digest()
        if not runtime_value or runtime_hash == default_hash:
            unsafe_names.append(name)
    if unsafe_names:
        raise RuntimeError("Production secret override required for: " + ", ".join(unsafe_names))


def resolve_database_url() -> str:
    explicit = (settings.DATABASE_URL or "").strip()
    if explicit:
        return explicit
    return (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )
