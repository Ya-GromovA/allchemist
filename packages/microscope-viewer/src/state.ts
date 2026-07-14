import type { BiologyScenario } from "@allchemist/biology-core";
import type { MicroscopeValidationResult, MicroscopeViewportState } from "./types";

export function createMicroscopeState(scenario: BiologyScenario): MicroscopeViewportState {
  return {
    scenarioId: scenario.id,
    magnification: scenario.specimen.magnifications[0] ?? 40,
    focus: 0.5,
    brightness: 0.7,
    condenser: 0.5,
    selectedLabelIds: [],
  };
}

export function selectMicroscopeLabel(state: MicroscopeViewportState, labelId: string): MicroscopeViewportState {
  return state.selectedLabelIds.includes(labelId)
    ? state
    : { ...state, selectedLabelIds: [...state.selectedLabelIds, labelId] };
}

export function validateObservation(scenario: BiologyScenario, state: MicroscopeViewportState): MicroscopeValidationResult {
  const ok = state.selectedLabelIds.includes(scenario.task.targetStructureId);
  return {
    ok,
    message: ok ? "Target structure selected." : "Target structure is not selected yet.",
  };
}
