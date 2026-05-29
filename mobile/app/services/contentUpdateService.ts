// /root/synapse/mobile/app/services/contentUpdateService.ts
import NetInfo from "@react-native-community/netinfo";
import { execSql } from "@app/db/database";
import { API_BASE_URL } from "@app/config/api";

// ---- server types
type PacksIndexItem = {
  pack_id: string;
  version: number;
  updated_at?: string;
  etag?: string | null;
  last_modified?: string | null;
  content_hash?: string | null;
  size_bytes?: number;
};

type PacksIndexResponse = { packs: PacksIndexItem[] };

type PackDoc = {
  pack_id: string;
  version: number;
  generated_at?: string;
  updated_at?: string;
  content_hash?: string | null;

  modules?: any[];
  lesson_blocks?: any[];
  tasks?: any[];
  molecules?: any[];
  reactions?: any[];
  physics_scenarios?: any[];
  ai_knowledge?: any[];
};

function j(x: any): string {
  return JSON.stringify(x ?? {});
}
function jarr(x: any): string {
  return JSON.stringify(Array.isArray(x) ? x : []);
}

async function getMeta(packId: string): Promise<{
  version: number | null;
  etag?: string | null;
  last_modified?: string | null;
  content_hash?: string | null;
}> {
  const rows = await execSql(
    `SELECT version, etag, last_modified, content_hash FROM content_meta WHERE pack_id=?;`,
    [packId]
  );
  if (!rows.length) return { version: null };
  return {
    version: Number(rows[0].version ?? 0),
    etag: rows[0].etag ?? null,
    last_modified: rows[0].last_modified ?? null,
    content_hash: rows[0].content_hash ?? null
  };
}

async function upsertMeta(
  packId: string,
  version: number,
  etag?: string | null,
  lastModified?: string | null,
  contentHash?: string | null
): Promise<void> {
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
    [packId, version, now, etag ?? null, lastModified ?? null, contentHash ?? null]
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

async function upsertModules(mods: any[]): Promise<void> {
  for (const m of mods) {
    if (!m?.id) continue;
    await execSql(
      `INSERT INTO modules (id, title, description, title_ru, title_en, description_ru, description_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         description=excluded.description,
         title_ru=excluded.title_ru,
         title_en=excluded.title_en,
         description_ru=excluded.description_ru,
         description_en=excluded.description_en;`,
      [
        String(m.id),
        String(m.title ?? ""),
        String(m.description ?? ""),
        String(m.title_ru ?? ""),
        String(m.title_en ?? ""),
        String(m.description_ru ?? ""),
        String(m.description_en ?? "")
      ]
    );
  }
}

async function upsertLessonBlocks(items: any[]): Promise<void> {
  for (const l of items) {
    if (l?.id === undefined || l?.id === null) continue;
    const id = Number(l.id);
    const moduleId = String(l.module_id ?? "");
    if (!moduleId) continue;

    const lang =
      (l.lang ??
        inferLangFromId(String(l.external_id ?? "")) ??
        inferLangFromId(String(l.id ?? ""))) ||
      null;

    const title = String(l.title ?? "");
    const description = String(l.description ?? l.content ?? "");
    const branch = String(l.branch ?? l.payload?.branch ?? "").trim() || null;

    const tasks =
      Array.isArray(l.tasks) ? l.tasks : Array.isArray(l.task_ids) ? l.task_ids : [];

    const orderIndex = Number(l.order_index ?? 0);

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
        id,
        moduleId,
        lang,
        branch,
        title,
        description,
        orderIndex,
        jarr(tasks),
        j(l.payload ?? {}),
        l.updated_at ?? null,
        l.content_hash ?? null
      ]
    );
  }
}

