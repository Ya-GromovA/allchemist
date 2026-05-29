from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, func

from app.db.base import Base


class UserProgress(Base):
    """
    User progress synced from mobile SQLite to server Postgres.
    """
    __tablename__ = "user_progress_server"

    id = Column(Integer, primary_key=True, index=True)

    external_user_id = Column(String, index=True, nullable=False)

    subject = Column(String, index=True, nullable=False)  # "physics", "chemistry", etc.
    module_id = Column(String, index=True, nullable=True)
    lesson_block_id = Column(Integer, index=True, nullable=True)
    task_id = Column(Integer, index=True, nullable=True)

    score = Column(Float, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)

    synced = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
