# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.routes import api_router
from app.db.init_db import init_db


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        description="Алхимик — Global STEM Intelligence Platform (MVP API)",
    )

    # CORS — добавим мобильное приложение и локальные адреса
    origins = [
        "http://localhost",
        "http://localhost:19006",   # Expo web
        "http://127.0.0.1:19006",
        "*"                         # можно сузить до доменов продакшена
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Все эндпоинты API v1 (включая /ai/mentor/ask и /sync/user-progress)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.on_event("startup")
    def _startup_init_db() -> None:
        init_db()

    return app


app = create_application()
