import type { ID, FutureRequired } from "./common";
import type { ScientificSourceRef, VerificationStatus, VerifiedVisualMetadata } from "./science";

export type ChemicalFormula = string;
export type ChemicalEquation = string;
export type SubstanceState = "solid" | "liquid" | "gas" | "aqueous" | "plasma" | "unknown";
export type SubstanceHazard = "none" | "irritant" | "toxic" | "corrosive" | "flammable" | "oxidizer" | "environmental" | "unknown";
export type ReactionPackStatus = "draft" | "review" | "approved" | "published" | "archived";
export type ReactionSafetyStatus = "safe_for_school" | "teacher_only" | "demo_only" | "restricted" | "unknown";

export interface Substance {
  id: ID;
  nameRu: string;
  formula?: ChemicalFormula;
  state?: SubstanceState;
  hazards?: SubstanceHazard[];
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface ReactionCondition {
  temperatureC?: number;
  pressureKpa?: number;
  catalyst?: string;
  solvent?: string;
  heating?: boolean;
  cooling?: boolean;
  sourceRefs?: ScientificSourceRef[];
}

export interface SolutionAppearance extends VerifiedVisualMetadata {
  colorNameRu: string;
  colorHex?: string;
  condition?: string;
}

export interface PrecipitateAppearance extends VerifiedVisualMetadata {
  substanceId: ID;
  colorNameRu?: string;
  appearanceRu?: string;
  intensity?: "low" | "medium" | "high";
}

export interface GasObservation extends VerifiedVisualMetadata {
  gasSubstanceId: ID;
  bubblesVisible: boolean;
  intensity?: "low" | "medium" | "high";
  safetyNoteRu?: string;
}

export interface OdorNote extends VerifiedVisualMetadata {
  // Odor must stay text/safety metadata only. It must not drive a fake visual effect.
  labelRu: string;
  safetyNoteRu?: string;
}

export interface PHValue extends VerifiedVisualMetadata {
  value?: number;
  range?: [number, number];
  indicatorColorNameRu?: string;
}

export interface ReactionObservation {
  solutionAppearance?: SolutionAppearance;
  precipitate?: PrecipitateAppearance;
  gas?: GasObservation;
  odorNote?: OdorNote;
  ph?: PHValue;
  heatEffect?: FutureRequired<"heating" | "cooling" | "neutral">;
}

export interface Reaction {
  id: ID;
  titleRu?: string;
  equation: ChemicalEquation;
  reactants: Substance[];
  products: Substance[];
  conditions?: ReactionCondition[];
  observations?: ReactionObservation[];
  safetyStatus?: ReactionSafetyStatus;
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface Molecule {
  id: ID;
  name: string;
  formula: ChemicalFormula;
  atoms: Array<Record<string, unknown>>;
  modelRef?: MoleculeModelRef;
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface MoleculeModelRef {
  assetId?: ID;
  format?: "glb" | "gltf" | "pdb" | "mol" | "sdf" | "generated";
  url?: string;
}

export interface PeriodicElement {
  atomicNumber: number;
  symbol: string;
  nameRu: string;
  atomicMass?: string;
  group?: number;
  period?: number;
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface ReactionPack {
  packId: ID;
  titleRu: string;
  status: ReactionPackStatus;
  reactions: Reaction[];
  sourceRefs: ScientificSourceRef[];
}
