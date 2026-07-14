import type { GraphDefinition, PhysicsLaw, PhysicsProblem } from "@allchemist/physics-core";

export interface SimulationScenario {
  id: string;
  law: PhysicsLaw;
  graphs: GraphDefinition[];
  task?: PhysicsProblem;
  defaultParameters: Record<string, number>;
}

export interface SimulationPoint {
  t: number;
  x: number;
  v: number;
  a: number;
}

export interface SimulationResult {
  points: SimulationPoint[];
  final: SimulationPoint;
}

export interface SimulationValidationResult {
  ok: boolean;
  expected?: number;
  actual?: number;
  message?: string;
}
