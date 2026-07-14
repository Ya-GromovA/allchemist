import type { ChildProgressSummary, ParentCabinetSummary, TeacherCabinetSummary } from "./types";
import type { HttpClient } from "./http";

export function createCabinetClient(http: HttpClient) {
  return {
    getTeacherOverview() { return http.get<TeacherCabinetSummary>("/cabinet/teacher/overview"); },
    getTeacherClasses() { return http.get<Record<string, unknown>>("/cabinet/teacher/classes"); },
    resetStudentDevices(studentUserId: string, payload: Record<string, unknown> = {}) {
      return http.post<Record<string, unknown>>(`/cabinet/teacher/students/${encodeURIComponent(studentUserId)}/devices/reset`, payload);
    },
    getParentOverview() { return http.get<ParentCabinetSummary>("/cabinet/parent/overview"); },
    getChildProgress(childId: string, weakTopics?: string) {
      return http.get<ChildProgressSummary>(`/cabinet/parent/children/${encodeURIComponent(childId)}/progress`, { query: { weakTopics } });
    },
    startLiveSession(params: { title?: string; moduleId: string; lessonId?: string }) {
      return http.post<Record<string, unknown>>("/cabinet/teacher/live/session/start", undefined, { query: params });
    },
    getLiveSession(sessionId: string) {
      return http.get<Record<string, unknown>>(`/cabinet/teacher/live/session/${encodeURIComponent(sessionId)}`);
    },
    closeLiveSession(sessionId: string) {
      return http.post<Record<string, unknown>>(`/cabinet/teacher/live/session/${encodeURIComponent(sessionId)}/close`);
    },
    joinLive(params: { joinCode: string; classroom: string }) {
      return http.post<Record<string, unknown>>("/cabinet/live/join", undefined, { query: params });
    },
    getNotifications(limit = 20) {
      return http.get<Record<string, unknown>>("/notifications/inbox", { query: { limit } });
    },
  };
}
