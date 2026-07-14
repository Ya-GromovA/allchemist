import type { Substance } from "./types";

export function substanceLabel(substance: Substance): string {
  return substance.formula ? `${substance.nameRu} (${substance.formula})` : substance.nameRu;
}

export function requiresSafetyNote(substance: Substance): boolean {
  return substance.hazardKinds.some((kind) => kind !== "none");
}
