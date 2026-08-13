"""Typed SQLAlchemy 2 models for the content and catalogue tables.

Authority note
--------------
These models describe the **production schema as it is**, not as it should be.
Every column type, default, constraint name and index name below was
transcribed from ``pg_dump --schema-only`` of the live ``synapse`` database and
is verified structurally by ``tools/db/model_schema_check.sh``: the metadata is
materialised into a throwaway database and its catalogue fingerprint is diffed
against the migrated one. A mismatch fails the gate.

That includes production's warts (duplicate indexes, two parallel full-text
columns on ``ai_knowledge``). Cleaning them up is a separate, individually
verified revision -- a model layer that quietly "fixes" the schema stops being
a description of reality and starts lying.
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
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Production stores every timestamp as `timestamp with time zone`. The bare
# `datetime` annotation would map to a naive TIMESTAMP, so the type is always
# spelled out.
TZ = DateTime(timezone=True)

__all__ = [
    "AiDoc",
    "AiKnowledge",
    "ContentBlock",
    "ContentQaEvent",
    "ContentSource",
    "LessonBlock",
    "Module",
    "Molecule",
    "PhysicsScenario",
    "Reaction",
    "Task",
]


class Module(Base):
    """Top-level learning module: chemistry, physics, biology."""

    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    available: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    lesson_blocks: Mapped[list["LessonBlock"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )
    physics_scenarios: Mapped[list["PhysicsScenario"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        Index("idx_modules_available_sort", text("available DESC"), text("sort_order")),
    )


class LessonBlock(Base):
    """An ordered lesson inside a module."""

    __tablename__ = "lesson_blocks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    module_id: Mapped[str] = mapped_column(
        Text, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    tasks_json: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    payload: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))

    module: Mapped["Module"] = relationship(back_populates="lesson_blocks")
    tasks: Mapped[list["Task"]] = relationship(back_populates="lesson")

    __table_args__ = (
        Index("idx_lesson_blocks_module_sort", "module_id", "sort_order"),
        Index("idx_lesson_blocks_tasks_gin", "tasks_json", postgresql_using="gin"),
        Index("lesson_blocks_module_idx", "module_id"),
        Index("lesson_blocks_payload_gin", "payload", postgresql_using="gin"),
    )


class Task(Base):
    """A single assessable task."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    module_id: Mapped[str] = mapped_column(
        Text, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("lesson_blocks.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    type: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("5"))
    tags: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    search_tsv: Mapped[Optional[Any]] = mapped_column(TSVECTOR, nullable=True)

    module: Mapped["Module"] = relationship(back_populates="tasks")
    lesson: Mapped[Optional["LessonBlock"]] = relationship(back_populates="tasks")

    __table_args__ = (
        CheckConstraint(
            "type = ANY (ARRAY['numeric'::text, 'quiz'::text, 'open'::text])",
            name="tasks_type_check",
        ),
        Index("idx_tasks_lesson", "lesson_id"),
        Index("idx_tasks_module", "module_id"),
        Index("idx_tasks_payload_gin", "payload", postgresql_using="gin"),
        Index("idx_tasks_search_tsv", "search_tsv", postgresql_using="gin"),
        Index("idx_tasks_tags_gin", "tags", postgresql_using="gin"),
        Index("tasks_lesson_idx", "lesson_id"),
        Index("tasks_module_idx", "module_id"),
        Index("tasks_payload_gin", "payload", postgresql_using="gin"),
        Index("tasks_tags_gin", "tags", postgresql_using="gin"),
    )


class Molecule(Base):
    """Molecule reference data used by the 3D viewer."""

    __tablename__ = "molecules"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    formula: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    data_json: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]")
    )
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    atoms: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True, server_default=text("'[]'::jsonb"))

    __table_args__ = (
        Index("idx_molecules_data_gin", "data_json", postgresql_using="gin"),
        Index(
            "idx_molecules_formula_trgm",
            "formula",
            postgresql_using="gin",
            postgresql_ops={"formula": "public.gin_trgm_ops"},
        ),
        Index(
            "idx_molecules_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "public.gin_trgm_ops"},
        ),
        Index("idx_molecules_tags_gin", "tags", postgresql_using="gin"),
        Index("molecules_atoms_gin", "atoms", postgresql_using="gin"),
    )


class Reaction(Base):
    """Chemical reaction reference data. Drives the lab renderer."""

    __tablename__ = "reactions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    equation: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    data_json: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]")
    )
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    reactants: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True, server_default=text("'[]'::jsonb"))
    products: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True, server_default=text("'[]'::jsonb"))

    __table_args__ = (
        Index("idx_reactions_data_gin", "data_json", postgresql_using="gin"),
        Index("idx_reactions_tags_gin", "tags", postgresql_using="gin"),
        Index(
            "idx_reactions_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "public.gin_trgm_ops"},
        ),
        Index("reactions_products_gin", "products", postgresql_using="gin"),
        Index("reactions_reactants_gin", "reactants", postgresql_using="gin"),
    )


