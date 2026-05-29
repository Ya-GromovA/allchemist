// app/services/aiMentorService.ts
import NetInfo from "@react-native-community/netinfo";
import { api } from "@app/config/api";
import { API_BASE_URL } from "@app/config/api";
import { getAllAIDocs } from "@app/db/aiRepository";

export type MentorSource = "offline" | "online";

export interface MentorAnswer {
  answer: string;
  source: MentorSource;
}

type Lang = "ru" | "en";

function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    // оставляем буквы/цифры (лат+кирил), остальное в пробел
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreDoc(question: string, doc: string): number {
  const q = normalize(question);
  const d = normalize(doc);

  if (!q || !d) return 0;

  const qWords = q.split(" ").filter(Boolean);
  const dWords = d.split(" ").filter(Boolean);

  const dSet = new Set(dWords);

  let score = 0;
  for (const w of qWords) {
    if (w.length < 2) continue;
    if (dSet.has(w)) score += 2;
  }

  // небольшой бонус за подстроки (фразовые совпадения)
  if (d.includes(q.slice(0, Math.min(q.length, 24)))) score += 3;

  return score;
}

function i18n(lang: Lang) {
  const ru = lang !== "en";
  return {
    emptyQuestion: ru ? "Напиши, пожалуйста, вопрос." : "Please type your question.",
    noDocs: ru
      ? "Нет локальных материалов для ответа. Подключись к интернету или синхронизируй контент."
      : "No offline materials found. Connect to the internet or sync content.",
    offlineIntro: ru ? "Ответ на основе оффлайн-материалов:" : "Answer based on offline materials:",
    onlineFailed: ru
      ? "Не удалось получить ответ онлайн — использую оффлайн-материалы."
      : "Could not get an online answer — using offline materials.",
    serverEmpty: ru ? "Сервер вернул пустой ответ." : "Server returned an empty response."
  };
}

async function buildOfflineAnswer(question: string, subject?: string, lang: Lang = "ru"): Promise<string> {
  const t = i18n(lang);

  const docs = await getAllAIDocs({ subject, lang });
  if (!docs?.length) return t.noDocs;

  const ranked = docs
    .map((d) => ({
      title: d.title ?? "",
      body: d.body ?? "",
      score: scoreDoc(question, `${d.title ?? ""}\n${d.body ?? ""}`)
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked.filter((x) => x.score > 0).slice(0, 3);
  const picked = top.length ? top : ranked.slice(0, 2);

  const context = picked
    .map((d, idx) => {
      const header = d.title?.trim() ? d.title.trim() : lang === "en" ? `Offline note #${idx + 1}` : `Заметка #${idx + 1}`;
      const body = (d.body || "").trim();
      const bodyShort = body.length > 1600 ? body.slice(0, 1600) + "…" : body;
      return `• ${header}\n${bodyShort}`;
    })
    .join("\n\n");

  return `${t.offlineIntro}\n\n${context}`;
}

/**
 * AI Mentor: online (backend) + offline fallback (SQLite ai_docs)
 *
 * Совместимо с AIMentorScreen.tsx:
 *   askMentor(question, subject, forceOffline, lang)
 */
export async function askMentor(
  question: string,
  subject?: "physics" | "chemistry" | "meta" | string,
  forceOffline: boolean = false,
  lang: Lang = "ru"
): Promise<MentorAnswer> {
  const t = i18n(lang);

  const q = (question ?? "").trim();
  if (!q) return { answer: t.emptyQuestion, source: "offline" };

  const subj = subject === "meta" ? undefined : subject;

  // сеть
  const net = await NetInfo.fetch();
  const reachable = (net as any)?.isInternetReachable;
  const isOnline = Boolean(net.isConnected && (reachable === null || reachable === undefined || reachable));

  // принудительно оффлайн или нет сети
  if (forceOffline || !isOnline) {
    const offline = await buildOfflineAnswer(q, subj, lang);
    return { answer: offline, source: "offline" };
  }

  // online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(API_BASE_URL + "/ai-mentor/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        subject: subj,
        language: lang,
        mode: "auto"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const raw = await response.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const answer = (data?.answer ?? "").toString().trim();
    const srcRaw = String(data?.source ?? "").toLowerCase();
    const onlineError = String(data?.debug?.online_error ?? "").trim();
    if (!answer) {
      const offline = await buildOfflineAnswer(q, subj, lang);
      return { answer: `${t.serverEmpty}

${offline}`, source: "offline" };
    }

    if (srcRaw.startsWith("offline")) {
      const hint = onlineError
        ? (lang === "ru" ? `

(Онлайн недоступен: ${onlineError})` : `

(Online unavailable: ${onlineError})`)
        : "";
      return { answer: answer + hint, source: "offline" };
    }

    return { answer, source: "online" };
  } catch (e: any) {
    const offline = await buildOfflineAnswer(q, subj, lang);
    const msg = String(e?.response?.status ? `HTTP ${e.response.status}` : e?.message ?? e ?? "").trim();
    const detail = msg ? (lang === "ru" ? `

(Ошибка сети/сервера: ${msg})` : `

(Network/server error: ${msg})`) : "";
    return { answer: `${t.onlineFailed}${detail}

${offline}`, source: "offline" };
  }
}


export type RecommendedTask = {
  id: string;
  module_id: "physics" | "chemistry" | string;
  lesson_id: number;
  title: string;
  description: string;
  type: string;
  payload: any;
};

export async function getNextTask(
  deviceId: string,
  subject: "physics" | "chemistry" | undefined,
  lang: Lang
): Promise<{ found: boolean; task?: RecommendedTask; weak_topics?: string[]; reason?: string; message?: string }> {
  const res = await api.post("/ai-mentor/next-task", {
    device_id: deviceId,
    subject: subject ?? null,
    language: lang
  });
  return res.data;
}

export type GeneratedTask = {
  id: string;
  module_id: "physics" | "chemistry";
  lesson_id: number;
  lang: Lang;
  title: string;
  description: string;
  type: "numeric" | "quiz" | "open";
  estimated_minutes: number;
  payload: any;
  tags: string[];
  generated_at: string;
  saved: boolean;
};

export async function generateTask(
  subject: "physics" | "chemistry",
  topic: string | undefined,
  difficulty: 1 | 2 | 3,
  lang: Lang
): Promise<GeneratedTask> {
  const res = await api.post("/ai-mentor/generate-task", {
    subject,
    topic: topic ?? null,
    difficulty,
    language: lang,
    save_to_db: false
  });
  return res.data as GeneratedTask;
}
