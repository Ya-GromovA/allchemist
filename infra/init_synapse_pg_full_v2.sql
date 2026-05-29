-- =========================
-- AllChemist Postgres schema (idempotent, no rollback pitfall)
-- =========================

-- extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- updated_at helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- modules ----------
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_modules_updated ON modules;
CREATE TRIGGER trg_modules_updated
BEFORE UPDATE ON modules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_modules_available_sort ON modules(available DESC, sort_order ASC);

-- ---------- lesson_blocks ----------
CREATE TABLE IF NOT EXISTS lesson_blocks (
  id BIGSERIAL PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  tasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_lesson_blocks_updated ON lesson_blocks;
CREATE TRIGGER trg_lesson_blocks_updated
BEFORE UPDATE ON lesson_blocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lesson_blocks_module_sort ON lesson_blocks(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_tasks_gin ON lesson_blocks USING GIN (tasks_json);

-- ---------- tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id BIGINT NULL REFERENCES lesson_blocks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('numeric','quiz','open')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_minutes INT NOT NULL DEFAULT 5,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lesson ON tasks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tasks_payload_gin ON tasks USING GIN (payload);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION tasks_tsvector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_tsv_update ON tasks;
CREATE TRIGGER trg_tasks_tsv_update
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION tasks_tsvector_update();

UPDATE tasks
SET search_tsv = to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_search_tsv ON tasks USING GIN (search_tsv);

-- ---------- physics_scenarios ----------
CREATE TABLE IF NOT EXISTS physics_scenarios (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL DEFAULT 'physics' REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_physics_scenarios_updated ON physics_scenarios;
CREATE TRIGGER trg_physics_scenarios_updated
BEFORE UPDATE ON physics_scenarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_physics_scenarios_tags_gin ON physics_scenarios USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_physics_scenarios_data_gin ON physics_scenarios USING GIN(data_json);

-- ---------- molecules ----------
CREATE TABLE IF NOT EXISTS molecules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  formula TEXT NOT NULL DEFAULT '',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_molecules_updated ON molecules;
CREATE TRIGGER trg_molecules_updated
BEFORE UPDATE ON molecules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_molecules_name_trgm ON molecules USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_molecules_formula_trgm ON molecules USING GIN (formula gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_molecules_tags_gin ON molecules USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_molecules_data_gin ON molecules USING GIN(data_json);

-- ---------- reactions ----------
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  equation TEXT NOT NULL DEFAULT '',
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_reactions_updated ON reactions;
CREATE TRIGGER trg_reactions_updated
BEFORE UPDATE ON reactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_reactions_title_trgm ON reactions USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reactions_tags_gin ON reactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_reactions_data_gin ON reactions USING GIN(data_json);

-- ---------- ai_knowledge (patch existing) ----------
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'seed',
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  content_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- если таблица была создана раньше без search_tsv - добавим
ALTER TABLE ai_knowledge ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION ai_knowledge_tsvector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_knowledge_tsv_update ON ai_knowledge;
CREATE TRIGGER trg_ai_knowledge_tsv_update
BEFORE INSERT OR UPDATE ON ai_knowledge
FOR EACH ROW EXECUTE FUNCTION ai_knowledge_tsvector_update();

UPDATE ai_knowledge
SET search_tsv = to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))
WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_tags_gin ON ai_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_source ON ai_knowledge(source);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_search_tsv ON ai_knowledge USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_title_trgm ON ai_knowledge USING GIN (title gin_trgm_ops);

-- ---------- user_progress_server ----------
CREATE TABLE IF NOT EXISTS user_progress_server (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  module_id TEXT NOT NULL DEFAULT '',
  lesson_id TEXT NOT NULL DEFAULT '',
  task_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_answer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(device_id, task_id)
);

DROP TRIGGER IF EXISTS set_updated_at_user_progress ON user_progress_server;
CREATE TRIGGER set_updated_at_user_progress
BEFORE UPDATE ON user_progress_server
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_progress_device ON user_progress_server(device_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_task ON user_progress_server(task_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_updated ON user_progress_server(updated_at DESC);
