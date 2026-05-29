// app/services/api.ts
import { API_BASE_URL } from "@app/config/api";

function redactSecrets(input: unknown): string {
  const raw = typeof input === "string" ? input : JSON.stringify(input ?? "");
  return raw
    .replace(/hf_[A-Za-z0-9]{8,}/g, "hf_[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/(token|api[_-]?key|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]");
}

function safeLog(...args: unknown[]) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(...args);
  }
}

async function safeFetch(path: string, options: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    if (!res.ok) {
      safeLog("[API ERROR]", path, res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    safeLog("[API EXCEPTION]", path, redactSecrets(e));
    return null;
  }
}

export async function askOnlineAI(question: string): Promise<string | null> {
  const data = await safeFetch("/ai-mentor/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language: "ru", mode: "auto" }),
  });

  if (!data) return null;
  return typeof data.answer === "string" ? data.answer : null;
}

export interface ProgressSyncItem {
  user_local_id: string;
  task_id: string;
  status: "new" | "in_progress" | "completed";
  score: number | null;
  completed_at: string | null;
  module_id?: string | null;
  lesson_id?: number | string | null;
  last_answer?: string | null;
}

export async function syncProgress(items: ProgressSyncItem[]): Promise<string[] | null> {
  const deviceId = String(items[0]?.user_local_id ?? "").trim();
  if (!deviceId || !items.length) return null;

  const data = await safeFetch("/progress/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: deviceId,
      items: items.map((item) => ({
        device_id: String(item.user_local_id || deviceId),
        module_id: String(item.module_id ?? ""),
        lesson_id: item.lesson_id ?? "",
        task_id: String(item.task_id),
        completed: item.status === "completed" ? 1 : 0,
        score: Number(item.score ?? 0),
        last_answer: item.last_answer ?? null,
        updated_at: item.completed_at ?? new Date().toISOString(),
      })),
    }),
  });

  if (!data) return null;
  if (Array.isArray(data.accepted_task_ids)) return data.accepted_task_ids;
  if (Array.isArray(data.synced_task_ids)) return data.synced_task_ids;
  return null;
}
