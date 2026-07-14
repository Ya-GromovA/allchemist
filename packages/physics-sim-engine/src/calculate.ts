import type { SimulationResult, SimulationValidationResult } from "./types";

export function calculateUniformAcceleration(params: { v0: number; a: number; duration: number; step?: number }): SimulationResult {
  const step = params.step && params.step > 0 ? params.step : 1;
  const points = [];
  for (let t = 0; t <= params.duration + 1e-9; t += step) {
    points.push({
      t,
      x: params.v0 * t + (params.a * t * t) / 2,
      v: params.v0 + params.a * t,
      a: params.a,
    });
  }
  const final = points[points.length - 1];
  if (!final) throw new Error("Simulation produced no points.");
  return { points, final };
}

export function validateNumericAnswer(actual: number, expected: number, tolerance: number): SimulationValidationResult {
  const ok = Math.abs(actual - expected) <= tolerance;
  return {
    ok,
    expected,
    actual,
    message: ok ? "Answer is within tolerance." : "Answer is outside tolerance.",
  };
}
