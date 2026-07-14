export type HazardKind = "acid" | "base" | "flammable" | "toxic" | "glassware" | "heat" | "bio_sample" | "electrical" | "none";
export type SafetySeverity = "info" | "caution" | "warning" | "critical";

export interface SafetyRule {
  id: string;
  hazard: HazardKind;
  severity: SafetySeverity;
  instructionRu: string;
  requiredEquipment?: string[];
}

export function highestSafetySeverity(rules: SafetyRule[]): SafetySeverity {
  if (rules.some((rule) => rule.severity === "critical")) return "critical";
  if (rules.some((rule) => rule.severity === "warning")) return "warning";
  if (rules.some((rule) => rule.severity === "caution")) return "caution";
  return "info";
}
