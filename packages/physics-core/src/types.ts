export interface PhysicsVariable {
  symbol: string;
  labelRu: string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

export interface PhysicsFormula {
  id: string;
  expression: string;
  variables: string[];
  sourceIds: string[];
}

export interface GraphDefinition {
  id: string;
  titleRu: string;
  x: string;
  y: string;
}

export interface PhysicsLaw {
  id: string;
  titleRu: string;
  formulas: PhysicsFormula[];
  variables: PhysicsVariable[];
  sourceIds: string[];
}

export interface PhysicsProblem {
  id: string;
  promptRu: string;
  expectedVariable: string;
  expectedValue: number;
  tolerance: number;
  unit: string;
}
