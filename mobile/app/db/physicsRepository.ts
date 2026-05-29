// /root/synapse/mobile/app/db/physicsRepository.ts
import { execSql } from "./database";

export type PhysicsScenario = {
  id: string;
  module_id: string;
  lang: "ru" | "en";
  title: string;
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

export async function getPhysicsScenarios(lang: "ru" | "en"): Promise<PhysicsScenario[]> {
  const rows = await execSql(
    `SELECT id, module_id, lang, title, payload_json
     FROM physics_scenarios
     WHERE module_id = 'physics' AND lang = ?
     ORDER BY id ASC;`,
    [lang]
  );

  return (rows ?? []).map((r: any) => ({
    id: String(r.id),
    module_id: String(r.module_id ?? "physics"),
    lang: (String(r.lang) as any) || "ru",
    title: String(r.title ?? ""),
    payload: safeParseJson(r.payload_json, {})
  }));
}
