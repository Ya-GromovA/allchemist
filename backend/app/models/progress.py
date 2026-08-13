"""Typed SQLAlchemy 2 model for the synced learning progress table."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

TZ = DateTime(timezone=True)

__all__ = ["UserProgressServer"]


class UserProgressServer(Base):
    """Per-device task result synced up from the client.

    The natural key is ``(device_id, task_id)``: a device syncs its own local
    SQLite rows, and ``user_id`` is filled in only once the device is bound to
    an account. It is therefore nullable, and the foreign key to ``users`` is
    added by revision ``0003``.
    """

    __tablename__ = "user_progress_server"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    module_id: Mapped[str] = mapped_column(Text, nullable=False)
    lesson_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_id: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'done'"))
    score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    time_spent_sec: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    answer_json: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    synced_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    completed: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    last_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("device_id", "task_id", name="user_progress_server_device_id_task_id_key"),
        Index("idx_user_progress_device", "device_id"),
        Index("idx_user_progress_server_device", "device_id"),
        Index("idx_user_progress_server_task", "task_id"),
        Index("idx_user_progress_server_updated", "updated_at"),
        Index("idx_user_progress_task", "task_id"),
        Index("idx_user_progress_updated", text("updated_at DESC")),
    )
