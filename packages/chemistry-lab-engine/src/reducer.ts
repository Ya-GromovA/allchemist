import type { LabAction, LabObservationId, LabPhase, LabScenario, LabState, LabValidationResult } from "./types";

function currentStep(scenario: LabScenario, state: LabState) {
  return scenario.steps.find((step) => step.id === state.currentStepId);
}

function stepAfter(scenario: LabScenario, stepId: string): string {
  const index = scenario.steps.findIndex((step) => step.id === stepId);
  return scenario.steps[index + 1]?.id ?? stepId;
}

function appendUnique<T>(items: T[], item?: T): T[] {
  if (!item || items.includes(item)) return items;
  return [...items, item];
}

function withError(state: LabState, message: string): LabState {
  return { ...state, phase: "error", errorMessage: message };
}

export function validateLabAction(scenario: LabScenario, state: LabState, action: LabAction): LabValidationResult {
  if (action.type === "RESET_LAB") return { ok: true };

  const step = currentStep(scenario, state);
  if (!step) return { ok: false, message: "Current step is missing." };
  if (action.type !== step.expectedAction) return { ok: false, message: `Expected ${step.expectedAction}.` };
  if (step.reagentId && action.reagentId !== step.reagentId) return { ok: false, message: `Expected reagent ${step.reagentId}.` };
  if (action.type !== "START_LAB" && !state.safetyAcknowledged) return { ok: false, message: "Safety equipment must be confirmed first." };
  return { ok: true, completedScenario: step.targetPhase === "completed" };
}

export function labReducer(scenario: LabScenario, state: LabState, action: LabAction): LabState {
  if (action.type === "RESET_LAB") return createResetState(scenario);

  const { errorMessage: _errorMessage, ...stateWithoutError } = state;
  const result = validateLabAction(scenario, state, action);
  if (!result.ok) return withError(state, result.message ?? "Invalid lab action.");

  const step = currentStep(scenario, state);
  if (!step) return withError(state, "Current step is missing.");

  const completedStepIds = appendUnique(state.completedStepIds, step.id);
  const observationIds =
    step.observationId === "gas_bubbles"
      ? appendUnique(appendUnique(state.observations, "gas_bubbles"), "temperature_rise")
      : appendUnique(state.observations, step.observationId);
  const nextStep = stepAfter(scenario, step.id);
  const phase: LabPhase = step.targetPhase;

  return {
    ...stateWithoutError,
    phase,
    completedStepIds,
    currentStepId: nextStep,
    addedReagentIds: action.reagentId ? appendUnique(state.addedReagentIds, action.reagentId) : state.addedReagentIds,
    observations: observationIds as LabObservationId[],
    safetyAcknowledged: state.safetyAcknowledged || action.type === "START_LAB",
    concluded: result.completedScenario ?? false,
  };
}

export function createResetState(scenario: LabScenario): LabState {
  const firstStep = scenario.steps[0];
  if (!firstStep) throw new Error("Lab scenario must contain at least one step.");
  return {
    scenarioId: scenario.id,
    phase: "idle",
    completedStepIds: [],
    currentStepId: firstStep.id,
    addedReagentIds: [],
    observations: [],
    warnings: scenario.safety,
    safetyAcknowledged: false,
    concluded: false,
  };
}
