import NetInfo from "@react-native-community/netinfo";
import {
  getUnsyncedProgress,
  markProgressSynced,
  UnsyncedProgressRow
} from "@app/db/userProgressRepository";
import { getDeviceId } from "@app/services/deviceId";
import { API_BASE_URL } from "@app/config/api";

function toLocalIsoWithOffset(d: Date): string {
  const pad = (x: number) => String(x).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

export type SyncResult = {
  ok: boolean;
  pushed: number;
  reason?: string;
};

export async function syncProgressOnce(): Promise<SyncResult> {
  const deviceId = await getDeviceId();

  const net = await NetInfo.fetch();
  const online = !!net.isConnected && net.isInternetReachable !== false;
  if (!online) return { ok: false, pushed: 0, reason: "offline" };

  const rows = await getUnsyncedProgress(deviceId);
  if (!rows.length) return { ok: true, pushed: 0 };

  const payload = {
    device_id: deviceId,
    items: rows.map((r: UnsyncedProgressRow) => ({
      device_id: r.device_id,
      module_id: r.module_id,
      lesson_id: r.lesson_id ?? "",
      task_id: r.task_id,
      completed: Number(r.completed) ? 1 : 0,
      score: Number(r.score) || 0,
      last_answer: r.last_answer ?? null,
      updated_at: r.updated_at && String(r.updated_at).trim().length ? r.updated_at : toLocalIsoWithOffset(new Date())
      // Если захочешь “восстанавливать локальное время” красиво на сервере:
      // client_offset_min: -new Date().getTimezoneOffset()
    }))
  };

  try {
    const res = await fetch(`${API_BASE_URL}/progress/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, pushed: 0, reason: `HTTP ${res.status} ${txt}` };
    }

    const json = await res.json();

    const accepted: string[] =
      Array.isArray(json?.accepted_task_ids)
        ? json.accepted_task_ids
        : rows.map((r) => r.task_id);

    await markProgressSynced(deviceId, accepted);

    return { ok: true, pushed: accepted.length };
  } catch (e: any) {
    return { ok: false, pushed: 0, reason: e?.message || "network_error" };
  }
}
