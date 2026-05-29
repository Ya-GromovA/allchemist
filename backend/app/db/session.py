from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import resolve_database_url, settings


engine = create_engine(
    resolve_database_url(),
    echo=(settings.ENV == "dev"),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
