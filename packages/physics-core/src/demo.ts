import type { GraphDefinition, PhysicsLaw, PhysicsProblem } from "./types";

export const uniformlyAcceleratedMotionLaw: PhysicsLaw = {
  id: "law_uniformly_accelerated_motion",
  titleRu: "Uniformly accelerated motion",
  formulas: [
    { id: "formula_velocity", expression: "v = v0 + a * t", variables: ["v", "v0", "a", "t"], sourceIds: ["demo_source_school_physics"] },
    { id: "formula_position", expression: "s = v0 * t + a * t^2 / 2", variables: ["s", "v0", "a", "t"], sourceIds: ["demo_source_school_physics"] },
  ],
  variables: [
    { symbol: "t", labelRu: "time", unit: "s", min: 0, max: 20, step: 0.5, defaultValue: 5 },
    { symbol: "v0", labelRu: "initial velocity", unit: "m/s", min: -20, max: 20, step: 1, defaultValue: 0 },
    { symbol: "a", labelRu: "acceleration", unit: "m/s^2", min: -10, max: 10, step: 0.5, defaultValue: 2 },
    { symbol: "v", labelRu: "velocity", unit: "m/s" },
    { symbol: "s", labelRu: "displacement", unit: "m" },
  ],
  sourceIds: ["demo_source_school_physics"],
};

export const uniformlyAcceleratedMotionGraphs: GraphDefinition[] = [
  { id: "graph_x_t", titleRu: "x(t)", x: "t", y: "x" },
  { id: "graph_v_t", titleRu: "v(t)", x: "t", y: "v" },
  { id: "graph_a_t", titleRu: "a(t)", x: "t", y: "a" },
];

export const velocityAfterFiveSecondsTask: PhysicsProblem = {
  id: "task_velocity_after_5s",
  promptRu: "Find velocity after 5 seconds when v0 = 0 m/s and a = 2 m/s^2.",
  expectedVariable: "v",
  expectedValue: 10,
  tolerance: 0.01,
  unit: "m/s",
};
