// /root/synapse/mobile/app/db/bootstrap.ts
import { execSql } from "./database";

/**
 * Единственный владелец схемы и PRAGMA user_version.
 *
 * v7:  ai_docs.external_id
 * v8:  ai_docs.tags_json
 * v9:  canonical content storage:
 *      - lesson_blocks: убрать зависимость от columns вроде content/type (всё в payload_json)
 *      - molecules/reactions: добавить lang, хранить всё в data_json
 *      - add physics_scenarios table
 * v10: add lesson_blocks.tasks_json DEFAULT '[]' (если старые базы)
 */
const SCHEMA_VERSION = 12;

async function getUserVersion(): Promise<number> {
  const rows = await execSql("PRAGMA user_version;");
  return Number(rows?.[0]?.user_version ?? 0);
}

async function setUserVersion(v: number): Promise<void> {
  await execSql(`PRAGMA user_version = ${v};`);
}

async function tableInfo(table: string): Promise<any[]> {
  return await execSql(`PRAGMA table_info(${table});`);
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await tableInfo(table);
  return rows.some((r: any) => String(r.name) === column);
}

async function ensureColumn(table: string, column: string, ddl: string): Promise<void> {
  const ok = await columnExists(table, column);
  if (ok) return;

  try {
    await execSql(ddl);
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? '').toLowerCase();
    if (msg.includes('duplicate column name')) return;
    throw e;
  }
}

async function indexExists(indexName: string): Promise<boolean> {
  const rows = await execSql(
    `SELECT name FROM sqlite_master WHERE type='index' AND name=?;`,
    [indexName]
  );
  return rows.length > 0;
}

async function ensureIndex(sql: string, indexName: string): Promise<void> {
  if (!(await indexExists(indexName))) await execSql(sql);
}

/**
 * Best-effort FTS5 (может быть недоступен на некоторых сборках SQLite).
 */
