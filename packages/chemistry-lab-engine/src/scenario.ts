import { zincHydrochloricAcidReaction } from "../../chemistry-core/src";
import type { LabScenario, LabState } from "./types";

export const zincHydrochloricAcidLabScenario: LabScenario = {
  id: "lab_zn_hcl_hydrogen_demo",
  slug: "zinc-hcl",
  titleRu: "Реакция Zn + HCl",
  subtitleRu: "Интерактивная лаборатория: выделение водорода при реакции цинка с соляной кислотой.",
  reaction: zincHydrochloricAcidReaction,
  equationRu: "Zn + 2HCl -> ZnCl2 + H2",
  safetyStatus: "needs_safety_review",
  publicationAllowed: false,
  sourceIds: ["demo_source_general_chemistry"],
  safety: [
    "Надеть защитные очки и перчатки перед началом.",
    "Работать с HCl только под контролем учителя.",
    "Не подносить источник огня к выделяющемуся газу.",
    "Сценарий является черновиком и требует методической проверки.",
  ],
  reagents: [
    { id: "zn", labelRu: "Цинк", formula: "Zn", role: "reactant" },
    { id: "hcl", labelRu: "Соляная кислота", formula: "HCl", role: "reactant", hazardNoteRu: "Кислота, требуется PPE." },
    { id: "zncl2", labelRu: "Хлорид цинка", formula: "ZnCl2", role: "product" },
    { id: "h2", labelRu: "Водород", formula: "H2", role: "product", hazardNoteRu: "Горючий газ." },
  ],
  observations: [
    {
      id: "gas_bubbles",
      labelRu: "Пузырьки газа",
      explanationRu: "После добавления кислоты на поверхности цинка появляются пузырьки водорода.",
      coreKind: "gas_bubbles",
      verified: false,
    },
    {
      id: "temperature_rise",
      labelRu: "Небольшой нагрев",
      explanationRu: "Смесь может слегка нагреваться во время реакции.",
      coreKind: "temperature_rise",
      verified: false,
    },
    {
      id: "acidic_environment",
      labelRu: "Кислая среда",
      explanationRu: "pH-индикатор показывает кислую среду до нейтрализации избытка кислоты.",
      coreKind: "ph_change",
      verified: false,
    },
  ],
  steps: [
    {
      id: "safety",
      titleRu: "Надеть защиту",
      descriptionRu: "Очки и перчатки обязательны до работы с кислотой.",
      expectedAction: "START_LAB",
      targetPhase: "safety",
    },
    {
      id: "add_zinc",
      titleRu: "Добавить Zn",
      descriptionRu: "Поместить гранулу цинка в колбу.",
      expectedAction: "ADD_REAGENT",
      reagentId: "zn",
      targetPhase: "zinc_added",
    },
    {
      id: "add_hcl",
      titleRu: "Добавить HCl",
      descriptionRu: "Аккуратно добавить раствор соляной кислоты.",
      expectedAction: "ADD_REAGENT",
      reagentId: "hcl",
      targetPhase: "reacting",
      observationId: "gas_bubbles",
    },
    {
      id: "observe",
      titleRu: "Наблюдать газ",
      descriptionRu: "Зафиксировать пузырьки газа и небольшой нагрев.",
      expectedAction: "OBSERVE",
      targetPhase: "observation",
      observationId: "temperature_rise",
    },
    {
      id: "check_ph",
      titleRu: "Проверить pH",
      descriptionRu: "Отметить кислую среду индикатором.",
      expectedAction: "CHECK_PH",
      targetPhase: "observation",
      observationId: "acidic_environment",
    },
    {
      id: "conclusion",
      titleRu: "Сделать вывод",
      descriptionRu: "Цинк вытесняет водород из кислоты, образуется ZnCl2 и H2.",
      expectedAction: "COMPLETE_STEP",
      targetPhase: "completed",
    },
  ],
  explanation: {
    gasRu: "Выделяется водород H2.",
    whyBubblesRu: "Пузырьки видны, потому что молекулы H2 покидают раствор в виде газа.",
    molecularRu: "Атомы Zn переходят в раствор как ионы цинка, а ионы водорода восстанавливаются до H2.",
  },
};

export function createInitialLabState(scenario: LabScenario): LabState {
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
