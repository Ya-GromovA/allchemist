import type { Molecule, Reaction } from "./types";
import type { HttpClient } from "./http";

export function createChemistryClient(http: HttpClient) {
  return {
    getChemistryLayerReport() {
      return http.get<Record<string, unknown>>("/content/layers/chemistry/report", { auth: false });
    },
    listMolecules(limit = 500) {
      return http.get<{ molecules: Molecule[]; count: number }>("/content/molecules", { query: { limit }, auth: false });
    },
    listReactions(limit = 500) {
      return http.get<{ reactions: Reaction[]; count: number }>("/content/reactions", { query: { limit }, auth: false });
    },
  };
}
