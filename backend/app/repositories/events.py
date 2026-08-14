"""Repositories for the event streams: telemetry, learning attempts, live lessons.

The live-lesson aggregates that used to be stored fields -- ``studentsJoined``
and the per-task ``{ok, wrong, pending}`` tallies -- are queries here. A count
kept next to the rows it counts is a second source of truth, and the two will
eventually disagree; the JSON store had exactly that bug latent in it.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.live import LiveSession, LiveSessionEvent, LiveSessionParticipant
from app.models.telemetry import LearningEvent, TelemetryEvent

__all__ = ["LearningEventRepository", "LiveSessionRepository", "TelemetryRepository"]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_moment(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text_value = str(value or "").strip()
    if not text_value:
        return None
    try:
        parsed = datetime.fromisoformat(text_value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _clean(value: Any) -> Optional[str]:
    text_value = str(value or "").strip()
    return text_value or None


class TelemetryRepository:
    """Product telemetry. Insert-only."""

    def ingest(self, session: Session, events: Iterable[dict[str, Any]]) -> int:
        received_at = _utc_now()
        rows = []
        for event in events:
            if not isinstance(event, dict):
                continue
            payload = {
                key: value
                for key, value in event.items()
                if key
                not in {
                    "name",
                    "event",
                    "userId",
                    "deviceId",
                    "sessionId",
                    "appVersion",
                    "platform",
                    "at",
                    "occurredAt",
                }
            }
            rows.append(
                {
                    "event_name": _clean(event.get("name") or event.get("event")) or "unknown",
                    "user_id": _clean(event.get("userId")),
                    "device_id": _clean(event.get("deviceId")),
                    "session_id": _clean(event.get("sessionId")),
                    "app_version": _clean(event.get("appVersion")),
                    "platform": _clean(event.get("platform")),
                    "occurred_at": _parse_moment(event.get("at") or event.get("occurredAt")),
                    "received_at": received_at,
                    "payload": payload,
                }
            )
        if not rows:
            return 0
        session.execute(pg_insert(TelemetryEvent).values(rows))
        return len(rows)

    def count_by_name(
        self, session: Session, names: Sequence[str], *, user_id: Optional[str] = None
    ) -> int:
        statement = (
            select(func.count())
            .select_from(TelemetryEvent)
            .where(TelemetryEvent.event_name.in_(list(names)))
        )
        if user_id:
            statement = statement.where(TelemetryEvent.user_id == user_id)
        return int(session.execute(statement).scalar_one())

    def recent(self, session: Session, limit: int = 200) -> Sequence[TelemetryEvent]:
        statement = (
            select(TelemetryEvent).order_by(TelemetryEvent.received_at.desc()).limit(limit)
        )
        return session.execute(statement).scalars().all()


class LearningEventRepository:
    """Attempts at tasks. Insert-only, de-duplicated on the client's own id."""

    # Below this, an "answer" was not read, let alone solved. Kept as a named
    # constant because it is a pedagogical judgement, not a magic number.
    MIN_PLAUSIBLE_DURATION_SEC = 2.0

    def ingest(self, session: Session, events: Iterable[dict[str, Any]]) -> tuple[int, int]:
        """Store attempts. Returns ``(accepted, duplicates_ignored)``."""
        received_at = _utc_now()
        accepted = 0
        duplicates = 0
        for event in events:
            if not isinstance(event, dict):
                continue
            payload = event.get("payload") if isinstance(event.get("payload"), dict) else {}
            duration = payload.get("durationSec", event.get("durationSec"))
            flags: list[str] = []
            try:
                numeric_duration = float(duration) if duration is not None else None
            except (TypeError, ValueError):
                numeric_duration = None
            if numeric_duration is not None and numeric_duration < self.MIN_PLAUSIBLE_DURATION_SEC:
                flags.append("too_fast_answer")

            outcome = _clean(event.get("outcome"))
            if outcome not in {"correct", "wrong", "pending"}:
                outcome = None

            values = {
                "client_event_id": _clean(event.get("eventId") or event.get("clientEventId")),
                "user_id": _clean(event.get("userId")),
                "live_session_id": _clean(event.get("sessionId")),
                "subject": _clean(event.get("subject") or event.get("moduleId")),
                "lesson_id": _clean(event.get("lessonId")),
                "task_id": _clean(event.get("taskId")),
                "classroom": _clean(event.get("classroom")),
                "outcome": outcome,
                "mistake_tag": _clean(event.get("mistakeTag")),
                "duration_sec": numeric_duration,
                "scenario_version": _clean(event.get("scenarioVersion")),
                "engine_version": _clean(event.get("engineVersion")),
                "integrity_flags": flags,
                "payload": payload or {},
                "occurred_at": _parse_moment(event.get("at") or event.get("occurredAt")),
                "received_at": received_at,
            }

            statement = pg_insert(LearningEvent).values(values)
            if values["client_event_id"]:
                # index_where is required, not decorative: the unique index is
                # partial (client_event_id IS NOT NULL), and PostgreSQL only
                # matches an ON CONFLICT target to a partial index when the
                # predicate is repeated. Without it the statement fails with
                # "there is no unique or exclusion constraint matching the
                # ON CONFLICT specification" -- which is how it was found.
                statement = statement.on_conflict_do_nothing(
                    index_elements=[LearningEvent.client_event_id],
                    index_where=LearningEvent.client_event_id.isnot(None),
                )
            result = session.execute(statement)
            if int(result.rowcount or 0) == 0:
                duplicates += 1
            else:
                accepted += 1
        return accepted, duplicates

    def for_user(
        self, session: Session, user_id: str, limit: int = 500
    ) -> Sequence[LearningEvent]:
        statement = (
            select(LearningEvent)
            .where(LearningEvent.user_id == user_id)
            .order_by(LearningEvent.received_at.desc())
            .limit(limit)
        )
        return session.execute(statement).scalars().all()


