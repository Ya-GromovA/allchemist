import type { LabScenario, LabState } from "../../../../packages/chemistry-lab-engine/src";

export interface ChemistryLabViewModel {
  title: string;
  subtitle: string;
  phaseLabel: string;
  progressPercent: number;
  currentStepTitle: string;
  aiTone: "hint" | "warning" | "success";
  aiTitle: string;
  aiBody: string;
  canStart: boolean;
  canAddZinc: boolean;
  canAddAcid: boolean;
  canObserve: boolean;
  canCheckPh: boolean;
  canComplete: boolean;
}

const phaseLabels: Record<LabState["phase"], string> = {
  idle: "Ожидает запуска",
  safety: "Защита подтверждена",
  zinc_added: "Цинк добавлен",
  acid_added: "Кислота добавлена",
  reacting: "Идёт реакция",
  observation: "Наблюдение",
  completed: "Лаборатория завершена",
  error: "Требуется исправить действие",
};

export function adaptChemistryLabScenario(scenario: LabScenario, state: LabState): ChemistryLabViewModel {
  const currentStep = scenario.steps.find((step) => step.id === state.currentStepId) ?? scenario.steps[0];
  const progressPercent = Math.round((state.completedStepIds.length / Math.max(1, scenario.steps.length)) * 100);
  const unsafeAction = state.phase === "error";
  const completed = state.phase === "completed";

  return {
    title: scenario.titleRu,
    subtitle: scenario.subtitleRu,
    phaseLabel: phaseLabels[state.phase],
    progressPercent,
    currentStepTitle: currentStep?.titleRu ?? "Сценарий",
    aiTone: completed ? "success" : unsafeAction ? "warning" : "hint",
    aiTitle: completed ? "Вывод готов" : unsafeAction ? "Проверь порядок действий" : "AI-наставник рядом",
    aiBody: completed
      ? "Реакция завершена: выделился водород, наблюдения сохранены как черновые."
      : unsafeAction
        ? state.errorMessage ?? "Начни с защиты и двигайся по шагам сценария."
        : "Сначала подтверди защиту, затем добавь Zn и только после этого HCl.",
    canStart: state.phase === "idle" || state.phase === "error",
    canAddZinc: state.currentStepId === "add_zinc" && state.safetyAcknowledged,
    canAddAcid: state.currentStepId === "add_hcl" && state.addedReagentIds.includes("zn"),
    canObserve: state.currentStepId === "observe" && state.observations.includes("gas_bubbles"),
    canCheckPh: state.currentStepId === "check_ph" && state.phase === "observation",
    canComplete: state.currentStepId === "conclusion" && state.observations.includes("acidic_environment"),
  };
}
