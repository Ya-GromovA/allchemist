import type { ID, ISODateTime, SubjectKind } from "./common";
import type { SourceReference } from "./sources";

export type VerificationStatus = "unverified" | "draft" | "methodist_review" | "scientific_review" | "verified" | "rejected";
export type DataConfidenceLevel = "low" | "medium" | "high" | "source_backed" | "expert_verified";
export type VisualizationFidelity = "schematic" | "educational_model" | "approximate" | "measured" | "scientific_model";
export type GradeLevel = "5" | "6" | "7" | "8" | "9" | "10" | "11" | "university_intro" | string;
export type CurriculumTag = string;
export type MeasurementUnit = string;

export interface ScientificSourceRef extends SourceReference {
  factId?: ID;
  accessedAt?: ISODateTime;
}

export interface ScientificFact {
  id: ID;
  subject: SubjectKind;
  statementRu: string;
  sourceRefs: ScientificSourceRef[];
  verificationStatus: VerificationStatus;
  confidence: DataConfidenceLevel;
  gradeLevels?: GradeLevel[];
  curriculumTags?: CurriculumTag[];
}

export interface VerifiedVisualMetadata {
  sourceRefs: ScientificSourceRef[];
  verificationStatus: VerificationStatus;
  confidence: DataConfidenceLevel;
  fidelity: VisualizationFidelity;
  lastReviewedAt?: ISODateTime;
}
