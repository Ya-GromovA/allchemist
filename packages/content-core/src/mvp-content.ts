import type { EducationLevel, ID, Subject } from "./types";

export type MvpVerificationStatus =
  | "draft"
  | "source_required"
  | "verified_by_ai"
  | "needs_methodist_review"
  | "approved";

export type MvpContentBlockKind =
  | "concept"
  | "explanation"
  | "formula"
  | "example"
  | "safety"
  | "observation"
  | "next_topic"
  | "source_note";

export type MvpTaskKind = "check_understanding" | "classification" | "calculation" | "observation" | "safety_check";

export type MvpRelatedExperienceKind = "lab" | "simulation" | "microscope";

export interface MvpSourceCandidate {
  title: string;
  organization?: string;
  url?: string;
  usage: "curriculum_mapping" | "scientific_reference" | "safety_reference" | "textbook_mapping";
  status: "source_required" | "candidate_not_verified" | "reviewed_candidate" | "approved_reference";
  note?: string;
}

export interface MvpSourceMetadata {
  sourceIds: ID[];
  candidates: MvpSourceCandidate[];
  sourceRequirement: string;
  evidenceNote: string;
}

export interface MvpCopyrightPolicy {
  textOrigin: "original_draft" | "licensed" | "public_domain" | "unknown";
  textbookMappingPolicy: "no_copying_reference_only" | "licensed_mapping_required" | "not_applicable";
  allowedForPublication: boolean;
  note: string;
}

export interface MvpContentBlock {
  id: ID;
  kind: MvpContentBlockKind;
  title: string;
  body: string;
}

export interface MvpTask {
  id: ID;
  kind: MvpTaskKind;
  prompt: string;
  expectedAnswer?: string;
  sourceMetadata: MvpSourceMetadata;
  verificationStatus: MvpVerificationStatus;
}

export interface MvpRelatedExperience {
  id: ID;
  kind: MvpRelatedExperienceKind;
  title: string;
  status: "planned" | "draft" | "ready_for_review";
  note: string;
}

export interface MvpContentItem {
  id: ID;
  subject: Extract<Subject, "chemistry" | "physics" | "biology">;
  educationLevel: Extract<EducationLevel, "school" | "university_intro" | "advanced_student">;
  grade?: string;
  course?: string;
  topic: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  blocks: MvpContentBlock[];
  tasks: MvpTask[];
  relatedLab?: MvpRelatedExperience;
  relatedSimulation?: MvpRelatedExperience;
  relatedMicroscope?: MvpRelatedExperience;
  sourceMetadata: MvpSourceMetadata;
  verificationStatus: MvpVerificationStatus;
  publicationAllowed?: boolean;
  copyrightPolicy: MvpCopyrightPolicy;
  lastReviewedAt: string;
}

export interface MvpCatalogSection {
  id: ID;
  subject: Extract<Subject, "chemistry" | "physics" | "biology">;
  educationLevel: Extract<EducationLevel, "university_intro" | "advanced_student">;
  title: string;
  status: "catalog_only" | "planned" | "draft";
  note: string;
}

export interface MvpUiCard {
  id: ID;
  contentItemId?: ID;
  catalogSectionId?: ID;
  subject: Extract<Subject, "chemistry" | "physics" | "biology">;
  educationLevel: Extract<EducationLevel, "school" | "university_intro" | "advanced_student">;
  title: string;
  summary: string;
  badges: string[];
  verificationStatus: MvpVerificationStatus | "catalog_only";
  primaryTarget: "lesson" | "lab" | "simulation" | "microscope" | "catalog_section";
}

export type MvpSourcePackStatus = "reviewed_candidate" | "source_required" | "rejected";
export type MvpSourcePackType =
  | "official_curriculum"
  | "official_safety_reference"
  | "open_educational_reference"
  | "educational_reference"
  | "textbook_mapping_placeholder";

export interface MvpSourcePackEntry {
  id: ID;
  title: string;
  publisher: string;
  type: MvpSourcePackType;
  url?: string;
  accessDate: string;
  usedFor: string[];
  reliability: "low" | "medium" | "high" | "unknown";
  licenseCopyrightNotes: string;
  status: MvpSourcePackStatus;
}

export interface MvpCurriculumMapEntry {
  id: ID;
  contentItemId: ID;
  subject: Extract<Subject, "chemistry" | "physics" | "biology">;
  grade: string;
  topic: string;
  learningObjectives: string[];
  curriculumReference: {
    sourceId: ID;
    title: string;
    url?: string;
    note: string;
  };
  textbookMappingPlaceholder: {
    sourceId: ID;
    status: "source_required" | "resolved";
    requiredAction: string;
  };
  sourceIds: ID[];
  verificationStatus: MvpVerificationStatus;
  publicationAllowed: boolean;
}

export interface MvpValidationIssue {
  field: string;
  message: string;
  severity: "warning" | "error";
}

export function validateMvpContentItem(item: MvpContentItem): MvpValidationIssue[] {
  const issues: MvpValidationIssue[] = [];

  if (!item.id.trim()) issues.push({ field: "id", message: "Content item id is required.", severity: "error" });
  if (!item.title.trim()) issues.push({ field: "title", message: "Content item title is required.", severity: "error" });
  if (!item.summary.trim()) issues.push({ field: "summary", message: "Content item summary is required.", severity: "error" });
  if (item.learningObjectives.length === 0) {
    issues.push({ field: "learningObjectives", message: "At least one learning objective is required.", severity: "error" });
  }
  if (item.blocks.length === 0) issues.push({ field: "blocks", message: "At least one content block is required.", severity: "error" });
  if (item.tasks.length === 0) issues.push({ field: "tasks", message: "At least one task is required.", severity: "warning" });
  if (!item.lastReviewedAt.trim()) {
    issues.push({ field: "lastReviewedAt", message: "Last reviewed date is required.", severity: "error" });
  }
  if (item.verificationStatus === "approved" && item.sourceMetadata.sourceIds.length === 0) {
    issues.push({ field: "sourceMetadata.sourceIds", message: "Approved content must have source ids.", severity: "error" });
  }
  if (item.verificationStatus === "approved" && item.publicationAllowed === false) {
    issues.push({ field: "publicationAllowed", message: "Approved content must allow publication.", severity: "error" });
  }
  if (item.verificationStatus === "approved" && !item.copyrightPolicy.allowedForPublication) {
    issues.push({ field: "copyrightPolicy", message: "Approved content must be publication-safe.", severity: "error" });
  }
  if (item.sourceMetadata.sourceIds.length === 0 && item.verificationStatus !== "source_required") {
    issues.push({
      field: "verificationStatus",
      message: "Content without source ids should remain source_required.",
      severity: "warning",
    });
  }

  return issues;
}
