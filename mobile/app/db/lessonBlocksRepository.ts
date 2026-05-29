// /root/synapse/mobile/app/db/lessonBlocksRepository.ts
import { execSql } from "./database";

export type LessonBlock = {
  id: number;
  module_id: string;
  lang: "ru" | "en";
  title: string;
  description: string;
  tasks: string[];
  order_index: number;
  payload: any;
};

function safeParseJson(s: any, fallback: any) {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export async function getLessonBlocks(moduleId: string, lang: "ru" | "en"): Promise<LessonBlock[]> {
  const rows = await execSql(
    `SELECT id, module_id, lang, title, description, order_index, tasks_json, payload_json
     FROM lesson_blocks
     WHERE module_id = ? AND (lang = ? OR lang IS NULL OR lang = '')
     ORDER BY order_index ASC, id ASC;`,
    [moduleId, lang]
  );

  return (rows ?? []).map((r: any) => ({
    id: Number(r.id),
    module_id: String(r.module_id),
    lang: (String(r.lang) as any) || "ru",
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    tasks: safeParseJson(r.tasks_json, []),
    order_index: Number(r.order_index ?? 0),
    payload: safeParseJson(r.payload_json, {})
  }));
}
