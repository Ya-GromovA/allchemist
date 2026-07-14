import type { ScientificObservation } from "./types";
import { isVerified } from "./verification";

export interface VisualizationGuardrailResult {
  allowed: boolean;
  reason?: string;
}

export function evaluateVisualizationGuardrail(observation: ScientificObservation): VisualizationGuardrailResult {
  if (observation.type === "text_only") return { allowed: true };
  if (!isVerified(observation.metadata)) {
    return { allowed: false, reason: "Scientific visualization must be source-backed and verified." };
  }
  return { allowed: true };
}
