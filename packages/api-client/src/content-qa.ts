import type { ContentBlockTransitionRequest, ContentQaBlock, ContentQaEvent, ContentQaQueue, ContentQaSummary, ContentSource, ContentSourceUpsertRequest, PaginatedResponse } from "./types";
import type { HttpClient } from "./http";

export function createContentQaClient(http: HttpClient) {
  return {
    getSummary() {
      return http.get<ContentQaSummary>("/content/qa/summary", { auth: false });
    },
    listSources(params: { q?: string; licenseStatus?: string; limit?: number; offset?: number } = {}) {
      return http.get<PaginatedResponse<ContentSource>>("/content/qa/sources", { query: params });
    },
    upsertSource(payload: ContentSourceUpsertRequest) {
      return http.post<{ id: string; titleRu: string; statusLabelRu?: string }>("/content/qa/sources", payload);
    },
    listBlocks(params: { q?: string; subject?: string; publishStatus?: string; limit?: number; offset?: number } = {}) {
      return http.get<PaginatedResponse<ContentQaBlock>>("/content/qa/blocks", { query: params });
    },
    upsertBlock(payload: Partial<ContentQaBlock> & Record<string, unknown>) {
      return http.post<ContentQaBlock>("/content/qa/blocks", payload);
    },
    listQueues(params: { subject?: string; limit?: number } = {}) {
      return http.get<{ queues?: ContentQaQueue[]; items?: ContentQaQueue[] } & Record<string, unknown>>("/content/qa/queues", { query: params });
    },
    listBlockEvents(contentId: string, limit = 50) {
      return http.get<{ contentId: string; items: ContentQaEvent[]; limit: number }>(`/content/qa/blocks/${encodeURIComponent(contentId)}/events`, { query: { limit } });
    },
    transitionBlock(contentId: string, payload: ContentBlockTransitionRequest) {
      return http.post<ContentQaBlock>(`/content/qa/blocks/${encodeURIComponent(contentId)}/transition`, payload);
    },
  };
}
