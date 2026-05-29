// /root/synapse/mobile/app/services/backgroundTasks.ts
import { AppState, AppStateStatus } from "react-native";
import { execSql } from "@app/db/database";
import { contentUpdateService } from "@app/services/contentUpdateService";

const KV_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_kv (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

async function kvGet(key: string): Promise<string | null> {
  await execSql(KV_TABLE_SQL);
  const rows = await execSql(`SELECT value FROM app_kv WHERE key=?;`, [key]);
  if (!rows.length) return null;
  return rows[0].value ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  await execSql(KV_TABLE_SQL);
  await execSql(
    `INSERT INTO app_kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value;`,
    [key, value]
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function hoursToMs(h: number): number {
  return Math.max(1, h) * 60 * 60 * 1000;
}

type StartOptions = {
  intervalHours?: number; // default 6
  runOnStart?: boolean;   // default true
};

export const backgroundTasks = (() => {
  let started = false;
  let timer: any = null;
  let appState: AppStateStatus = AppState.currentState;
  let appStateSub: { remove: () => void } | null = null;

  async function runUpdateGuarded(reason: string): Promise<void> {
    try {
      const lockKey = "content_update_lock";
      const lock = await kvGet(lockKey);
      // грубая защита от параллельных запусков
      if (lock === "1") return;

      await kvSet(lockKey, "1");
      await kvSet("content_update_last_reason", reason);
      await kvSet("content_update_last_start", nowIso());

      await contentUpdateService.checkForUpdatesAndApply();

      await kvSet("content_update_last_ok", nowIso());
    } catch (e) {
      await kvSet("content_update_last_error", String((e as any)?.message ?? e));
      await kvSet("content_update_last_error_at", nowIso());
    } finally {
      await kvSet("content_update_lock", "0");
    }
  }

  function onAppStateChange(nextState: AppStateStatus) {
    const wasBackground = appState === "inactive" || appState === "background";
    const isActive = nextState === "active";
    appState = nextState;

    if (wasBackground && isActive) {
      void runUpdateGuarded("app_foreground");
    }
  }

  async function start(opts?: StartOptions) {
    if (started) return;
    started = true;

    const intervalMs = hoursToMs(opts?.intervalHours ?? 6);
    const runOnStart = opts?.runOnStart ?? true;

    appStateSub = AppState.addEventListener("change", onAppStateChange);

    if (runOnStart) {
      void runUpdateGuarded("app_start");
    }

    timer = setInterval(() => {
      void runUpdateGuarded("interval");
    }, intervalMs);
  }

  async function stop() {
    if (!started) return;
    started = false;

    if (appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }

    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop };
})();
