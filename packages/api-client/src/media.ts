import type { HttpClient } from "./http";

export function createMediaClient(_http: HttpClient) {
  return {
    futureRequired: [
      "media asset registry endpoints",
      "Rive/Lottie/GLB metadata endpoints",
      "asset processing status endpoints",
    ] as const,
  };
}
