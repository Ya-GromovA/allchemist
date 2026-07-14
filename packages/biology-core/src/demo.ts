import type { BiologyScenario } from "./types";

export const onionSkinScenario: BiologyScenario = {
  id: "bio_onion_skin_microscope_demo",
  specimen: {
    id: "specimen_onion_skin",
    titleRu: "Onion epidermis",
    preparationRu: "Thin onion epidermis sample on slide.",
    magnifications: [40, 100, 400],
    sourceIds: ["demo_source_school_biology"],
    structures: [
      { id: "cell_wall", labelRu: "Cell wall", descriptionRu: "Rigid outer boundary of plant cells.", sourceIds: ["demo_source_school_biology"] },
      { id: "cytoplasm", labelRu: "Cytoplasm", sourceIds: ["demo_source_school_biology"] },
      { id: "nucleus", labelRu: "Nucleus", sourceIds: ["demo_source_school_biology"] },
      { id: "vacuole", labelRu: "Vacuole", sourceIds: ["demo_source_school_biology"] },
    ],
  },
  task: {
    id: "task_find_cell_wall",
    promptRu: "Find the cell wall.",
    targetStructureId: "cell_wall",
  },
};
