from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine

from app.models.user_progress import UserProgress  # noqa: F401


def init_db() -> None:
    """
    Create all tables in the database if they do not exist.
    """
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS ai_docs (
                    id BIGSERIAL PRIMARY KEY,
                    subject TEXT,
                    lang TEXT NOT NULL DEFAULT 'ru',
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    source TEXT,
                    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ai_docs_subject_lang ON ai_docs(subject, lang)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ai_docs_updated_at ON ai_docs(updated_at DESC)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_docs_subject_lang_title ON ai_docs(subject, lang, title)"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS content_sources (
                    id TEXT PRIMARY KEY,
                    title_ru TEXT NOT NULL,
                    organization_ru TEXT,
                    url TEXT,
                    license_status TEXT NOT NULL DEFAULT 'unknown',
                    usage_ru TEXT,
                    trust_level TEXT NOT NULL DEFAULT 'unverified',
                    accessed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS content_blocks (
                    id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    level TEXT NOT NULL DEFAULT 'school',
                    grade TEXT,
                    program_type TEXT NOT NULL DEFAULT 'base',
                    textbook_reference_type TEXT NOT NULL DEFAULT 'none',
                    section TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    difficulty TEXT NOT NULL DEFAULT 'basic',
                    title_ru TEXT NOT NULL,
                    body_ru TEXT NOT NULL,
                    source_list JSONB NOT NULL DEFAULT '[]'::jsonb,
                    license_status TEXT NOT NULL DEFAULT 'unknown',
                    legal_status TEXT NOT NULL DEFAULT 'pending',
                    verified_by TEXT,
                    reviewed_by TEXT,
                    created_by TEXT,
                    publish_status TEXT NOT NULL DEFAULT 'draft',
                    version INTEGER NOT NULL DEFAULT 1,
                    content_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS content_qa_events (
                    id BIGSERIAL PRIMARY KEY,
                    content_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
                    from_status TEXT,
                    to_status TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    comment TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_content_blocks_subject_topic ON content_blocks(subject, topic)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_content_blocks_publish_status ON content_blocks(publish_status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_content_qa_events_content_id ON content_qa_events(content_id)"))
