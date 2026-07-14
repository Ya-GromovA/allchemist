import type { HttpClient } from "./http";

export function createPhysicsClient(_http: HttpClient) {
  return {
    futureRequired: [
      "physics simulation list/detail endpoints",
      "graph/formula model endpoints",
      "simulation pack endpoints",
    ] as const,
  };
}
