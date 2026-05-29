// /root/synapse/mobile/app/db/aiRepository.ts
import { execSql } from "./database";

export type AIDoc = {
  id: number;
  external_id?: string | null;
  lang?: string | null;
  title: string;
  body: string;
  subject?: string | null;
  updated_at?: string | null;
  content_hash?: string | null;
};

type UpsertAIDocInput = {
  external_id: string;          // обязательный ключ для дедупликации
  lang?: string | null;
  title: string;
  body: string;
  subject?: string | null;
  updated_at?: string | null;
  content_hash?: string | null;
};

async function tableExists(name: string): Promise<boolean> {
  const rows = await execSql(
    `SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name=?;`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await execSql(`PRAGMA table_info(${table});`);
  return rows.some((r: any) => String(r.name) === column);
}

/**
 * Возвращает документы AI.
 * Фильтры:
 * - subject (опционально)
 * - lang (опционально)
 */
export async function getAllAIDocs(params?: {
  subject?: string;
  lang?: string;
  limit?: number;
}): Promise<AIDoc[]> {
  const subject = params?.subject?.trim();
  const lang = params?.lang?.trim();
  const limit = Math.min(Math.max(params?.limit ?? 500, 1), 2000);

  const hasExternalId = await columnExists("ai_docs", "external_id");
  const hasLang = await columnExists("ai_docs", "lang");
  const hasSubject = await columnExists("ai_docs", "subject");
  const hasUpdatedAt = await columnExists("ai_docs", "updated_at");
  const hasContentHash = await columnExists("ai_docs", "content_hash");

  const cols: string[] = ["id", "title", "body"];
  if (hasExternalId) cols.push("external_id");
  if (hasLang) cols.push("lang");
  if (hasSubject) cols.push("subject");
  if (hasUpdatedAt) cols.push("updated_at");
  if (hasContentHash) cols.push("content_hash");

  const where: string[] = [];
  const args: any[] = [];

  if (subject && hasSubject) {
    where.push("subject = ?");
    args.push(subject);
  }
  if (lang && hasLang) {
    where.push("lang = ?");
    args.push(lang);
  }

  const sql = `
    SELECT ${cols.join(", ")}
    FROM ai_docs
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY id DESC
    LIMIT ${limit};
  `;

  const rows = await execSql(sql, args);

  return rows.map((r: any) => ({
    id: Number(r.id),
    external_id: r.external_id ?? null,
    lang: r.lang ?? null,
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    subject: r.subject ?? null,
    updated_at: r.updated_at ?? null,
    content_hash: r.content_hash ?? null,
  }));
}

/**
 * Поиск по AI-докам.
 * Сначала пытаемся FTS5 (ai_docs_fts), иначе fallback на LIKE.
 */
export async function searchAIDocs(params: {
  query: string;
  subject?: string;
  lang?: string;
  limit?: number;
}): Promise<AIDoc[]> {
  const q = (params.query ?? "").trim();
  if (!q) return [];

  const subject = params.subject?.trim();
  const lang = params.lang?.trim();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  const hasFts = await tableExists("ai_docs_fts");
  const hasExternalId = await columnExists("ai_docs", "external_id");
  const hasLang = await columnExists("ai_docs", "lang");
  const hasSubject = await columnExists("ai_docs", "subject");
  const hasUpdatedAt = await columnExists("ai_docs", "updated_at");
  const hasContentHash = await columnExists("ai_docs", "content_hash");

  const cols: string[] = ["d.id", "d.title", "d.body"];
  if (hasExternalId) cols.push("d.external_id");
  if (hasLang) cols.push("d.lang");
  if (hasSubject) cols.push("d.subject");
  if (hasUpdatedAt) cols.push("d.updated_at");
  if (hasContentHash) cols.push("d.content_hash");

  const where: string[] = [];
  const args: any[] = [];

  if (subject && hasSubject) {
    where.push("d.subject = ?");
    args.push(subject);
  }
  if (lang && hasLang) {
    where.push("d.lang = ?");
    args.push(lang);
  }

  if (hasFts) {
    // FTS5 query: используем простую форму. Можно расширять позже (NEAR/кавычки/префиксы).
    // Важно: MATCH параметризуем.
    const sql = `
      SELECT ${cols.join(", ")}
      FROM ai_docs d
      JOIN ai_docs_fts f ON f.rowid = d.id
      WHERE f MATCH ?
      ${where.length ? `AND ${where.join(" AND ")}` : ""}
      ORDER BY d.id DESC
      LIMIT ${limit};
    `;
    const rows = await execSql(sql, [q, ...args]);
    return rows.map((r: any) => ({
      id: Number(r.id),
      external_id: r.external_id ?? null,
      lang: r.lang ?? null,
      title: String(r.title ?? ""),
      body: String(r.body ?? ""),
      subject: r.subject ?? null,
      updated_at: r.updated_at ?? null,
      content_hash: r.content_hash ?? null,
    }));
  }

  // Fallback LIKE: ищем в title/body
  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const sql = `
    SELECT ${cols.join(", ")}
    FROM ai_docs d
    WHERE (d.title LIKE ? ESCAPE '\\' OR d.body LIKE ? ESCAPE '\\')
    ${where.length ? `AND ${where.join(" AND ")}` : ""}
    ORDER BY d.id DESC
    LIMIT ${limit};
  `;
  const rows = await execSql(sql, [like, like, ...args]);

  return rows.map((r: any) => ({
    id: Number(r.id),
    external_id: r.external_id ?? null,
    lang: r.lang ?? null,
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    subject: r.subject ?? null,
    updated_at: r.updated_at ?? null,
    content_hash: r.content_hash ?? null,
  }));
}

/**
 * Промышленный UPSERT для ai_docs.
 * - Ключ: external_id
 * - Требует, чтобы в bootstrap.ts был UNIQUE INDEX по external_id (мы добавили)
 */
export async function upsertAIDocs(docs: UpsertAIDocInput[]): Promise<{ insertedOrUpdated: number }> {
  if (!Array.isArray(docs) || docs.length === 0) {
    return { insertedOrUpdated: 0 };
  }

  const hasExternalId = await columnExists("ai_docs", "external_id");
  if (!hasExternalId) {
    // Это значит bootstrap/migration не отработали.
    throw new Error("ai_docs.external_id column is missing. Run bootstrapDatabase() before upserting.");
  }

  // Допускаем старые схемы без этих колонок (но в твоей они уже есть/будут)
  const hasLang = await columnExists("ai_docs", "lang");
  const hasSubject = await columnExists("ai_docs", "subject");
  const hasUpdatedAt = await columnExists("ai_docs", "updated_at");
  const hasContentHash = await columnExists("ai_docs", "content_hash");

  let count = 0;
  await execSql("BEGIN;");
  try {
    for (const d of docs) {
      const external_id = String(d.external_id ?? "").trim();
      if (!external_id) continue;

      const title = String(d.title ?? "").trim();
      const body = String(d.body ?? "").trim();
      if (!title || !body) continue;

      const lang = d.lang ?? null;
      const subject = d.subject ?? null;
      const updated_at = d.updated_at ?? null;
      const content_hash = d.content_hash ?? null;

      // Собираем списки колонок динамически (на случай “узких” схем)
      const columns: string[] = ["external_id", "title", "body"];
      const values: any[] = [external_id, title, body];

      if (hasLang) { columns.push("lang"); values.push(lang); }
      if (hasSubject) { columns.push("subject"); values.push(subject); }
      if (hasUpdatedAt) { columns.push("updated_at"); values.push(updated_at); }
      if (hasContentHash) { columns.push("content_hash"); values.push(content_hash); }

      const setParts: string[] = [
        "title=excluded.title",
        "body=excluded.body",
      ];
      if (hasLang) setParts.push("lang=excluded.lang");
      if (hasSubject) setParts.push("subject=excluded.subject");
      if (hasUpdatedAt) setParts.push("updated_at=excluded.updated_at");
      if (hasContentHash) setParts.push("content_hash=excluded.content_hash");

      const sql = `
        INSERT INTO ai_docs (${columns.join(", ")})
        VALUES (${columns.map(() => "?").join(", ")})
        ON CONFLICT(external_id) DO UPDATE SET
          ${setParts.join(", ")};
      `;

      await execSql(sql, values);
      count += 1;
    }

    await execSql("COMMIT;");
    return { insertedOrUpdated: count };
  } catch (e) {
    await execSql("ROLLBACK;");
    throw e;
  }
}
