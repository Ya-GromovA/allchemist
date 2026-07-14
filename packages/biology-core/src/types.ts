export interface BiologicalStructure {
  id: string;
  labelRu: string;
  descriptionRu?: string;
  sourceIds: string[];
}

export interface Specimen {
  id: string;
  titleRu: string;
  preparationRu?: string;
  magnifications: number[];
  structures: BiologicalStructure[];
  sourceIds: string[];
}

export interface ObservationTask {
  id: string;
  promptRu: string;
  targetStructureId: string;
}

export interface BiologyScenario {
  id: string;
  specimen: Specimen;
  task: ObservationTask;
}
