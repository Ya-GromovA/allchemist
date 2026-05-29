import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "ru" | "en";
export const SUPPORTED_LANGS: Lang[] = ["ru", "en"];
export const DEFAULT_LANG: Lang = "ru";

const STORAGE_KEY = "synapse_lang";

type Dict = typeof dict;
type DictKey = keyof Dict["ru"];

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const dict = {
  ru: {
    app_name: "Алхимик",
    app_subtitle: "Научная платформа для химии, физики, биологии и подготовки к экзаменам",

    home_title: "Главная",

    modules: "Модули",
    language: "Язык",
    general: "Общий",
    physics: "Физика",
    chemistry: "Химия",
    biology: "Биология",
    ai_mentor: "AI-ментор",
    cabinet_title: "Личный кабинет",
    report_title: "Отчет",

    offline_first_hint:
      "Приложение работает оффлайн. При подключении к интернету контент и прогресс синхронизируются и могут дополняться.",

    loading: "Загрузка…",
    retry: "Повторить",
    ok: "Ок",
    cancel: "Отмена",
    error: "Ошибка",

    sync: "Синхронизировать",
    syncing: "Синк…",
    nothing_to_sync: "Нечего синхронизировать",
    synced_count: "Синхронизировано: {n}",

    content_update: "Обновление контента",
    content_updating: "Обновляем контент…",
    content_updated: "Контент обновлён",
    content_update_failed: "Не удалось обновить контент",
    last_update: "Последнее обновление: {date}",

    lessons_title: "Уроки",
    lessons_subtitle: "Уроки и задания. Прогресс — в SQLite, синк — на сервер.",
    lessons_empty: "Пока нет уроков.",
    tasks_title: "Задания",
    tasks_empty: "Нет задач в этом уроке.",
    task_check: "Проверить",
    task_next: "Дальше",
    task_done: "Готово",
    task_correct: "Верно!",
    task_incorrect: "Неверно",
    task_your_answer: "Твой ответ",
    task_enter_answer: "Введи ответ…",

    physics_title: "Физика",
    physics_subtitle: "Сценарии берутся из локальной БД. При появлении сети данные могут обновляться/дополняться.",
    physics_to_lessons: "Перейти к урокам",

    chemistry_title: "Химия",
    chemistry_subtitle: "Оффлайн-библиотека молекул и реакций (SQLite на устройстве).",
    molecules: "Молекулы",
    reactions: "Реакции",

    ai_title: "AI-ментор",
    ai_subtitle: "Локальный + онлайн помощник по STEM.",
    ai_question: "Твой вопрос",
    ai_answer: "Ответ",
    ai_force_offline: "Только оффлайн-режим",
    ai_placeholder: "Напиши вопрос по физике, химии или общий вопрос…",
    ai_thinking: "Думаю…",
    ai_ask: "Спросить",
    ai_error: "Не удалось получить ответ. Проверь интернет/настройки сервера.",

    share_progress: "Поделиться прогрессом",
    share_progress_title: "Прогресс Алхимик",

    // язык
    lang_ru: "Русский",
    lang_en: "English",
  },

  en: {
    app_name: "Алхимик",
    app_subtitle: "Science platform for chemistry, physics, biology and exam preparation",

    home_title: "Home",

    modules: "Modules",
    language: "Language",
    general: "General",
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
    ai_mentor: "AI Mentor",
    cabinet_title: "Cabinet",
    report_title: "Report",

    offline_first_hint:
      "The app works offline. When online, content and progress sync and may be updated/extended.",

    loading: "Loading…",
    retry: "Retry",
    ok: "OK",
    cancel: "Cancel",
    error: "Error",

    sync: "Sync",
    syncing: "Syncing…",
    nothing_to_sync: "Nothing to sync",
    synced_count: "Synced: {n}",

    content_update: "Content update",
    content_updating: "Updating content…",
    content_updated: "Content updated",
    content_update_failed: "Content update failed",
    last_update: "Last update: {date}",

    lessons_title: "Lessons",
    lessons_subtitle: "Lessons & tasks. Progress in SQLite, sync to server.",
    lessons_empty: "No lessons yet.",
    tasks_title: "Tasks",
    tasks_empty: "No tasks in this lesson.",
    task_check: "Check",
    task_next: "Next",
    task_done: "Done",
    task_correct: "Correct!",
    task_incorrect: "Incorrect",
    task_your_answer: "Your answer",
    task_enter_answer: "Enter your answer…",

    physics_title: "Physics",
    physics_subtitle: "Scenarios are loaded from local DB. When online, content may be updated/extended.",
    physics_to_lessons: "Go to lessons",

    chemistry_title: "Chemistry",
    chemistry_subtitle: "Offline molecules & reactions library (SQLite on device).",
    molecules: "Molecules",
    reactions: "Reactions",

    ai_title: "AI Mentor",
    ai_subtitle: "Offline + online STEM helper.",
    ai_question: "Your question",
    ai_answer: "Answer",
    ai_force_offline: "Offline only",
    ai_placeholder: "Ask a question about physics, chemistry, or anything…",
    ai_thinking: "Thinking…",
    ai_ask: "Ask",
    ai_error: "Could not get an answer. Check internet/server settings.",

    share_progress: "Share progress",
    share_progress_title: "Progress of Алхимик",

    // language
    lang_ru: "Русский",
    lang_en: "English",
  },
} as const;

const Ctx = createContext<I18nCtx | null>(null);

function isLang(x: any): x is Lang {
  return x === "ru" || x === "en";
}

function formatVars(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  // {n}, {date}, etc.
  return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k])), s);
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (isLang(saved)) setLangState(saved);
      } catch {
        // молча остаёмся на DEFAULT_LANG
      }
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {
      // если хранилище недоступно — не валим приложение
    }
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      const byLang = dict[lang] as Record<string, string>;
      const byRu = dict.ru as Record<string, string>;
      const raw = byLang[key as string] ?? byRu[key as string] ?? String(key);
      return formatVars(raw, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
