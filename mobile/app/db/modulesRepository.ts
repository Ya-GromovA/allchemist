import { execSql } from "./database";

export type Module = {
  id: string;
  title: string;
  description: string;
  available: boolean;
  icon?: string | null;
};

async function ensureModulesTable(): Promise<void> {
  await execSql(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      title_ru TEXT,
      title_en TEXT,
      description_ru TEXT,
      description_en TEXT,
      available INTEGER NOT NULL DEFAULT 1,
      icon TEXT
    );
  `);

  // Если таблица уже существовала со старой схемой — добавим недостающие колонки.
  try {
    const cols = await execSql("PRAGMA table_info(modules);");
    const names = new Set((cols ?? []).map((c: any) => String(c.name)));

    if (!names.has("available")) {
      await execSql("ALTER TABLE modules ADD COLUMN available INTEGER NOT NULL DEFAULT 1;");
    }
    if (!names.has("title_ru")) {
      await execSql("ALTER TABLE modules ADD COLUMN title_ru TEXT;");
    }
    if (!names.has("title_en")) {
      await execSql("ALTER TABLE modules ADD COLUMN title_en TEXT;");
    }
    if (!names.has("description_ru")) {
      await execSql("ALTER TABLE modules ADD COLUMN description_ru TEXT;");
    }
    if (!names.has("description_en")) {
      await execSql("ALTER TABLE modules ADD COLUMN description_en TEXT;");
    }
    if (!names.has("icon")) {
      await execSql("ALTER TABLE modules ADD COLUMN icon TEXT;");
    }
  } catch {
    // ok
  }
}


async function seedModulesIfEmpty(): Promise<void> {
  const rows = await execSql("SELECT COUNT(*) AS cnt FROM modules;");
  const cnt = Number((rows?.[0] as any)?.cnt ?? 0);

  if (cnt > 0) {
    // Если таблица непустая, но заголовки пустые (например, после импорта паков) — восстановим базовые.
    const bad = await execSql("SELECT COUNT(*) AS cnt FROM modules WHERE (title IS NULL OR TRIM(title) = '') AND (title_ru IS NOT NULL OR title_en IS NOT NULL OR description_ru IS NOT NULL OR description_en IS NOT NULL);");
    const badCnt = Number((bad?.[0] as any)?.cnt ?? 0);
    if (badCnt === 0) return;
  }

  const seed: Module[] = [
    {
      id: "chemistry",
      title: "Химия",
      description: "Уроки, формулы, интерактивные задания и тренировки.",
      available: true,
      icon: null
    },
    {
      id: "physics",
      title: "Физика",
      description: "Теория + задачи по темам с прогрессом и проверкой.",
      available: true,
      icon: null
    },
    {
      id: "ai_mentor",
      title: "AI-Ментор",
      description: "Помощник для объяснений, разборов и подсказок по STEM.",
      available: true,
      icon: null
    }
  ];

  for (const m of seed) {
    await execSql(
      `INSERT INTO modules (id, title, description, available, icon)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = CASE WHEN excluded.title IS NOT NULL AND LENGTH(TRIM(excluded.title)) > 0 THEN excluded.title ELSE modules.title END,
         description = CASE WHEN excluded.description IS NOT NULL AND LENGTH(TRIM(excluded.description)) > 0 THEN excluded.description ELSE modules.description END,
         available = excluded.available,
         icon = COALESCE(excluded.icon, modules.icon);`,
      [m.id, m.title, m.description, m.available ? 1 : 0, m.icon ?? null]
    );
  }
}

export async function getAllModules(lang?: "ru" | "en"): Promise<Module[]> {
  await ensureModulesTable();
  await seedModulesIfEmpty();

  const rows = await execSql(
    "SELECT id, title, description, title_ru, title_en, description_ru, description_en, available, icon FROM modules ORDER BY available DESC, title ASC;"
  );

  return (rows ?? []).map((r: any) => {
    const rawTitle = String(r.title ?? "").trim();
    const rawDesc = String(r.description ?? "").trim();

    const titleRu = String(r.title_ru ?? "").trim();
    const titleEn = String(r.title_en ?? "").trim();
    const descRu = String(r.description_ru ?? "").trim();
    const descEn = String(r.description_en ?? "").trim();

    const title =
      rawTitle ||
      (lang === "ru" ? titleRu : lang === "en" ? titleEn : "") ||
      titleRu ||
      titleEn ||
      String(r.id ?? "");

    const description =
      rawDesc ||
      (lang === "ru" ? descRu : lang === "en" ? descEn : "") ||
      descRu ||
      descEn ||
      "";

    return {
      id: String(r.id),
      title,
      description,
      available: Number(r.available) === 1,
      icon: r.icon ?? null
    };
  });
}
