import { getBranchAliases } from "@app/chemistry/branches";
import { execSql } from "./database";

export type TaskType = "numeric" | "quiz" | "open";

export type Task = {
  id: string;
  module_id: string;
  lang: "ru" | "en";
  lesson_id: number;
  title: string;
  description: string;
  type: TaskType;
  estimated_minutes: number;
  payload: any;
  tags: string[];
};

function safeParseJson(s: any, fallback: any) {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function taskBranchFilter(branch?: string): { sql: string; params: string[] } {
  const aliases = getBranchAliases(branch);
  if (!aliases.length) return { sql: "", params: [] };

  const placeholders = aliases.map(() => "?").join(", ");
  return {
    sql: `
      AND (
        lower(coalesce(branch, '')) IN (${placeholders})
        OR lower(coalesce(json_extract(payload_json, '$.branch'), '')) IN (${placeholders})
        OR lower(coalesce(json_extract(payload_json, '$.category'), '')) IN (${placeholders})
        OR EXISTS (
          SELECT 1
          FROM json_each(coalesce(tags_json, '[]')) jt
          WHERE lower(CAST(jt.value AS TEXT)) IN (${placeholders})
        )
      )
    `,
    params: [...aliases, ...aliases, ...aliases, ...aliases],
  };
}

export async function getTasksByLesson(lessonId: number, lang: "ru" | "en", branch?: string): Promise<Task[]> {
  const bf = taskBranchFilter(branch);
  const rows = await execSql(
    `SELECT id, module_id, lang, lesson_id, title, description, type, estimated_minutes, payload_json, tags_json
     FROM tasks
     WHERE lesson_id = ? AND (lang = ? OR lang IS NULL OR lang = '')
     ${bf.sql}
     ORDER BY id ASC;`,
    [lessonId, lang, ...bf.params]
  );

  return (rows ?? []).map((r: any) => ({
    id: String(r.id),
    module_id: String(r.module_id),
    lang: (String(r.lang) as any) || "ru",
    lesson_id: Number(r.lesson_id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    type: String(r.type) as any,
    estimated_minutes: Number(r.estimated_minutes ?? 5),
    payload: safeParseJson(r.payload_json, {}),
    tags: safeParseJson(r.tags_json, []),
  }));
}

export async function getTasksByModule(moduleId: string, lang: "ru" | "en", branch?: string): Promise<Task[]> {
  const bf = taskBranchFilter(branch);
  const rows = await execSql(
    `SELECT id, module_id, lang, lesson_id, title, description, type, estimated_minutes, payload_json, tags_json
     FROM tasks
     WHERE module_id = ? AND (lang = ? OR lang IS NULL OR lang = '')
     ${bf.sql}
     ORDER BY lesson_id ASC, id ASC;`,
    [moduleId, lang, ...bf.params]
  );

  return (rows ?? []).map((r: any) => ({
    id: String(r.id),
    module_id: String(r.module_id),
    lang: (String(r.lang) as any) || "ru",
    lesson_id: Number(r.lesson_id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    type: String(r.type) as any,
    estimated_minutes: Number(r.estimated_minutes ?? 5),
    payload: safeParseJson(r.payload_json, {}),
    tags: safeParseJson(r.tags_json, []),
  }));
}

export async function upsertTask(task: {
  id: string;
  module_id: string;
  lesson_id: number | null;
  lang: "ru" | "en";
  title: string;
  description: string;
  type: TaskType;
  estimated_minutes?: number;
  payload: any;
  tags?: string[];
}): Promise<void> {
  await execSql(
    `INSERT INTO tasks (id, module_id, lesson_id, lang, title, description, type, payload_json, estimated_minutes, tags_json, updated_at, content_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)
     ON CONFLICT(id) DO UPDATE SET
       module_id=excluded.module_id,
       lesson_id=excluded.lesson_id,
       lang=excluded.lang,
       title=excluded.title,
       description=excluded.description,
       type=excluded.type,
       payload_json=excluded.payload_json,
       estimated_minutes=excluded.estimated_minutes,
       tags_json=excluded.tags_json,
       updated_at=excluded.updated_at;`,
    [
      String(task.id),
      String(task.module_id),
      task.lesson_id === null ? null : Number(task.lesson_id),
      String(task.lang),
      String(task.title ?? ""),
      String(task.description ?? ""),
      String(task.type),
      JSON.stringify(task.payload ?? {}),
      Number(task.estimated_minutes ?? 5),
      JSON.stringify(Array.isArray(task.tags) ? task.tags : []),
    ]
  );
}

