import { apiGet } from "../api/client";
import type { AppLang } from "../state/settings";

type ModuleDto = {
  id: string;
  title?: string;
  title_ru?: string;
  title_en?: string;
  description?: string;
  description_ru?: string;
  description_en?: string;
  available?: boolean;
};

export type LessonBlock = {
  id: number;
  module_id: string;
  title: string;
  content: string;
  type?: string;
  order_index?: number;
  payload?: any;
};

export type Task = {
  id: string;
  module_id: string;
  lesson_id: number;
  title: string;
  description?: string;
  type: string;
  payload: any;
  tags?: any; // jsonb
};

export async function fetchModules(lang: AppLang): Promise<Array<{ id: string; title: string; description: string; available: boolean }>> {
  const data = await apiGet<{ modules: ModuleDto[] }>("/api/v1/modules");

  return (data.modules || []).map((m) => {
    const title = lang === "ru" ? (m.title_ru || m.title || "") : (m.title_en || m.title || "");
    const description = lang === "ru" ? (m.description_ru || m.description || "") : (m.description_en || m.description || "");
    return { id: m.id, title, description, available: !!m.available };
  });
}

// ПРЕДПОСЫЛКА: backend должен отдавать lesson_blocks/tasks через эндпоинты.
// Если их пока нет — скажи, и я дам готовые эндпоинты на backend.
export async function fetchLessonBlocks(moduleId: string, lang: AppLang): Promise<LessonBlock[]> {
  const data = await apiGet<{ items: LessonBlock[] }>(`/api/v1/content/lesson-blocks?module_id=${encodeURIComponent(moduleId)}`);
  const items = data.items || [];

  return items.filter((b) => {
    const pl = b.payload || {};
    const plLang = (pl.lang || pl.language || "").toString().toLowerCase();
    // если нет lang — считаем ru по умолчанию
    return (plLang ? plLang === lang : lang === "ru");
  }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export async function fetchTasks(moduleId: string, lang: AppLang, lessonId?: number): Promise<Task[]> {
  const q = new URLSearchParams({ module_id: moduleId });
  if (lessonId != null) q.set("lesson_id", String(lessonId));

  const data = await apiGet<{ items: Task[] }>(`/api/v1/content/tasks?${q.toString()}`);
  const items = data.items || [];

  return items.filter((t) => {
    const pl = t.payload || {};
    const plLang = (pl.lang || pl.language || "").toString().toLowerCase();
    if (plLang) return plLang === lang;

    // fallback: tags содержит "ru"/"en"
    const tags = Array.isArray(t.tags) ? t.tags : (typeof t.tags === "object" && t.tags ? t.tags : []);
    if (Array.isArray(tags) && tags.includes(lang)) return true;

    // если нигде не указано — ru default
    return lang === "ru";
  });
}
