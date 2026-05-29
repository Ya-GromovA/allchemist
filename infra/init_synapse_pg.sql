-- init_synapse_pg.sql
-- Серверная таблица прогресса (синхронизация с мобилой)

CREATE TABLE IF NOT EXISTS user_progress_server (
  id                BIGSERIAL PRIMARY KEY,
  device_id         TEXT NOT NULL,              -- идентификатор устройства (mobile)
  user_id           TEXT NULL,                  -- если потом будет логин
  module_id         TEXT NOT NULL,              -- physics / chemistry
  lesson_id         TEXT NULL,                  -- lesson block id
  task_id           TEXT NOT NULL,              -- task id
  status            TEXT NOT NULL DEFAULT 'done',  -- done / in_progress
  score             INTEGER NOT NULL DEFAULT 0,
  time_spent_sec    INTEGER NOT NULL DEFAULT 0,
  answer_json       JSONB NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at         TIMESTAMPTZ NULL,

  -- чтобы одно и то же задание от одного устройства не дублировалось
  UNIQUE (device_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_device ON user_progress_server(device_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_task   ON user_progress_server(task_id);

-- триггер авто-обновления updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_progress ON user_progress_server;

CREATE TRIGGER set_updated_at_user_progress
BEFORE UPDATE ON user_progress_server
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