async function upsertTasks(items: any[]): Promise<void> {
  for (const t of items) {
    if (!t?.id) continue;

    const id = String(t.id);
    const moduleId = String(t.module_id ?? "");
    const lessonId =
      t.lesson_id === undefined || t.lesson_id === null ? null : Number(t.lesson_id);

    const tags = Array.isArray(t.tags) ? t.tags : [];
    const lang = (t.lang ?? inferLangFromTags(tags) ?? inferLangFromId(id)) || null;
    const branch = String(t.branch ?? t.payload?.branch ?? "").trim() || null;

    await execSql(
      `INSERT INTO tasks (id, module_id, lesson_id, lang, branch, title, description, type, payload_json, estimated_minutes, tags_json, updated_at, content_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         module_id=excluded.module_id,
         lesson_id=excluded.lesson_id,
         lang=excluded.lang,
         branch=excluded.branch,
         title=excluded.title,
         description=excluded.description,
         type=excluded.type,
         payload_json=excluded.payload_json,
         estimated_minutes=excluded.estimated_minutes,
         tags_json=excluded.tags_json,
         updated_at=excluded.updated_at,
         content_hash=excluded.content_hash;`,
      [
        id,
        moduleId,
        lessonId,
        lang,
        branch,
        String(t.title ?? ""),
        String(t.description ?? ""),
        String(t.type ?? "open"),
        j(t.payload ?? {}),
        Number(t.estimated_minutes ?? 5),
        jarr(tags),
        t.updated_at ?? null,
        t.content_hash ?? null
      ]
    );
  }
}

async function upsertMolecules(items: any[]): Promise<void> {
  for (const m of items) {
    if (!m?.id) continue;

    // В pack сейчас atoms лежит прямо массивом объектов.
    // Мы сохраняем ВСЁ в molecules.data_json, чтобы 2D/3D читали единообразно.
    const data = {
      ...(m.data ?? {}),
      atoms: Array.isArray(m.atoms) ? m.atoms : [],
      formula: m.formula ?? null,
      name: m.name ?? null,
      branch: m.branch ?? m.category ?? null
    };
    const lang = (m.lang ?? inferLangFromId(String(m.id ?? "")) ?? null) as any;
    const branch = String(m.branch ?? m.category ?? "").trim() || null;

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
        String(m.id),
        lang,
        branch,
        String(m.name ?? ""),
        String(m.formula ?? ""),
        j(data),
        m.updated_at ?? null,
        m.content_hash ?? null
      ]
    );
  }
}

async function upsertReactions(items: any[]): Promise<void> {
  for (const r of items) {
    if (!r?.id) continue;

    const data = {
      reactants: Array.isArray(r.reactants) ? r.reactants : [],
      products: Array.isArray(r.products) ? r.products : [],
      branch: r.branch ?? r.category ?? null,
      ...(r.data ?? {})
    };
    const lang = (r.lang ?? inferLangFromId(String(r.id ?? "")) ?? null) as any;
    const branch = String(r.branch ?? r.category ?? "").trim() || null;

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
        String(r.id),
        lang,
        branch,
        String(r.title ?? ""),
        String(r.equation ?? ""),
        r.conditions ?? null,
        j(data),
        r.updated_at ?? null,
        r.content_hash ?? null
      ]
    );
  }
}

