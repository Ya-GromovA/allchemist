import { uniformlyAcceleratedMotionGraphs, uniformlyAcceleratedMotionLaw, velocityAfterFiveSecondsTask } from "@allchemist/physics-core";
import type { SimulationScenario } from "./types";

export const uniformlyAcceleratedMotionScenario: SimulationScenario = {
  id: "sim_uniformly_accelerated_motion_demo",
  law: uniformlyAcceleratedMotionLaw,
  graphs: uniformlyAcceleratedMotionGraphs,
  task: velocityAfterFiveSecondsTask,
  defaultParameters: {
    v0: 0,
    a: 2,
    duration: 5,
    step: 1,
  },
};
