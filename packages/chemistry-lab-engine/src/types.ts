import type { Reaction, ReactionObservation } from "../../chemistry-core/src";

export type LabActionType = "START_LAB" | "ADD_REAGENT" | "START_REACTION" | "OBSERVE" | "CHECK_PH" | "COMPLETE_STEP" | "RESET_LAB";
export type LabPhase = "idle" | "safety" | "zinc_added" | "acid_added" | "reacting" | "observation" | "completed" | "error";
export type LabSafetyStatus = "needs_safety_review" | "reviewed" | "approved";
export type LabObservationId = "gas_bubbles" | "temperature_rise" | "acidic_environment";

export interface LabReagentConfig {
  id: string;
  labelRu: string;
  formula: string;
  role: "reactant" | "product" | "indicator";
  hazardNoteRu?: string;
}

export interface LabStep {
  id: string;
  titleRu: string;
  descriptionRu: string;
  expectedAction: LabActionType;
  reagentId?: string;
  targetPhase: LabPhase;
  observationId?: LabObservationId;
}

export interface LabObservation {
  id: LabObservationId;
  labelRu: string;
  explanationRu: string;
  coreKind: ReactionObservation["kind"];
  verified: boolean;
}

export interface LabScenario {
  id: string;
  slug: string;
  titleRu: string;
  subtitleRu: string;
  reaction: Reaction;
  equationRu: string;
  safetyStatus: LabSafetyStatus;
  publicationAllowed: boolean;
  sourceIds: string[];
  safety: string[];
  reagents: LabReagentConfig[];
  observations: LabObservation[];
  steps: LabStep[];
  explanation: {
    gasRu: string;
    whyBubblesRu: string;
    molecularRu: string;
  };
}

export interface LabState {
  scenarioId: string;
  phase: LabPhase;
  completedStepIds: string[];
  currentStepId: string;
  addedReagentIds: string[];
  observations: LabObservationId[];
  warnings: string[];
  safetyAcknowledged: boolean;
  concluded: boolean;
  errorMessage?: string;
}

export interface LabAction {
  type: LabActionType;
  stepId?: string;
  reagentId?: string;
  note?: string;
}

export interface LabValidationResult {
  ok: boolean;
  message?: string;
  completedScenario?: boolean;
}
