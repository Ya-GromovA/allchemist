import type { HttpClient } from "./http";

export function createBiologyClient(_http: HttpClient) {
  return {
    futureRequired: [
      "microscope sample endpoints",
      "cell/anatomy model endpoints",
      "biology lab pack endpoints",
    ] as const,
  };
}