class PhysicsScenario(Base):
    """Physics simulation scenario definition."""

    __tablename__ = "physics_scenarios"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    module_id: Mapped[str] = mapped_column(
        Text,
        ForeignKey("modules.id", ondelete="CASCADE"),
        nullable=False,
        server_default=text("'physics'"),
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    data_json: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]")
    )
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    payload: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))

    module: Mapped["Module"] = relationship(back_populates="physics_scenarios")

    __table_args__ = (
        Index("idx_physics_scenarios_data_gin", "data_json", postgresql_using="gin"),
        Index("idx_physics_scenarios_tags_gin", "tags", postgresql_using="gin"),
        Index("physics_scenarios_payload_gin", "payload", postgresql_using="gin"),
    )


class AiDoc(Base):
    """Document fed to the AI mentor retrieval layer."""

    __tablename__ = "ai_docs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lang: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'ru'"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_ai_docs_subject_lang", "subject", "lang"),
        Index("idx_ai_docs_updated_at", text("updated_at DESC")),
        Index("uq_ai_docs_subject_lang_title", "subject", "lang", "title", unique=True),
    )


class AiKnowledge(Base):
    """Knowledge chunk with full-text search.

    ``tsv`` and ``search_tsv`` are two parallel full-text columns that both
    exist in production; only ``tsv`` is maintained by a trigger.
    """

    __tablename__ = "ai_knowledge"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'seed'"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    search_tsv: Mapped[Optional[Any]] = mapped_column(TSVECTOR, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lang: Mapped[Optional[str]] = mapped_column(Text, nullable=True, server_default=text("'ru'"))
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pack_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pack_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True, server_default=func.now())
    tsv: Mapped[Optional[Any]] = mapped_column(TSVECTOR, nullable=True)

    __table_args__ = (
        UniqueConstraint("pack_id", "external_id", name="ai_knowledge_pack_external_id_uk"),
        Index("ai_knowledge_content_hash_idx", "content_hash"),
        Index("ai_knowledge_lang_idx", "lang"),
        Index("ai_knowledge_pack_idx", "pack_id", "pack_version"),
        Index("ai_knowledge_subject_idx", "subject"),
        Index("ai_knowledge_tags_gin", "tags", postgresql_using="gin"),
        Index("ai_knowledge_tsv_gin", "tsv", postgresql_using="gin"),
        Index("idx_ai_knowledge_search_tsv", "search_tsv", postgresql_using="gin"),
        Index("idx_ai_knowledge_source", "source"),
        Index("idx_ai_knowledge_tags", "tags", postgresql_using="gin"),
        Index("idx_ai_knowledge_tags_gin", "tags", postgresql_using="gin"),
        Index(
            "idx_ai_knowledge_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "public.gin_trgm_ops"},
        ),
    )


class ContentSource(Base):
    """Provenance record: where a piece of content came from and under which licence."""

    __tablename__ = "content_sources"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title_ru: Mapped[str] = mapped_column(Text, nullable=False)
    organization_ru: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    license_status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'unknown'"))
    usage_ru: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trust_level: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'unverified'"))
    accessed_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())


class ContentBlock(Base):
    """Reviewable content unit. ``publish_status`` is the publication gate."""

    __tablename__ = "content_blocks"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'school'"))
    grade: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    program_type: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'base'"))
    textbook_reference_type: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'none'")
    )
    section: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'basic'"))
    title_ru: Mapped[str] = mapped_column(Text, nullable=False)
    body_ru: Mapped[str] = mapped_column(Text, nullable=False)
    source_list: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    license_status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'unknown'"))
    legal_status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    verified_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    publish_status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'draft'"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    qa_events: Mapped[list["ContentQaEvent"]] = relationship(
        back_populates="content", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        Index("idx_content_blocks_publish_status", "publish_status"),
        Index("idx_content_blocks_subject_topic", "subject", "topic"),
    )


class ContentQaEvent(Base):
    """Content QA transition. Append-only by policy, enforced at the service layer."""

    __tablename__ = "content_qa_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    content_id: Mapped[str] = mapped_column(
        Text, ForeignKey("content_blocks.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    to_status: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[str] = mapped_column(Text, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    content: Mapped["ContentBlock"] = relationship(back_populates="qa_events")

    __table_args__ = (Index("idx_content_qa_events_content_id", "content_id"),)
