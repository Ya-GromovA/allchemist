import { execSql } from "./database";

export type TaskAttempt = {
  deviceId: string;
  moduleId: string;
  lessonId: string;
  taskId: string;
  answerText: string;
  score: number; // 0..1
  isCorrect: 0 | 1;
  createdAt?: string; // ISO with offset (optional)
};

export type UnsyncedProgressRow = {
  device_id: string;
  module_id: string;
  lesson_id: string;
  task_id: string;
  completed: number;
  score: number;
  last_answer: string | null;
  updated_at: string; // ISO with offset (local user time)
};

let ensuredOnce: Promise<void> | null = null;

function clamp01(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normStr(v: any): string {
  if (v == null) return "";
  return String(v);
}

/**
 * ISO локального времени пользователя С OFFSET.
 * Пример: 2025-12-16T03:00:00+01:00
 */
function toLocalIsoWithOffset(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  // minutes east of UTC
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

async function ensureTables(): Promise<void> {
  if (ensuredOnce) return ensuredOnce;

  ensuredOnce = (async () => {
    await execSql(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        score REAL NOT NULL DEFAULT 0,
        last_answer TEXT,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        UNIQUE(device_id, task_id)
      );
    `);

    await execSql(`
      CREATE TABLE IF NOT EXISTS task_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        score REAL NOT NULL,
        is_correct INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );
    `);

    await execSql(`CREATE INDEX IF NOT EXISTS idx_progress_device ON user_progress(device_id);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_progress_task ON user_progress(task_id);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_progress_synced ON user_progress(synced);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_progress_updated ON user_progress(updated_at);`);

    await execSql(`CREATE INDEX IF NOT EXISTS idx_attempts_device ON task_attempts(device_id);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_attempts_task ON task_attempts(task_id);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_attempts_synced ON task_attempts(synced);`);
    await execSql(`CREATE INDEX IF NOT EXISTS idx_attempts_created ON task_attempts(created_at);`);
  })();

  return ensuredOnce;
}

/**
 * Совместимо с твоим PhysicsTaskScreen.tsx:
 * markTaskCompleted(deviceId, taskId, score, answer, moduleId?, lessonId?)
 */
export async function markTaskCompleted(
  deviceId: string,
  taskId: string,
  score: number,
  lastAnswer?: string,
  moduleId: string = "physics",
  lessonId: string = ""
): Promise<void> {
  await ensureTables();

  const dev = normStr(deviceId).trim() || "device-unknown";
  const tId = normStr(taskId).trim();
  const s = clamp01(score);
  const completed = s > 0 ? 1 : 0; // если хочешь: всегда 1 при любом ответе — скажи
  const ans = lastAnswer == null ? null : normStr(lastAnswer);
  const updatedAt = toLocalIsoWithOffset(new Date());

  await execSql(
    `
    INSERT INTO user_progress
      (device_id, module_id, lesson_id, task_id, completed, score, last_answer, updated_at, synced)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(device_id, task_id) DO UPDATE SET
      module_id=excluded.module_id,
      lesson_id=excluded.lesson_id,
      completed=MAX(user_progress.completed, excluded.completed),
      score=MAX(user_progress.score, excluded.score),
      last_answer=excluded.last_answer,
      updated_at=excluded.updated_at,
      synced=0
    ;
    `,
    [dev, moduleId, lessonId, tId, completed, s, ans, updatedAt]
  );
}

export async function saveTaskAttempt(attempt: TaskAttempt): Promise<void> {
  await ensureTables();

  const dev = normStr(attempt.deviceId).trim() || "device-unknown";
  const moduleId = normStr(attempt.moduleId);
  const lessonId = normStr(attempt.lessonId);
  const taskId = normStr(attempt.taskId);
  const answerText = normStr(attempt.answerText);
  const score = clamp01(attempt.score);
  const isCorrect = attempt.isCorrect ? 1 : 0;
  const createdAt = attempt.createdAt ? String(attempt.createdAt) : toLocalIsoWithOffset(new Date());

  await execSql(
    `
    INSERT INTO task_attempts
      (device_id, module_id, lesson_id, task_id, answer_text, score, is_correct, created_at, synced)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 0);
    `,
    [dev, moduleId, lessonId, taskId, answerText, score, isCorrect, createdAt]
  );

  await markTaskCompleted(dev, taskId, score, answerText, moduleId, lessonId);
}

export async function getCompletedTaskIdsForUser(deviceId: string): Promise<string[]> {
  await ensureTables();

  const dev = normStr(deviceId).trim() || "device-unknown";
  const rows = (await execSql(
    `SELECT task_id FROM user_progress WHERE device_id = ? AND completed = 1;`,
    [dev]
  )) as any[];

  return rows.map((r) => String(r.task_id));
}

export async function getUnsyncedProgress(deviceId: string): Promise<UnsyncedProgressRow[]> {
  await ensureTables();

  const dev = normStr(deviceId).trim() || "device-unknown";
  const rows = (await execSql(
    `
    SELECT device_id, module_id, lesson_id, task_id, completed, score, last_answer, updated_at
    FROM user_progress
    WHERE device_id = ? AND synced = 0
    ORDER BY updated_at ASC;
    `,
    [dev]
  )) as any[];

  return rows as UnsyncedProgressRow[];
}

export async function markProgressSynced(deviceId: string, taskIds: string[]): Promise<void> {
  await ensureTables();

  const dev = normStr(deviceId).trim() || "device-unknown";
  if (!taskIds.length) return;

  const chunkSize = 200;
  for (let i = 0; i < taskIds.length; i += chunkSize) {
    const chunk = taskIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");

    await execSql(
      `
      UPDATE user_progress
      SET synced = 1
      WHERE device_id = ? AND task_id IN (${placeholders});
      `,
      [dev, ...chunk]
    );
  }
}
