import type { ID } from "./common";
import type { MeasurementUnit, ScientificSourceRef, VerificationStatus } from "./science";

export interface PhysicsVariable {
  symbol: string;
  labelRu: string;
  unit: MeasurementUnit;
  value?: number;
}

export interface PhysicsFormula {
  id: ID;
  expression: string;
  variables: PhysicsVariable[];
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface SimulationParameter extends PhysicsVariable {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

export interface SimulationState {
  time?: number;
  values: Record<string, number>;
}

export interface GraphDefinition {
  id: ID;
  titleRu: string;
  x: PhysicsVariable;
  y: PhysicsVariable;
}

export interface GraphSeries {
  graphId: ID;
  points: Array<{ x: number; y: number }>;
}

export interface PhysicsSimulation {
  id: ID;
  titleRu: string;
  topic: string;
  formulas: PhysicsFormula[];
  parameters: SimulationParameter[];
  initialState: SimulationState;
  graphs?: GraphDefinition[];
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface PhysicsExperiment {
  id: ID;
  simulationId?: ID;
  titleRu: string;
  expectedObservationRu?: string;
}

export interface PhysicsResultExplanation {
  textRu: string;
  formulaRefs?: ID[];
  graphRefs?: ID[];
}

export interface PhysicsSimulationPack {
  packId: ID;
  titleRu: string;
  simulations: PhysicsSimulation[];
}
