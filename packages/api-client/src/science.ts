import type { HttpClient } from "./http";

export function createScienceClient(_http: HttpClient) {
  return {
    futureRequired: [
      "typed lab scene endpoints",
      "source-backed scientific fact endpoints",
      "verification metadata endpoints",
    ] as const,
  };
}
