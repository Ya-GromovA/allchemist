# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import Message, Receive, Scope, Send

from app.core.config import (
    get_cors_origins,
    is_production_environment,
    settings,
    validate_production_secret_overrides,
)
from app.api.v1.routes import api_router


class StrictCORSMiddleware(CORSMiddleware):
    """Remove every CORS response header for an unapproved origin."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await super().__call__(scope, receive, send)
            return

        origin = Headers(scope=scope).get("origin")
        if not origin or self.is_allowed_origin(origin=origin):
            await super().__call__(scope, receive, send)
            return

        async def send_without_cors(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name in [key for key in headers if key.lower().startswith("access-control-")]:
                    del headers[name]
            await send(message)

        await super().__call__(scope, receive, send_without_cors)


def create_application() -> FastAPI:
    validate_production_secret_overrides(settings)
    production_security = is_production_environment(settings)
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        description="Алхимик — Global STEM Intelligence Platform (MVP API)",
        docs_url=None if production_security else "/docs",
        redoc_url=None if production_security else "/redoc",
        openapi_url=None if production_security else "/openapi.json",
    )

    app.add_middleware(
        StrictCORSMiddleware,
        allow_origins=get_cors_origins(settings),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Все эндпоинты API v1 (включая /ai/mentor/ask и /sync/user-progress)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # The database schema is NOT created here. Since 2026-08-13 the schema is
    # owned by Alembic (backend/alembic, baseline revision 0001) and applied by
    # backend/docker-entrypoint.sh -> `python -m app.db.migrate` before this
    # process starts. app/db/init_db.py is retained in the tree for one-off
    # local bootstrapping (backend/run_once.py) but is no longer executed at
    # start-up: runtime DDL from a serving process is exactly what the migration
    # baseline replaced.
    return app


app = create_application()
