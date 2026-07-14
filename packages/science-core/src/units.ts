export type UnitKind = "length" | "mass" | "time" | "temperature" | "amount" | "current" | "voltage" | "velocity" | "acceleration" | "dimensionless";

export interface UnitDefinition {
  symbol: string;
  titleRu: string;
  kind: UnitKind;
  siFactor?: number;
}

export interface Measurement {
  value: number;
  unit: string;
  uncertainty?: number;
}

export const foundationUnits: UnitDefinition[] = [
  { symbol: "m", titleRu: "meter", kind: "length", siFactor: 1 },
  { symbol: "s", titleRu: "second", kind: "time", siFactor: 1 },
  { symbol: "kg", titleRu: "kilogram", kind: "mass", siFactor: 1 },
  { symbol: "mol", titleRu: "mole", kind: "amount", siFactor: 1 },
  { symbol: "C", titleRu: "degree Celsius", kind: "temperature" },
];
