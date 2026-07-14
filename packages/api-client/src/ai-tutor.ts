import type { AiTutorRequest, AiTutorResponse } from "./types";
import type { HttpClient } from "./http";

export function createAiTutorClient(http: HttpClient) {
  return {
    ask(payload: AiTutorRequest) {
      return http.post<AiTutorResponse>("/ai-mentor/ask", payload);
    },
    health() {
      return http.get<Record<string, unknown>>("/ai-mentor/health", { auth: false });
    },
    nextTask(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/ai-mentor/next-task", payload);
    },
    generateTask(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/ai-mentor/generate-task", payload);
    },
  };
}
