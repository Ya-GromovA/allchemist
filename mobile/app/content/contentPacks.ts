// /root/synapse/mobile/app/content/contentPacks.ts
import { execSql } from "@app/db/database";

export type Pack = {
  pack_id: string;
  version: number;
  generated_at?: string;
  updated_at?: string;
  content_hash?: string | null;

  modules?: Array<any>;

  lesson_blocks?: Array<{
    id: number;
    module_id: string;
    lang: "ru" | "en";
    title: string;
    description?: string;
    content?: string;      // может быть в паке, но НЕ колонка
    type?: string;         // может быть в паке, но НЕ колонка
    order_index?: number;
    branch?: string;
    payload?: any;         // старый формат
    tasks?: any[];         // если когда-то появится
  }>;

  tasks?: Array<{
    id: string;
    module_id: string;
    lang: "ru" | "en";
    lesson_id: number;
    title: string;
    description: string;
    type: "numeric" | "quiz" | "open";
    payload: any;
    estimated_minutes?: number;
    branch?: string;
    tags?: string[];
    updated_at?: string;
    content_hash?: string | null;
  }>;

  molecules?: Array<{
    id: string;
    lang: "ru" | "en";
    name: string;
    formula: string;
    atoms: Array<{ element: string; x: number; y: number; z?: number }>;
    branch?: string;
    updated_at?: string;
    content_hash?: string | null;
  }>;

  reactions?: Array<{
    id: string;
    lang: "ru" | "en";
    title: string;
    equation: string;
    conditions?: string;
    reactants?: any[];
    products?: any[];
    branch?: string;
    updated_at?: string;
    content_hash?: string | null;
  }>;

  physics_scenarios?: Array<{
    id: string;
    module_id: string;
    lang: "ru" | "en";
    title: string;
    payload: any;
    updated_at?: string;
    content_hash?: string | null;
  }>;

  ai_knowledge?: Array<{
    external_id?: string;
    subject?: string;
    lang: "ru" | "en";
    title: string;
    body: string;
    tags?: string[];
    updated_at?: string;
    content_hash?: string | null;
  }>;
};

/**
 * Единая таблица content_meta.
 */
export async function ensureContentMetaTable(): Promise<void> {
  await execSql(`
    CREATE TABLE IF NOT EXISTS content_meta (
      pack_id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL,
      installed_at TEXT NOT NULL,
      etag TEXT NULL,
      last_modified TEXT NULL,
      content_hash TEXT NULL
    );
  `);

  const hasColumn = async (name: string): Promise<boolean> => {
    const cols = await execSql("PRAGMA table_info(content_meta);");
    return (cols ?? []).some((c: any) => String(c?.name) === name);
  };

  const ensureColumn = async (name: string, sql: string): Promise<void> => {
    if (await hasColumn(name)) return;
    try {
      await execSql(sql);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? "").toLowerCase();
      if (!msg.includes("duplicate column name")) throw e;
    }
  };

  await ensureColumn("etag", `ALTER TABLE content_meta ADD COLUMN etag TEXT NULL;`);
  await ensureColumn("last_modified", `ALTER TABLE content_meta ADD COLUMN last_modified TEXT NULL;`);
  await ensureColumn("content_hash", `ALTER TABLE content_meta ADD COLUMN content_hash TEXT NULL;`);
}

async function getInstalledVersion(packId: string): Promise<number | null> {
  await ensureContentMetaTable();
  const rows = await execSql(`SELECT version FROM content_meta WHERE pack_id = ?;`, [packId]);
  if (!rows?.length) return null;
  return Number(rows[0].version ?? 0);
}



async function getMoleculesCount(): Promise<number> {
  const rows = await execSql(`SELECT COUNT(*) AS c FROM molecules;`);
  return Number(rows?.[0]?.c ?? 0);
}

async function setInstalledMeta(pack: {
  pack_id: string;
  version: number;
  updated_at?: string;
  content_hash?: string | null;
}): Promise<void> {
  await ensureContentMetaTable();
  const now = new Date().toISOString();

  await execSql(
    `INSERT INTO content_meta (pack_id, version, installed_at, etag, last_modified, content_hash)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(pack_id) DO UPDATE SET
       version=excluded.version,
       installed_at=excluded.installed_at,
       etag=excluded.etag,
       last_modified=excluded.last_modified,
       content_hash=excluded.content_hash;`,
    [pack.pack_id, pack.version, now, null, pack.updated_at ?? null, pack.content_hash ?? null]
  );
}