async function upsertAiKnowledge(items: any[]): Promise<void> {
  for (const d of items) {
    const title = String(d.title ?? "");
    const body = String(d.body ?? d.content ?? "");
    if (!title || !body) continue;

    const subject = d.subject ? String(d.subject) : null;
    const lang = (d.lang ?? inferLangFromId(String(d.id ?? "")) ?? null) as any;

    await execSql(
      `INSERT INTO ai_docs (title, body, subject, lang, updated_at, content_hash)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [title, body, subject, lang, d.updated_at ?? null, d.content_hash ?? null]
    );
  }

  await execSql(`
    DELETE FROM ai_docs
    WHERE id NOT IN (
      SELECT MAX(id) FROM ai_docs
      GROUP BY subject, lang, title
    );
  `);
}

async function applyPackDoc(pack: PackDoc): Promise<void> {
  await execSql("BEGIN;");
  try {
    if (Array.isArray(pack.modules) && pack.modules.length) await upsertModules(pack.modules);
    if (Array.isArray(pack.lesson_blocks) && pack.lesson_blocks.length)
      await upsertLessonBlocks(pack.lesson_blocks);
    if (Array.isArray(pack.tasks) && pack.tasks.length) await upsertTasks(pack.tasks);
    if (Array.isArray(pack.molecules) && pack.molecules.length) await upsertMolecules(pack.molecules);
    if (Array.isArray(pack.reactions) && pack.reactions.length) await upsertReactions(pack.reactions);
    if (Array.isArray(pack.ai_knowledge) && pack.ai_knowledge.length) await upsertAiKnowledge(pack.ai_knowledge);

    await execSql("COMMIT;");
  } catch (e) {
    await execSql("ROLLBACK;");
    throw e;
  }
}

async function canUpdateNow(): Promise<boolean> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return false;

  const reachable = (net as any)?.isInternetReachable;
  // На некоторых платформах reachable бывает null/undefined — считаем, что интернет есть.
  if (reachable === false) return false;

  return true;
}

export const contentUpdateService = {
  async listServerPacks(): Promise<PacksIndexItem[]> {
    const url = `${API_BASE_URL}/content/packs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`content packs index failed: ${res.status}`);
    const json = (await res.json()) as PacksIndexResponse;
    return Array.isArray(json.packs) ? json.packs : [];
  },

  async downloadPack(packId: string): Promise<{ doc: PackDoc; etag?: string | null; lastModified?: string | null }> {
    const meta = await getMeta(packId);
    const headers: Record<string, string> = {};
    if (meta.etag) headers["If-None-Match"] = String(meta.etag);
    if (meta.last_modified) headers["If-Modified-Since"] = String(meta.last_modified);

    const url = `${API_BASE_URL}/content/pack/${encodeURIComponent(packId)}`;
    const res = await fetch(url, { headers });

    if (res.status === 304) {
      return {
        doc: { pack_id: packId, version: meta.version ?? 0 } as PackDoc,
        etag: meta.etag,
        lastModified: meta.last_modified
      };
    }
    if (!res.ok) throw new Error(`download pack failed: ${packId} (${res.status})`);

    const etag = res.headers.get("ETag");
    const lastModified = res.headers.get("Last-Modified");
    const doc = (await res.json()) as PackDoc;
    return { doc, etag, lastModified };
  },


  async downloadSubjectOffline(subject: "chemistry" | "physics" | "core"): Promise<{ updated: string[]; skipped: string[] }> {
    const updated: string[] = [];
    const skipped: string[] = [];

    const map: Record<string, string[]> = {
      chemistry: ["chemistry_pack", "chemistry_molecules_layer_a", "chemistry_molecules_layer_b"],
      physics: ["physics_pack"],
      core: ["core"]
    };

    const packIds = map[subject] || [];
    if (!packIds.length) return { updated, skipped };

    for (const packId of packIds) {
      const local = await getMeta(packId);
      const { doc, etag, lastModified } = await this.downloadPack(packId);

      if (!doc || !doc.pack_id) {
        skipped.push(packId);
        continue;
      }

      await applyPackDoc(doc);
      await upsertMeta(packId, doc.version ?? (local.version ?? 0) + 1, etag, lastModified, doc.content_hash ?? null);
      updated.push(packId);
    }

    return { updated, skipped };
  },
  async checkForUpdatesAndApply(): Promise<{ updated: string[]; skipped: string[] }> {
    const updated: string[] = [];
    const skipped: string[] = [];

    const ok = await canUpdateNow();
    if (!ok) return { updated, skipped };

    const serverPacks = await this.listServerPacks();

    for (const p of serverPacks) {
      const local = await getMeta(p.pack_id);

      const need =
        local.version === null ||
        p.version > local.version ||
        (p.version === local.version &&
          p.content_hash &&
          local.content_hash &&
          p.content_hash !== local.content_hash);

      if (!need) {
        skipped.push(p.pack_id);
        continue;
      }

      const { doc, etag, lastModified } = await this.downloadPack(p.pack_id);

      if (!doc || !doc.pack_id) {
        skipped.push(p.pack_id);
        continue;
      }

      if (p.version > (local.version ?? 0) || (p.content_hash && p.content_hash !== local.content_hash)) {
        await applyPackDoc(doc);
        await upsertMeta(
          p.pack_id,
          p.version,
          etag ?? p.etag ?? null,
          lastModified ?? p.last_modified ?? null,
          p.content_hash ?? null
        );
        updated.push(p.pack_id);
      } else {
        skipped.push(p.pack_id);
      }
    }

    return { updated, skipped };
  }
};
