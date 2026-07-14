import type { HttpClient } from "./http";

export function createAdminClient(http: HttpClient) {
  return {
    getDashboardSummary() { return http.get<Record<string, unknown>>("/admin/dashboard/summary"); },
    getDashboardActivity(period = 7) { return http.get<Record<string, unknown>>("/admin/dashboard/activity", { query: { period } }); },
    getSubjectsActivity() { return http.get<Record<string, unknown>>("/admin/dashboard/subjects-activity"); },
    getSchoolsMap(region?: string) { return http.get<Record<string, unknown>>("/admin/dashboard/schools-map", { query: { region } }); },
    getAttention() { return http.get<Record<string, unknown>>("/admin/dashboard/attention"); },
    getActivityTotals() { return http.get<Record<string, unknown>>("/admin/dashboard/activity-totals"); },
    search(q: string, limit = 20) { return http.get<Record<string, unknown>>("/admin/search", { query: { q, limit } }); },
    getRecentEvents(limit = 8) { return http.get<Record<string, unknown>>("/admin/events/recent", { query: { limit } }); },
    getDirectory(section: string, params: { limit?: number; query?: string } = {}) { return http.get<Record<string, unknown>>(`/admin/directory/${encodeURIComponent(section)}`, { query: params }); },
    getSecurityChecklist() { return http.get<Record<string, unknown>>("/admin/security/checklist"); },
    getSecurityAlerts(params: { acked?: string; severity?: string } = {}) { return http.get<Record<string, unknown>>("/admin/security/alerts", { query: params }); },
    getAudit(params: { limit?: number; offset?: number; action?: string; targetUserId?: string } = {}) { return http.get<Array<Record<string, unknown>>>("/admin/audit", { query: params }); },
    getDatabaseOverview() { return http.get<Record<string, unknown>>("/admin/database/overview"); },
  };
}
