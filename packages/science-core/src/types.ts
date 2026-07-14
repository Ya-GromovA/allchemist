export type ID = string;
export type Subject = "chemistry" | "physics" | "biology";
export type VerificationStatus = "unverified" | "draft" | "methodist_review" | "scientific_review" | "verified" | "rejected";
export type ObservationType = "color_change" | "gas" | "precipitate" | "temperature" | "motion" | "graph" | "microscope_label" | "text_only";

export interface SourceBackedMetadata {
  sourceIds: ID[];
  verificationStatus: VerificationStatus;
  confidence: "low" | "medium" | "high" | "expert_verified";
  lastReviewedAt?: string;
}

export interface ScientificObservation {
  id: ID;
  type: ObservationType;
  titleRu: string;
  metadata: SourceBackedMetadata;
  payload?: Record<string, unknown>;
}