function inferLangFromId(id: string): "ru" | "en" | null {
  if (!id) return null;
  if (id.endsWith("_ru")) return "ru";
  if (id.endsWith("_en")) return "en";
  return null;
}

function inferLangFromTags(tags: any): "ru" | "en" | null {
  if (!Array.isArray(tags)) return null;
  if (tags.includes("ru")) return "ru";
  if (tags.includes("en")) return "en";
  return null;
}

function inferLangFromPayload(payload: any): "ru" | "en" | null {
  const p = payload || {};
  if (p.lang === "ru" || p.lang === "en") return p.lang;
  if (p.language === "ru" || p.language === "en") return p.language;
  return null;
}

function safeJson(value: any, fallback: any = {}): string {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

async function importPack(pack: Pack): Promise<void> {
  await execSql("BEGIN;");
  try {
    // modules (если есть)
    if (pack.modules?.length) {
      for (const m of pack.modules) {
        const id = String(m?.id ?? "").trim();
        if (!id) continue;

        await execSql(
          `INSERT INTO modules (id, title, description, title_ru, title_en, description_ru, description_en, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title=excluded.title,
             description=excluded.description,
             title_ru=excluded.title_ru,
             title_en=excluded.title_en,
             description_ru=excluded.description_ru,
             description_en=excluded.description_en,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            id,
            m?.title ?? null,
            m?.description ?? null,
            m?.title_ru ?? null,
            m?.title_en ?? null,
            m?.description_ru ?? null,
            m?.description_en ?? null,
            m?.updated_at ?? pack.updated_at ?? null,
            m?.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // lesson_blocks (канонически: payload_json = весь объект)
    if (pack.lesson_blocks?.length) {
      for (const l of pack.lesson_blocks) {
        const payload = l.payload ?? l; // сохраняем весь объект, включая content/type и т.п.
        const tasksJson = safeJson((l as any).tasks ?? [], []);

        await execSql(
          `INSERT INTO lesson_blocks (id, module_id, lang, branch, title, description, order_index, tasks_json, payload_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             module_id=excluded.module_id,
             lang=excluded.lang,
             branch=excluded.branch,
             title=excluded.title,
             description=excluded.description,
             order_index=excluded.order_index,
             tasks_json=excluded.tasks_json,
             payload_json=excluded.payload_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            l.id,
            l.module_id,
            (l as any).lang ?? inferLangFromPayload((l as any).payload ?? l) ?? inferLangFromId(String(l.id)) ?? null,
            (l as any).branch ?? (l as any)?.payload?.branch ?? null,
            l.title,
            (l as any).description ?? null,
            l.order_index ?? 0,
            tasksJson,
            safeJson(payload, {}),
            (l as any).updated_at ?? pack.updated_at ?? null,
            (l as any).content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // tasks
    if (pack.tasks?.length) {
      for (const t of pack.tasks) {
        await execSql(
          `INSERT INTO tasks (id, module_id, lang, branch, lesson_id, title, description, type, payload_json, estimated_minutes, tags_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             module_id=excluded.module_id,
             lang=excluded.lang,
             branch=excluded.branch,
             lesson_id=excluded.lesson_id,
             title=excluded.title,
             description=excluded.description,
             type=excluded.type,
             payload_json=excluded.payload_json,
             estimated_minutes=excluded.estimated_minutes,
             tags_json=excluded.tags_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            t.id,
            t.module_id,
            (t as any).lang ?? inferLangFromTags((t as any).tags) ?? inferLangFromId(String(t.id)) ?? null,
            (t as any).branch ?? null,
            t.lesson_id,
            t.title,
            t.description ?? null,
            t.type,
            safeJson(t.payload, {}),
            t.estimated_minutes ?? 5,
            safeJson(t.tags ?? [], []),
            t.updated_at ?? pack.updated_at ?? null,
            t.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // molecules (канонически: data_json = весь объект)
    if (pack.molecules?.length) {
      for (const m of pack.molecules) {
        await execSql(
          `INSERT INTO molecules (id, lang, branch, name, formula, data_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             lang=excluded.lang,
             branch=excluded.branch,
             name=excluded.name,
             formula=excluded.formula,
             data_json=excluded.data_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            m.id,
            (m as any).lang ?? null,
            (m as any).branch ?? null,
            m.name,
            m.formula,
            safeJson(m, {}),
            m.updated_at ?? pack.updated_at ?? null,
            m.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // reactions (канонически: data_json = весь объект)
    if (pack.reactions?.length) {
      for (const r of pack.reactions) {
        await execSql(
          `INSERT INTO reactions (id, lang, branch, title, equation, conditions, data_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             lang=excluded.lang,
             branch=excluded.branch,
             title=excluded.title,
             equation=excluded.equation,
             conditions=excluded.conditions,
             data_json=excluded.data_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            r.id,
            (r as any).lang ?? null,
            (r as any).branch ?? null,
            r.title,
            r.equation,
            r.conditions ?? null,
            safeJson(r, {}),
            r.updated_at ?? pack.updated_at ?? null,
            r.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // physics_scenarios
    if (pack.physics_scenarios?.length) {
      for (const s of pack.physics_scenarios) {
        await execSql(
          `INSERT INTO physics_scenarios (id, module_id, lang, title, payload_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             module_id=excluded.module_id,
             lang=excluded.lang,
             title=excluded.title,
             payload_json=excluded.payload_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            s.id,
            s.module_id,
            (s as any).lang ?? inferLangFromPayload((s as any).payload ?? s) ?? inferLangFromId(String(s.id)) ?? null,
            s.title,
            safeJson(s.payload ?? s, {}),
            s.updated_at ?? pack.updated_at ?? null,
            s.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    // ai_knowledge -> ai_docs
    if (pack.ai_knowledge?.length) {
      for (const d of pack.ai_knowledge) {
        const externalId =
          (d.external_id && String(d.external_id)) ||
          `${pack.pack_id}_${pack.version}_${d.lang}_${d.title}`.slice(0, 200);

        await execSql(
          `INSERT INTO ai_docs (external_id, subject, lang, title, body, tags_json, updated_at, content_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(external_id) DO UPDATE SET
             subject=excluded.subject,
             lang=excluded.lang,
             title=excluded.title,
             body=excluded.body,
             tags_json=excluded.tags_json,
             updated_at=excluded.updated_at,
             content_hash=excluded.content_hash;`,
          [
            externalId,
            d.subject ?? null,
            d.lang,
            d.title,
            d.body,
            safeJson(d.tags ?? [], []),
            d.updated_at ?? pack.updated_at ?? null,
            d.content_hash ?? pack.content_hash ?? null,
          ]
        );
      }
    }

    await execSql("COMMIT;");
  } catch (e) {
    await execSql("ROLLBACK;");
    throw e;
  }
}

export async function applyBundledContentPacksIfNeeded(): Promise<void> {
  await ensureContentMetaTable();

  // ВАЖНО: require должен быть СТАТИЧЕСКИМ, чтобы Metro включил JSON в bundle.
  const corePack = require("../../assets/content/core_pack_v1.json") as Pack;
  const physicsPack = require("../../assets/content/physics_pack_v1.json") as Pack;
  const chemistryPack = require("../../assets/content/chemistry_pack_v1.json") as Pack;
  const chemistryLayerA = require("../../assets/content/chemistry_molecules_layer_a_v1.json") as Pack;
  const chemistryLayerB = require("../../assets/content/chemistry_molecules_layer_b_v1.json") as Pack;

  const packs: Pack[] = [corePack, physicsPack, chemistryPack, chemistryLayerA, chemistryLayerB];

  for (const pack of packs) {
    if (!pack?.pack_id || typeof pack.version !== "number") {
      throw new Error("content pack invalid: missing pack_id/version");
    }

    const installed = await getInstalledVersion(pack.pack_id);
    if (installed === null || pack.version > installed) {
      await importPack(pack);
      await setInstalledMeta({
        pack_id: pack.pack_id,
        version: pack.version,
        updated_at: pack.updated_at,
        content_hash: pack.content_hash ?? null,
      });
    }
  }

  // safety net: если по какой-то причине после обновлений все еще маленький набор,
  // принудительно накатываем большие молекулярные слои A/B.
  const moleculesCount = await getMoleculesCount();
  if (moleculesCount < 1000) {
    await importPack(chemistryLayerA);
    await importPack(chemistryLayerB);
    await setInstalledMeta({
      pack_id: chemistryLayerA.pack_id,
      version: chemistryLayerA.version,
      updated_at: chemistryLayerA.updated_at,
      content_hash: chemistryLayerA.content_hash ?? null,
    });
    await setInstalledMeta({
      pack_id: chemistryLayerB.pack_id,
      version: chemistryLayerB.version,
      updated_at: chemistryLayerB.updated_at,
      content_hash: chemistryLayerB.content_hash ?? null,
    });
  }
}

// ✅ Алиас: старое имя
export const applyContentPacksIfNeeded = applyBundledContentPacksIfNeeded;
