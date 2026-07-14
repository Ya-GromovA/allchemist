import type { ContentSource, PaginatedResponse } from "./types";
import type { HttpClient } from "./http";

export function createSourcesClient(http: HttpClient) {
  return {
    listSources(params: { q?: string; licenseStatus?: string; limit?: number; offset?: number } = {}) {
      return http.get<PaginatedResponse<ContentSource>>("/content/qa/sources", { query: params });
    },
  };
}
