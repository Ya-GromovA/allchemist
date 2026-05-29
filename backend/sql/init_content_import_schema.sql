BEGIN;

-- =========================
-- ai_knowledge: ensure columns
-- =========================
ALTER TABLE public.ai_knowledge
  ADD COLUMN IF NOT EXISTS pack_id TEXT,
  ADD COLUMN IF NOT EXISTS pack_version INT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'ru',
  ADD COLUMN IF NOT EXISTS body TEXT;

-- keep your required columns: source/title/content/tags (already exist)
ALTER TABLE public.ai_knowledge
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- =========================
-- ai_knowledge.tags -> jsonb (safe conversion)
-- =========================
DO $$
DECLARE
  t regtype;
  has_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_knowledge' AND column_name='tags'
  ) INTO has_col;

  IF NOT has_col THEN
    ALTER TABLE public.ai_knowledge ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;
    RETURN;
  END IF;

  SELECT a.atttypid::regtype
    INTO t
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='ai_knowledge'
    AND a.attname='tags' AND a.attnum>0 AND NOT a.attisdropped;

  BEGIN
    EXECUTE 'ALTER TABLE public.ai_knowledge ALTER COLUMN tags DROP DEFAULT';
  EXCEPTION WHEN others THEN
    NULL;
  END;

  IF t::text = 'jsonb' THEN
    EXECUTE 'ALTER TABLE public.ai_knowledge ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
    RETURN;
  ELSIF t::text = 'text[]' THEN
    EXECUTE 'ALTER TABLE public.ai_knowledge
             ALTER COLUMN tags TYPE jsonb
             USING COALESCE(to_jsonb(tags), ''[]''::jsonb)';
    EXECUTE 'ALTER TABLE public.ai_knowledge ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
    RETURN;
  ELSIF t::text = 'json' THEN
    EXECUTE 'ALTER TABLE public.ai_knowledge
             ALTER COLUMN tags TYPE jsonb
             USING COALESCE(tags::jsonb, ''[]''::jsonb)';
    EXECUTE 'ALTER TABLE public.ai_knowledge ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
    RETURN;
  ELSE
    EXECUTE 'ALTER TABLE public.ai_knowledge
             ALTER COLUMN tags TYPE jsonb
             USING (CASE WHEN tags IS NULL THEN ''[]''::jsonb ELSE tags::jsonb END)';
    EXECUTE 'ALTER TABLE public.ai_knowledge ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
    RETURN;
  END IF;
END$$;

-- =========================
-- ai_knowledge uniqueness (PROD): main key is (pack_id, external_id)
-- content_hash MUST NOT block inserts from different packs/languages
-- =========================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_knowledge_content_hash_key') THEN
    ALTER TABLE public.ai_knowledge DROP CONSTRAINT ai_knowledge_content_hash_key;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END$$;

CREATE INDEX IF NOT EXISTS ai_knowledge_content_hash_idx ON public.ai_knowledge(content_hash);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_knowledge_pack_external_id_uk') THEN
    ALTER TABLE public.ai_knowledge
      ADD CONSTRAINT ai_knowledge_pack_external_id_uk UNIQUE (pack_id, external_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ai_knowledge_subject_idx ON public.ai_knowledge(subject);
CREATE INDEX IF NOT EXISTS ai_knowledge_lang_idx ON public.ai_knowledge(lang);
CREATE INDEX IF NOT EXISTS ai_knowledge_pack_idx ON public.ai_knowledge(pack_id, pack_version);
CREATE INDEX IF NOT EXISTS ai_knowledge_tags_gin ON public.ai_knowledge USING GIN (tags);

-- =========================
-- tasks: ensure payload jsonb; tags -> jsonb (you currently have text[])
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='payload'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
  END IF;
END$$;

DO $$
DECLARE
  t regtype;
  has_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='tags'
  ) INTO has_col;

  IF NOT has_col THEN
    ALTER TABLE public.tasks ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;
    RETURN;
  END IF;

  SELECT a.atttypid::regtype
    INTO t
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='tasks'
    AND a.attname='tags' AND a.attnum>0 AND NOT a.attisdropped;

  IF t::text='jsonb' THEN
    RETURN;
  END IF;

  BEGIN
    EXECUTE 'ALTER TABLE public.tasks ALTER COLUMN tags DROP DEFAULT';
  EXCEPTION WHEN others THEN NULL;
  END;

  IF t::text='text[]' THEN
    EXECUTE 'ALTER TABLE public.tasks ALTER COLUMN tags TYPE jsonb USING COALESCE(to_jsonb(tags), ''[]''::jsonb)';
    EXECUTE 'ALTER TABLE public.tasks ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
    RETURN;
  END IF;

  -- last resort cast
  EXECUTE 'ALTER TABLE public.tasks ALTER COLUMN tags TYPE jsonb USING COALESCE(tags::jsonb, ''[]''::jsonb)';
  EXECUTE 'ALTER TABLE public.tasks ALTER COLUMN tags SET DEFAULT ''[]''::jsonb';
END$$;

CREATE INDEX IF NOT EXISTS tasks_module_idx ON public.tasks(module_id);
CREATE INDEX IF NOT EXISTS tasks_lesson_idx ON public.tasks(lesson_id);
CREATE INDEX IF NOT EXISTS tasks_payload_gin ON public.tasks USING GIN (payload);
CREATE INDEX IF NOT EXISTS tasks_tags_gin ON public.tasks USING GIN (tags);

-- =========================
-- lesson_blocks: payload jsonb
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='lesson_blocks' AND column_name='payload'
  ) THEN
    ALTER TABLE public.lesson_blocks ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS lesson_blocks_module_idx ON public.lesson_blocks(module_id);
CREATE INDEX IF NOT EXISTS lesson_blocks_payload_gin ON public.lesson_blocks USING GIN (payload);

-- =========================
-- molecules: atoms jsonb
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='molecules' AND column_name='atoms'
  ) THEN
    ALTER TABLE public.molecules ADD COLUMN atoms jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS molecules_atoms_gin ON public.molecules USING GIN (atoms);

-- =========================
-- reactions: reactants/products jsonb
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reactions' AND column_name='reactants'
  ) THEN
    ALTER TABLE public.reactions ADD COLUMN reactants jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reactions' AND column_name='products'
  ) THEN
    ALTER TABLE public.reactions ADD COLUMN products jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS reactions_reactants_gin ON public.reactions USING GIN (reactants);
CREATE INDEX IF NOT EXISTS reactions_products_gin ON public.reactions USING GIN (products);

-- =========================
-- physics_scenarios: payload jsonb
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='physics_scenarios' AND column_name='payload'
  ) THEN
    ALTER TABLE public.physics_scenarios ADD COLUMN payload jsonb DEFAULT '{}'::jsonb;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS physics_scenarios_payload_gin ON public.physics_scenarios USING GIN (payload);

COMMIT;
