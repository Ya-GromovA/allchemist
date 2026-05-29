from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, func

from app.db.base import Base


class UserProgress(Base):
    """
    Прогресс пользователя по задачам, который мы синхронизируем с мобильного.
    """
    __tablename__ = "user_progress_server"

    id = Column(Integer, primary_key=True, index=True)

    # Внешний идентификатор юзера из мобильного приложения
    external_user_id = Column(String, index=True, nullable=False)

    # Предмет / модуль
    subject = Column(String, index=True, nullable=False)         # "physics" / "chemistry"
    module_id = Column(String, index=True, nullable=True)
    lesson_block_id = Column(Integer, index=True, nullable=True)
    task_id = Column(Integer, index=True, nullable=True)

    # Прогресс
    score = Column(Float, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)

    # Флаг: данные уже синхронизированы
    synced = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
