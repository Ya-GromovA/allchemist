import type { HttpClient } from "./http";

export function createAnalyticsClient(_http: HttpClient) {
  return {
    futureRequired: [
      "owner analytics endpoints",
      "revenue/conversion/retention endpoints",
      "platform health metric endpoints",
    ] as const,
  };
}
