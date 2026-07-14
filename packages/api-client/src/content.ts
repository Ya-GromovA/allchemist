import type { ExamKind, LessonBlock, TaskItem } from "./types";
import type { HttpClient } from "./http";

export function createContentClient(http: HttpClient) {
  return {
    listModules() {
      return http.get<Record<string, unknown>>("/modules");
    },
    listPacks() {
      return http.get<Record<string, unknown>>("/content/packs");
    },
    getPack(packId: string) {
      return http.get<Record<string, unknown>>(`/content/pack/${encodeURIComponent(packId)}`);
    },
    getPlatformCatalog() {
      return http.get<Record<string, unknown>>("/content/platform-catalog");
    },
    getExamBlueprints() {
      return http.get<Record<string, unknown>>("/content/exams/blueprints");
    },
    generateExam(payload: { examType?: ExamKind | string; subject?: string; count?: number }) {
      return http.post<Record<string, unknown>>("/content/exams/generate", payload);
    },
    analyzeTicket(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/content/tickets/analyze", payload);
    },
    listLessonBlocks(params: { module_id?: string; lang?: "ru" | "en"; limit?: number; offset?: number } = {}) {
      return http.get<{ lesson_blocks: LessonBlock[]; count: number; limit: number; offset: number }>("/content/lesson-blocks", { query: params });
    },
    listTasks(params: { module_id?: string; lang?: "ru" | "en"; limit?: number; offset?: number } = {}) {
      return http.get<{ tasks: TaskItem[]; count: number; limit: number; offset: number }>("/content/tasks", { query: params });
    },
    getLatestApkMetadata() {
      return http.get<Record<string, unknown>>("/content/downloads/apk/latest/metadata", { auth: false });
    },
  };
}