class LiveSessionRepository:
    """Live lessons, their roster and their event stream."""

    def get(self, session: Session, session_id: str) -> Optional[LiveSession]:
        return session.get(LiveSession, session_id)

    def get_active(self, session: Session, session_id: str) -> Optional[LiveSession]:
        record = session.get(LiveSession, session_id)
        if record is None or record.status != "active":
            return None
        return record

    def create(
        self,
        session: Session,
        *,
        session_id: str,
        teacher_user_id: str,
        title: str,
        module_id: Optional[str] = None,
        lesson_id: Optional[str] = None,
        school_id: Optional[str] = None,
        class_id: Optional[str] = None,
        join_code: Optional[str] = None,
    ) -> LiveSession:
        now = _utc_now()
        record = LiveSession(
            session_id=session_id,
            teacher_user_id=teacher_user_id,
            title=title or "",
            module_id=module_id,
            lesson_id=lesson_id,
            school_id=school_id,
            class_id=class_id,
            status="active",
            join_code=join_code,
            created_at=now,
            started_at=now,
            updated_at=now,
            roster=[],
        )
        session.add(record)
        session.flush()
        return record

    def close(self, session: Session, record: LiveSession) -> LiveSession:
        now = _utc_now()
        record.status = "ended"
        record.ended_at = now
        record.updated_at = now
        # A join code is only unique among running lessons; releasing it here is
        # what allows short, human-typable codes to be reused safely.
        record.join_code = None
        return record

    def for_teacher(
        self, session: Session, teacher_user_id: str, limit: int = 50
    ) -> Sequence[LiveSession]:
        statement = (
            select(LiveSession)
            .where(LiveSession.teacher_user_id == teacher_user_id)
            .order_by(LiveSession.created_at.desc())
            .limit(limit)
        )
        return session.execute(statement).scalars().all()

    def find_by_join_code(self, session: Session, join_code: str) -> Optional[LiveSession]:
        statement = select(LiveSession).where(
            LiveSession.join_code == str(join_code or "").strip(),
            LiveSession.status == "active",
        )
        return session.execute(statement).scalars().first()

    def join(
        self,
        session: Session,
        *,
        session_id: str,
        user_id: str,
        classroom: Optional[str],
        role_key: Optional[str],
        roster_matched: Optional[bool] = None,
    ) -> bool:
        """Record a participant. Returns True when this is a new arrival.

        ``INSERT ... ON CONFLICT DO NOTHING`` reports zero affected rows when the
        participant was already present, which is exactly the "is this new?"
        answer the caller needs -- and it is decided by the primary key inside
        one statement, so two devices joining at once cannot both be counted.
        """
        now = _utc_now()
        inserted = session.execute(
            pg_insert(LiveSessionParticipant)
            .values(
                session_id=session_id,
                user_id=user_id,
                classroom=classroom,
                role_key=role_key,
                roster_matched=roster_matched,
                joined_at=now,
                last_seen_at=now,
            )
            .on_conflict_do_nothing(
                index_elements=[
                    LiveSessionParticipant.session_id,
                    LiveSessionParticipant.user_id,
                ]
            )
        )
        if int(inserted.rowcount or 0) > 0:
            return True

        existing = session.get(
            LiveSessionParticipant, {"session_id": session_id, "user_id": user_id}
        )
        if existing is not None:
            existing.last_seen_at = now
            if classroom:
                existing.classroom = classroom
            if roster_matched is not None:
                existing.roster_matched = roster_matched
        return False

    def record_event(
        self,
        session: Session,
        *,
        session_id: str,
        student_user_id: Optional[str],
        outcome: str,
        task_id: str,
        lesson_id: str,
        classroom: Optional[str],
        mistake_tag: Optional[str],
        source: str = "learning_event",
        occurred_at: Optional[datetime] = None,
    ) -> None:
        session.add(
            LiveSessionEvent(
                session_id=session_id,
                student_user_id=student_user_id,
                outcome=outcome,
                task_id=task_id or "unknown",
                lesson_id=lesson_id or "general",
                classroom=classroom,
                mistake_tag=mistake_tag,
                source=source,
                occurred_at=occurred_at or _utc_now(),
            )
        )
        record = session.get(LiveSession, session_id)
        if record is not None:
            record.updated_at = _utc_now()

    def participants(
        self, session: Session, session_id: str
    ) -> Sequence[LiveSessionParticipant]:
        statement = (
            select(LiveSessionParticipant)
            .where(LiveSessionParticipant.session_id == session_id)
            .order_by(LiveSessionParticipant.joined_at)
        )
        return session.execute(statement).scalars().all()

    def students_joined(self, session: Session, session_id: str) -> int:
        statement = (
            select(func.count())
            .select_from(LiveSessionParticipant)
            .where(LiveSessionParticipant.session_id == session_id)
        )
        return int(session.execute(statement).scalar_one())

    def attempt_tallies(self, session: Session, session_id: str) -> dict[str, dict[str, int]]:
        """``{"task::lesson": {"ok": n, "wrong": n, "pending": n}}``, computed."""
        statement = (
            select(
                LiveSessionEvent.task_id,
                LiveSessionEvent.lesson_id,
                LiveSessionEvent.outcome,
                func.count().label("total"),
            )
            .where(LiveSessionEvent.session_id == session_id)
            .group_by(
                LiveSessionEvent.task_id, LiveSessionEvent.lesson_id, LiveSessionEvent.outcome
            )
        )
        tallies: dict[str, dict[str, int]] = {}
        for task_id, lesson_id, outcome, total in session.execute(statement).all():
            bucket = tallies.setdefault(
                f"{task_id}::{lesson_id}", {"ok": 0, "wrong": 0, "pending": 0}
            )
            bucket["ok" if outcome == "correct" else outcome] = int(total)
        return tallies

    def events(
        self, session: Session, session_id: str, limit: int = 500
    ) -> Sequence[LiveSessionEvent]:
        statement = (
            select(LiveSessionEvent)
            .where(LiveSessionEvent.session_id == session_id)
            .order_by(LiveSessionEvent.occurred_at.desc())
            .limit(limit)
        )
        return session.execute(statement).scalars().all()
