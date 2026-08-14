"""Event streams: product telemetry and learning attempts.

Both tables reject UPDATE at the database level (revision ``0005``). An event
stream that can be edited after the fact is not evidence, and the whole point of
``learning_events`` is that a pupil's progress must be reproducible from
``scenarioVersion + engineVersion + assetVersion + event stream``.

DELETE is deliberately still permitted on both: retention has to be able to age
rows out, and §5 of the delivery contract requires a working erasure mechanism.
"Cannot be rewritten" and "cannot be removed" are different guarantees, and only
the first one is wanted here.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

TZ = DateTime(timezone=True)

__all__ = ["LEARNING_OUTCOMES", "LearningEvent", "TelemetryEvent"]

LEARNING_OUTCOMES = ("correct", "wrong", "pending")


class TelemetryEvent(Base):
    """One product-analytics event from a client.

    ``user_id`` is plain text with no foreign key on purpose. Telemetry is
    pseudonymous and must never be the reason an account cannot be deleted.
    """

    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    app_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    platform: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    received_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    payload: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    __table_args__ = (
        Index("idx_telemetry_events_received", text("received_at DESC")),
        Index("idx_telemetry_events_name", "event_name"),
        Index("idx_telemetry_events_user", "user_id"),
    )


class LearningEvent(Base):
    """One attempt at one task.

    ``client_event_id`` carries the client's own idempotency key and is unique
    where present, so a mobile client that retries an upload cannot double-count
    an attempt. The JSON append it replaces had no way to notice a duplicate,
    which meant a flaky network inflated a pupil's activity.
    """

    __tablename__ = "learning_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_event_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True
    )
    live_session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lesson_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    classroom: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mistake_tag: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_sec: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3), nullable=True)
    scenario_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    engine_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    integrity_flags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    payload: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    occurred_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    received_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "outcome IS NULL OR outcome = ANY "
            "(ARRAY['correct'::text, 'wrong'::text, 'pending'::text])",
            name="learning_events_outcome_check",
        ),
        Index(
            "uq_learning_events_client_id",
            "client_event_id",
            unique=True,
            postgresql_where=text("client_event_id IS NOT NULL"),
        ),
        Index("idx_learning_events_user", "user_id"),
        Index("idx_learning_events_received", text("received_at DESC")),
        Index("idx_learning_events_session", "live_session_id"),
    )
