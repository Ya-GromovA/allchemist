import type { ID } from "./common";
import type { ScientificSourceRef, VerificationStatus } from "./science";

export type TissueType = "epithelial" | "connective" | "muscle" | "nervous" | "plant" | "other";
export type OrganSystem = "digestive" | "respiratory" | "circulatory" | "nervous" | "musculoskeletal" | "plant" | "other";
export type FocusState = "blurred" | "partial" | "focused";

export interface MicroscopeZoomLevel {
  magnification: number;
  labelRu?: string;
  visibleLabels?: string[];
}

export interface MicroscopeSample {
  id: ID;
  titleRu: string;
  tissueType?: TissueType;
  preparationRu?: string;
  stainRu?: string;
  zoomLevels: MicroscopeZoomLevel[];
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface BiologicalObject {
  id: ID;
  nameRu: string;
  type: "cell" | "tissue" | "organ" | "organism" | "molecule" | "other";
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface CellStructure extends BiologicalObject {
  type: "cell";
  organelles?: Array<{ id: ID; nameRu: string; functionRu?: string }>;
}

export interface BiologyObservation {
  id: ID;
  sampleId?: ID;
  objectId?: ID;
  textRu: string;
  focusState?: FocusState;
  zoom?: number;
  sourceRefs?: ScientificSourceRef[];
  verificationStatus?: VerificationStatus;
}

export interface AnatomyModelRef {
  assetId: ID;
  organSystem?: OrganSystem;
  format?: "glb" | "gltf" | "image" | "other";
}

export interface BiologyLabPack {
  packId: ID;
  titleRu: string;
  samples?: MicroscopeSample[];
  observations?: BiologyObservation[];
  anatomyModels?: AnatomyModelRef[];
}
