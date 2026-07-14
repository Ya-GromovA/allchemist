import type { ID, ProgressSync, ProgressSyncResponse } from "./types";
import type { HttpClient } from "./http";

export function createProgressClient(http: HttpClient) {
  return {
    sync(payload: ProgressSync) {
      return http.post<ProgressSyncResponse>("/progress/sync", payload, { auth: false });
    },
    pull(deviceId: ID, limit = 500) {
      return http.get<Array<Record<string, unknown>>>(`/progress/pull/${encodeURIComponent(deviceId)}`, { query: { limit }, auth: false });
    },
    getAnalytics(deviceId: ID, params: { lang?: "ru" | "en"; module_id?: string; days?: number } = {}) {
      return http.get<Record<string, unknown>>(`/progress/analytics/${encodeURIComponent(deviceId)}`, { query: params, auth: false });
    },
  };
}
