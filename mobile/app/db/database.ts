// mobile/app/db/database.ts
import { Platform } from "react-native";

/**
 * Industrial SQLite layer (Expo)
 * - Совместим с новым и старым expo-sqlite
 * - НЕ управляет схемой и версиями (это делает bootstrap.ts)
 * - Отвечает только за стабильный доступ к БД
 */

const DB_NAME = "synapse.db";

type SqlParam = string | number | null;

let db: any | null = null;
let sqliteModule: any | null = null;

function getSQLiteModule(): any | null {
  if (Platform.OS === "web") return null;
  if (!sqliteModule) {
    // Lazy load only on native platforms to avoid web runtime crash.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sqliteModule = require("expo-sqlite");
  }
  return sqliteModule;
}

function redactSecrets(input: unknown): string {
  const raw = typeof input === "string" ? input : JSON.stringify(input ?? "");
  return raw
    .replace(/hf_[A-Za-z0-9]{8,}/g, "hf_[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/(token|api[_-]?key|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]");
}

function openDbCompat() {
  const SQLite = getSQLiteModule();
  if (!SQLite) {
    throw new Error("expo-sqlite disabled on web");
  }
  if (typeof (SQLite as any).openDatabaseSync === "function") {
    return (SQLite as any).openDatabaseSync(DB_NAME);
  }
  if (typeof (SQLite as any).openDatabase === "function") {
    return (SQLite as any).openDatabase(DB_NAME);
  }
  throw new Error("expo-sqlite: не найден метод открытия БД.");
}

export function getDb(): any {
  if (Platform.OS === "web") return null;
  if (!db) {
    try {
      db = openDbCompat();
    } catch (e) {
      console.error("[DB] Failed to open database:", redactSecrets(e));
      throw new Error("Не удалось открыть локальную базу данных.");
    }
  }
  return db;
}

async function execAllCompat(sql: string, params: SqlParam[] = []): Promise<any[]> {
  if (Platform.OS === "web") return [];
  const database = getDb();

  if (typeof database.getAllAsync === "function") {
    return (await database.getAllAsync(sql, params)) ?? [];
  }

  return await new Promise<any[]>((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_: any, result: any) => {
            const out: any[] = [];
            const len = result?.rows?.length ?? 0;
            for (let i = 0; i < len; i++) out.push(result.rows.item(i));
            resolve(out);
          },
          (_: any, err: any) => {
            reject(err);
            return true;
          }
        );
      },
      (err: any) => reject(err)
    );
  });
}

async function execRunCompat(sql: string, params: SqlParam[] = []): Promise<void> {
  if (Platform.OS === "web") return;
  const database = getDb();

  if (typeof database.runAsync === "function") {
    await database.runAsync(sql, params);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    database.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          () => resolve(),
          (_: any, err: any) => {
            reject(err);
            return true;
          }
        );
      },
      (err: any) => reject(err)
    );
  });
}

export async function execSql(sql: string, params: SqlParam[] = []): Promise<any[]> {
  try {
    const head = sql.trim().slice(0, 10).toUpperCase();
    const expectsRows =
      head.startsWith("SELECT") ||
      head.startsWith("PRAGMA") ||
      head.startsWith("WITH");

    if (expectsRows) {
      return await execAllCompat(sql, params);
    }

    await execRunCompat(sql, params);
    return [];
  } catch (error: any) {
    console.error("[DB] SQL error");
    console.error("[DB] SQL:", sql);
    console.error("[DB] Params: [redacted]");
    console.error("[DB] Original error:", redactSecrets(error));
    throw new Error(
      typeof error?.message === "string"
        ? error.message
        : "Ошибка SQLite"
    );
  }
}

async function setPragmas(): Promise<void> {
  await execSql("PRAGMA foreign_keys = ON;");
  await execSql("PRAGMA journal_mode = WAL;");
  await execSql("PRAGMA synchronous = NORMAL;");
  await execSql("PRAGMA temp_store = MEMORY;");
}

/**
 * Единственная задача initDatabase —
 * открыть БД и выставить PRAGMA.
 * Схема и миграции — ТОЛЬКО в bootstrap.ts
 */
export async function initDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[DB] initDatabase skipped on web");
    return;
  }
  try {
    getDb();
    await setPragmas();
    console.log("[DB] initDatabase ok");
  } catch (error) {
    console.error("[DB] initDatabase failed:", redactSecrets(error));
    throw error;
  }
}