async function ensureAiDocsFts(): Promise<void> {
  try {
    await execSql(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ai_docs_fts
      USING fts5(title, body, content='ai_docs', content_rowid='id');
    `);
    await execSql(`
      CREATE TRIGGER IF NOT EXISTS ai_docs_ai AFTER INSERT ON ai_docs BEGIN
        INSERT INTO ai_docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;
    `);
    await execSql(`
      CREATE TRIGGER IF NOT EXISTS ai_docs_ad AFTER DELETE ON ai_docs BEGIN
        INSERT INTO ai_docs_fts(ai_docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
      END;
    `);
    await execSql(`
      CREATE TRIGGER IF NOT EXISTS ai_docs_au AFTER UPDATE ON ai_docs BEGIN
        INSERT INTO ai_docs_fts(ai_docs_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
        INSERT INTO ai_docs_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
      END;
    `);
  } catch {
    // ok — останется LIKE-поиск
  }
}

export async function bootstrapDatabase(): Promise<void> {
  // --- базовые таблицы (широкие, промышленно)
  await execSql(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      description TEXT,
      title_ru TEXT,
      title_en TEXT,
      description_ru TEXT,
      description_en TEXT,
      available INTEGER NOT NULL DEFAULT 1,
      icon TEXT,
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  await execSql(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      module_id TEXT NOT NULL,
      lesson_id INTEGER,
      lang TEXT,                         -- ru/en
      branch TEXT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,                -- numeric | quiz | open
      payload_json TEXT NOT NULL,
      estimated_minutes INTEGER DEFAULT 5,
      tags_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  /**
   * ✅ lesson_blocks: НИКАКИХ “content/type/blocks” колонок.
   * ВЕСЬ контент — в payload_json. Это предотвращает бесконечные ошибки “no column named …”.
   */
  await execSql(`
    CREATE TABLE IF NOT EXISTS lesson_blocks (
      id INTEGER PRIMARY KEY,            -- id из паков
      module_id TEXT NOT NULL,
      lang TEXT,
      branch TEXT,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      tasks_json TEXT NOT NULL DEFAULT '[]',
      payload_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  /**
   * ✅ molecules: lang + data_json (храним и atoms, и всё будущее)
   */
  await execSql(`
    CREATE TABLE IF NOT EXISTS molecules (
      id TEXT PRIMARY KEY NOT NULL,
      lang TEXT,
      branch TEXT,
      name TEXT NOT NULL,
      formula TEXT NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  /**
   * ✅ reactions: lang + data_json (reactants/products/anything future-proof)
   */
  await execSql(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY NOT NULL,
      lang TEXT,
      branch TEXT,
      title TEXT NOT NULL,
      equation TEXT NOT NULL,
      conditions TEXT,
      data_json TEXT NOT NULL,
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  /**
   * ✅ physics_scenarios: отдельная таблица (у тебя импортёр уже пишет туда)
   */
  await execSql(`
    CREATE TABLE IF NOT EXISTS physics_scenarios (
      id TEXT PRIMARY KEY NOT NULL,
      module_id TEXT NOT NULL,
      lang TEXT,
      branch TEXT,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  // ✅ ai_docs: все поля, которые используются контент-паками/импортом
  await execSql(`
    CREATE TABLE IF NOT EXISTS ai_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      lang TEXT,
      branch TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      subject TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT,
      content_hash TEXT
    );
  `);

  // прогресс (локальный)
  await execSql(`
    CREATE TABLE IF NOT EXISTS user_progress_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      module_id TEXT,
      lesson_block_id INTEGER,
      task_id TEXT,
      score REAL,
      completed INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // мета по пакетам (версии + http caching)
  await execSql(`
    CREATE TABLE IF NOT EXISTS content_meta (
      pack_id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL,
      installed_at TEXT NOT NULL,
      etag TEXT,
      last_modified TEXT,
      content_hash TEXT
    );
  `);

  // streak/statistics
  await execSql(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY CHECK (id=1),
      last_active_date TEXT,
      streak_count INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      updated_at TEXT
    );
  `);
  await execSql(`
    INSERT OR IGNORE INTO user_stats (id, last_active_date, streak_count, best_streak, updated_at)
    VALUES (1, NULL, 0, 0, datetime('now'));
  `);

  // --- предстраховка: колонки для индексов должны существовать заранее
  // (иначе на старых БД CREATE INDEX падает до миграций)
  await ensureColumn("tasks", "lang", "ALTER TABLE tasks ADD COLUMN lang TEXT;");
  await ensureColumn("tasks", "branch", "ALTER TABLE tasks ADD COLUMN branch TEXT;");
  await ensureColumn("lesson_blocks", "lang", "ALTER TABLE lesson_blocks ADD COLUMN lang TEXT;");
  await ensureColumn("lesson_blocks", "branch", "ALTER TABLE lesson_blocks ADD COLUMN branch TEXT;");
  await ensureColumn("molecules", "lang", "ALTER TABLE molecules ADD COLUMN lang TEXT;");
  await ensureColumn("molecules", "branch", "ALTER TABLE molecules ADD COLUMN branch TEXT;");
  await ensureColumn("reactions", "lang", "ALTER TABLE reactions ADD COLUMN lang TEXT;");
  await ensureColumn("reactions", "branch", "ALTER TABLE reactions ADD COLUMN branch TEXT;");

  // --- индексы
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_tasks_module_lang ON tasks(module_id, lang);`,
    "idx_tasks_module_lang"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_tasks_lesson_lang ON tasks(lesson_id, lang);`,
    "idx_tasks_lesson_lang"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_tasks_module_lang_branch ON tasks(module_id, lang, branch);`,
    "idx_tasks_module_lang_branch"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_lesson_blocks_module_lang ON lesson_blocks(module_id, lang);`,
    "idx_lesson_blocks_module_lang"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_lesson_blocks_module_lang_branch ON lesson_blocks(module_id, lang, branch);`,
    "idx_lesson_blocks_module_lang_branch"
  );
  await ensureIndex(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_lesson_blocks_module_lang_title ON lesson_blocks(module_id, lang, title);`,
    "ux_lesson_blocks_module_lang_title"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_ai_docs_subject_lang ON ai_docs(subject, lang);`,
    "idx_ai_docs_subject_lang"
  );
  await ensureIndex(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_docs_external_id ON ai_docs(external_id);`,
    "ux_ai_docs_external_id"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_ai_docs_external_id ON ai_docs(external_id);`,
    "idx_ai_docs_external_id"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_molecules_lang ON molecules(lang);`,
    "idx_molecules_lang"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_molecules_lang_branch ON molecules(lang, branch);`,
    "idx_molecules_lang_branch"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_reactions_lang ON reactions(lang);`,
    "idx_reactions_lang"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_reactions_lang_branch ON reactions(lang, branch);`,
    "idx_reactions_lang_branch"
  );
  await ensureIndex(
    `CREATE INDEX IF NOT EXISTS idx_physics_scenarios_module_lang ON physics_scenarios(module_id, lang);`,
    "idx_physics_scenarios_module_lang"
  );

  // --- FTS5
  await ensureAiDocsFts();

  // --- Миграции
  const current = await getUserVersion();

  // v3
  if (current < 3) {
    await ensureColumn("tasks", "lesson_id", "ALTER TABLE tasks ADD COLUMN lesson_id INTEGER;");
    await setUserVersion(3);
  }

  // v4
  if (current < 4) {
    await ensureColumn("tasks", "lang", "ALTER TABLE tasks ADD COLUMN lang TEXT;");
  await ensureColumn("tasks", "branch", "ALTER TABLE tasks ADD COLUMN branch TEXT;");
    await ensureColumn("tasks", "tags_json", "ALTER TABLE tasks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';");
    await ensureColumn("lesson_blocks", "lang", "ALTER TABLE lesson_blocks ADD COLUMN lang TEXT;");
  await ensureColumn("lesson_blocks", "branch", "ALTER TABLE lesson_blocks ADD COLUMN branch TEXT;");
    await ensureColumn("ai_docs", "lang", "ALTER TABLE ai_docs ADD COLUMN lang TEXT;");
    await setUserVersion(4);
  }

  // v5
  if (current < 5) {
    await ensureColumn("content_meta", "etag", "ALTER TABLE content_meta ADD COLUMN etag TEXT;");
    await ensureColumn("content_meta", "last_modified", "ALTER TABLE content_meta ADD COLUMN last_modified TEXT;");
    await ensureColumn("content_meta", "content_hash", "ALTER TABLE content_meta ADD COLUMN content_hash TEXT;");
    await setUserVersion(5);
  }

  // v6
  if (current < 6) {
    await ensureColumn("tasks", "updated_at", "ALTER TABLE tasks ADD COLUMN updated_at TEXT;");
    await ensureColumn("tasks", "content_hash", "ALTER TABLE tasks ADD COLUMN content_hash TEXT;");

    await ensureColumn("lesson_blocks", "payload_json", "ALTER TABLE lesson_blocks ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';");
    await ensureColumn("lesson_blocks", "updated_at", "ALTER TABLE lesson_blocks ADD COLUMN updated_at TEXT;");
    await ensureColumn("lesson_blocks", "content_hash", "ALTER TABLE lesson_blocks ADD COLUMN content_hash TEXT;");

    await ensureColumn("molecules", "updated_at", "ALTER TABLE molecules ADD COLUMN updated_at TEXT;");
    await ensureColumn("molecules", "content_hash", "ALTER TABLE molecules ADD COLUMN content_hash TEXT;");

    await ensureColumn("reactions", "updated_at", "ALTER TABLE reactions ADD COLUMN updated_at TEXT;");
    await ensureColumn("reactions", "content_hash", "ALTER TABLE reactions ADD COLUMN content_hash TEXT;");

    await ensureColumn("ai_docs", "updated_at", "ALTER TABLE ai_docs ADD COLUMN updated_at TEXT;");
    await ensureColumn("ai_docs", "content_hash", "ALTER TABLE ai_docs ADD COLUMN content_hash TEXT;");
    await setUserVersion(6);
  }

  // v7: ai_docs.external_id
  if (current < 7) {
    await ensureColumn("ai_docs", "external_id", "ALTER TABLE ai_docs ADD COLUMN external_id TEXT;");
    await ensureIndex(`CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_docs_external_id ON ai_docs(external_id);`, "ux_ai_docs_external_id");
    await ensureIndex(`CREATE INDEX IF NOT EXISTS idx_ai_docs_external_id ON ai_docs(external_id);`, "idx_ai_docs_external_id");
    await setUserVersion(7);
  }

  // v8: ai_docs.tags_json
  if (current < 8) {
    await ensureColumn("ai_docs", "tags_json", "ALTER TABLE ai_docs ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';");
    await setUserVersion(8);
  }

  // v9: canonical content tables
  if (current < 9) {
    // lesson_blocks must have payload_json & tasks_json
    await ensureColumn("lesson_blocks", "payload_json", "ALTER TABLE lesson_blocks ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';");
    await ensureColumn("lesson_blocks", "tasks_json", "ALTER TABLE lesson_blocks ADD COLUMN tasks_json TEXT NOT NULL DEFAULT '[]';");

    // molecules/reactions lang + data_json (если база очень старая/другая)
    await ensureColumn("molecules", "lang", "ALTER TABLE molecules ADD COLUMN lang TEXT;");
  await ensureColumn("molecules", "branch", "ALTER TABLE molecules ADD COLUMN branch TEXT;");
    // data_json уже в CREATE, но страховка:
    await ensureColumn("molecules", "data_json", "ALTER TABLE molecules ADD COLUMN data_json TEXT NOT NULL DEFAULT '{}';");

    await ensureColumn("reactions", "lang", "ALTER TABLE reactions ADD COLUMN lang TEXT;");
  await ensureColumn("reactions", "branch", "ALTER TABLE reactions ADD COLUMN branch TEXT;");
    await ensureColumn("reactions", "data_json", "ALTER TABLE reactions ADD COLUMN data_json TEXT NOT NULL DEFAULT '{}';");

    // physics_scenarios (на старых базах таблицы может не быть)
    await execSql(`
      CREATE TABLE IF NOT EXISTS physics_scenarios (
        id TEXT PRIMARY KEY NOT NULL,
        module_id TEXT NOT NULL,
        lang TEXT,
        title TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT,
        content_hash TEXT
      );
    `);

    await setUserVersion(9);
  }

  // v10: tasks_json default safety (если где-то создавалось без DEFAULT)
  if (current < 10) {
    await ensureColumn("lesson_blocks", "tasks_json", "ALTER TABLE lesson_blocks ADD COLUMN tasks_json TEXT NOT NULL DEFAULT '[]';");
    await setUserVersion(10);
  }



  // v11: modules.available + modules.icon
  if (current < 11) {
    await ensureColumn("modules", "available", "ALTER TABLE modules ADD COLUMN available INTEGER NOT NULL DEFAULT 1;");
    await ensureColumn("modules", "icon", "ALTER TABLE modules ADD COLUMN icon TEXT;");
    await setUserVersion(11);
  }



  // v12: chemistry branches
  if (current < 12) {
    await ensureColumn("tasks", "branch", "ALTER TABLE tasks ADD COLUMN branch TEXT;");
    await ensureColumn("lesson_blocks", "branch", "ALTER TABLE lesson_blocks ADD COLUMN branch TEXT;");
    await ensureColumn("molecules", "branch", "ALTER TABLE molecules ADD COLUMN branch TEXT;");
    await ensureColumn("reactions", "branch", "ALTER TABLE reactions ADD COLUMN branch TEXT;");
    await setUserVersion(12);
  }

  // --- Супер-страховка (на случай сброса user_version)
  await ensureColumn("tasks", "lesson_id", "ALTER TABLE tasks ADD COLUMN lesson_id INTEGER;");
  await ensureColumn("tasks", "lang", "ALTER TABLE tasks ADD COLUMN lang TEXT;");
  await ensureColumn("tasks", "branch", "ALTER TABLE tasks ADD COLUMN branch TEXT;");
  await ensureColumn("tasks", "tags_json", "ALTER TABLE tasks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';");

  await ensureColumn("lesson_blocks", "lang", "ALTER TABLE lesson_blocks ADD COLUMN lang TEXT;");
  await ensureColumn("lesson_blocks", "branch", "ALTER TABLE lesson_blocks ADD COLUMN branch TEXT;");
  await ensureColumn("lesson_blocks", "payload_json", "ALTER TABLE lesson_blocks ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';");
  await ensureColumn("lesson_blocks", "tasks_json", "ALTER TABLE lesson_blocks ADD COLUMN tasks_json TEXT NOT NULL DEFAULT '[]';");

  await ensureColumn("ai_docs", "lang", "ALTER TABLE ai_docs ADD COLUMN lang TEXT;");
  await ensureColumn("ai_docs", "external_id", "ALTER TABLE ai_docs ADD COLUMN external_id TEXT;");
  await ensureColumn("ai_docs", "tags_json", "ALTER TABLE ai_docs ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';");

  await ensureColumn("molecules", "lang", "ALTER TABLE molecules ADD COLUMN lang TEXT;");
  await ensureColumn("molecules", "branch", "ALTER TABLE molecules ADD COLUMN branch TEXT;");
  await ensureColumn("molecules", "data_json", "ALTER TABLE molecules ADD COLUMN data_json TEXT NOT NULL DEFAULT '{}';");

  await ensureColumn("reactions", "lang", "ALTER TABLE reactions ADD COLUMN lang TEXT;");
  await ensureColumn("reactions", "branch", "ALTER TABLE reactions ADD COLUMN branch TEXT;");
  await ensureColumn("reactions", "data_json", "ALTER TABLE reactions ADD COLUMN data_json TEXT NOT NULL DEFAULT '{}';");

  await ensureIndex(`CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_docs_external_id ON ai_docs(external_id);`, "ux_ai_docs_external_id");
  await ensureIndex(`CREATE INDEX IF NOT EXISTS idx_ai_docs_external_id ON ai_docs(external_id);`, "idx_ai_docs_external_id");

  // Поднимаем user_version до актуальной (если база новая/была 0)
  const after = await getUserVersion();
  if (after < SCHEMA_VERSION) {
    await setUserVersion(SCHEMA_VERSION);
  }
}
