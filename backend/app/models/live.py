"""Live lessons: the session, who is in it, and what happened.

Three tables instead of one nested JSON object, and the difference is not
tidiness. The JSON session carried ``studentsJoined`` next to a ``participants``
map and an ``attempts`` map of per-task tallies, all recomputed on every write.
A counter stored beside the collection it counts will eventually disagree with
it, and a tally stored beside the events it summarises will eventually disagree
with them. Here the roster is rows and the tallies are queries, so neither can
drift.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

TZ = DateTime(timezone=True)

__all__ = [
    "LIVE_SESSION_STATUSES",
    "LiveSession",
    "LiveSessionEvent",
    "LiveSessionParticipant",
]

LIVE_SESSION_STATUSES = ("scheduled", "active", "ended", "cancelled")


class LiveSession(Base):
    """One live lesson run by one teacher."""

    __tablename__ = "live_sessions"

    session_id: Mapped[str] = mapped_column(Text, primary_key=True)
    teacher_user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    class_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_classes.class_id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    module_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lesson_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    join_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    roster: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    participants: Mapped[list["LiveSessionParticipant"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint(
            "status = ANY (ARRAY['scheduled'::text, 'active'::text, 'ended'::text, "
            "'cancelled'::text])",
            name="live_sessions_status_check",
        ),
        CheckConstraint(
            "(status <> 'ended'::text) OR (ended_at IS NOT NULL)",
            name="live_sessions_ended_at_check",
        ),
        Index("idx_live_sessions_teacher", "teacher_user_id"),
        Index("idx_live_sessions_status", "status"),
        Index(
            "uq_live_sessions_join_code",
            "join_code",
            unique=True,
            postgresql_where=text("join_code IS NOT NULL AND status = 'active'::text"),
        ),
    )


class LiveSessionParticipant(Base):
    """A pupil present in a live lesson.

    ``user_id`` has no foreign key: a lesson can be joined by a device that is
    not yet bound to an account, and the roster of who was in the room is a fact
    about the lesson that must survive the deletion of an account.
    """

    __tablename__ = "live_session_participants"

    session_id: Mapped[str] = mapped_column(
        Text, ForeignKey("live_sessions.session_id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    classroom: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    roster_matched: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)

    session: Mapped["LiveSession"] = relationship(back_populates="participants")

    __table_args__ = (Index("idx_live_session_participants_user", "user_id"),)


class LiveSessionEvent(Base):
    """One thing that happened during a live lesson. Insert-only."""

    __tablename__ = "live_session_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        Text, ForeignKey("live_sessions.session_id", ondelete="CASCADE"), nullable=False
    )
    student_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    task_id: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'unknown'"))
    lesson_id: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'general'"))
    classroom: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mistake_tag: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'learning_event'")
    )
    occurred_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "outcome = ANY (ARRAY['correct'::text, 'wrong'::text, 'pending'::text])",
            name="live_session_events_outcome_check",
        ),
        Index("idx_live_session_events_session", "session_id", text("occurred_at DESC")),
        Index("idx_live_session_events_student", "student_user_id"),
    )
