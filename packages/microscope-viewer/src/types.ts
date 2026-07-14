import type { BiologyScenario } from "@allchemist/biology-core";

export interface MicroscopeViewportState {
  scenarioId: string;
  magnification: number;
  focus: number;
  brightness: number;
  condenser: number;
  selectedLabelIds: string[];
}

export interface MicroscopeValidationResult {
  ok: boolean;
  message?: string;
}

export interface MicroscopeScenarioRuntime {
  scenario: BiologyScenario;
  state: MicroscopeViewportState;
}
