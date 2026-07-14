export type ChemicalState = "solid" | "liquid" | "gas" | "aqueous" | "unknown";
export type HazardKind = "acid" | "base" | "flammable" | "toxic" | "corrosive" | "irritant" | "gas" | "none";
export type ObservationKind = "gas_bubbles" | "temperature_rise" | "temperature_drop" | "color_change" | "precipitate" | "ph_change" | "text";

export interface Substance {
  id: string;
  nameRu: string;
  formula: string;
  state?: ChemicalState;
  hazardKinds: HazardKind[];
  moleculeRef?: string;
  sourceIds: string[];
}

export interface Reagent {
  substanceId: string;
  amount?: { value: number; unit: "g" | "ml" | "mol" | "drop" };
  concentration?: { value: number; unit: "M" | "%" };
}

export interface ChemicalEquation {
  raw: string;
  reactants: Array<{ formula: string; coefficient: number }>;
  products: Array<{ formula: string; coefficient: number }>;
}

export interface ReactionObservation {
  kind: ObservationKind;
  labelRu: string;
  verified: boolean;
  payload?: Record<string, unknown>;
}

export interface Reaction {
  id: string;
  titleRu: string;
  equation: ChemicalEquation;
  reagents: Reagent[];
  products: string[];
  hazards: HazardKind[];
  observations: ReactionObservation[];
  sourceIds: string[];
  verificationStatus: "draft" | "review" | "verified";
}
