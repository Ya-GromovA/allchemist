-- /root/synapse/backend/sql/init_ai_knowledge.sql
-- Idempotent schema hardening for ai_knowledge: columns, indexes, FTS, triggers.

BEGIN;

-- Needed for gen_random_uuid() if you later want UUID keys somewhere
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure table exists (it already exists in your DB, but keep safe)
CREATE TABLE IF NOT EXISTS public.ai_knowledge (
  id BIGSERIAL PRIMARY KEY,
  subject TEXT,
  lang TEXT DEFAULT 'ru',
  title TEXT,
  body TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT,
  pack_id TEXT,
  pack_version INT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tsv TSVECTOR
);

-- Add missing columns to existing table (safe if already present)
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'ru';
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS pack_id TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS pack_version INT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ai_knowledge ADD COLUMN IF NOT EXISTS tsv TSVECTOR;

-- Unique identity for deterministic upserts from packs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_knowledge_pack_external_id_uk'
  ) THEN
    ALTER TABLE public.ai_knowledge
      ADD CONSTRAINT ai_knowledge_pack_external_id_uk UNIQUE (pack_id, external_id);
  END IF;
END$$;

-- Full-text tsvector maintenance
CREATE OR REPLACE FUNCTION public.ai_knowledge_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.tsv =
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body,'')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ai_knowledge_tsv_update'
  ) THEN
    DROP TRIGGER trg_ai_knowledge_tsv_update ON public.ai_knowledge;
  END IF;

  CREATE TRIGGER trg_ai_knowledge_tsv_update
  BEFORE INSERT OR UPDATE ON public.ai_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.ai_knowledge_tsv_update();
END$$;

-- Backfill tsv for existing rows
UPDATE public.ai_knowledge
SET
  tsv =
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body,'')), 'B')
WHERE tsv IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS ai_knowledge_subject_idx ON public.ai_knowledge(subject);
CREATE INDEX IF NOT EXISTS ai_knowledge_lang_idx ON public.ai_knowledge(lang);
CREATE INDEX IF NOT EXISTS ai_knowledge_pack_idx ON public.ai_knowledge(pack_id, pack_version);
CREATE INDEX IF NOT EXISTS ai_knowledge_tsv_gin ON public.ai_knowledge USING GIN (tsv);

COMMIT;
