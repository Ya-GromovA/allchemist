export type ID = string;
export type ISODateTime = string;

export type Subject = "chemistry" | "physics" | "biology" | "ai_mentor" | "general";
export type EducationLevel = "school" | "exam" | "university_intro" | "advanced_student";
export type AudienceRole = "pupil" | "student" | "parent" | "teacher" | "class_teacher" | "school_admin" | "content_editor" | "owner";
export type PublicationStatus = "draft" | "author_review" | "scientific_review" | "methodist_review" | "content_qa" | "legal_review" | "published" | "archived" | "rejected";
export type LicenseKind = "owned" | "commissioned" | "open_license" | "reference_only" | "license_required" | "unknown";
export type ReviewStatus = "not_started" | "in_review" | "changes_requested" | "approved" | "rejected";
export type TaskKind = "quiz" | "numeric" | "open" | "lab" | "simulation" | "observation";

export interface ContentVersion {
  version: number;
  contentHash: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
  authorId?: ID;
}

export interface ContentSource {
  id: ID;
  titleRu: string;
  organizationRu?: string;
  url?: string;
  licenseKind: LicenseKind;
  licenseNoteRu?: string;
  accessedAt?: ISODateTime;
  trustLevel: "low" | "medium" | "high" | "expert_verified";
}

export interface CurriculumMap {
  id: ID;
  subject: Subject;
  level: EducationLevel;
  grade?: string;
  programType: "base" | "oge" | "ege" | "vpr" | "mcko" | "university_intro" | string;
  section: string;
  topicIds: ID[];
  sourceIds: ID[];
}

export interface TextbookMap {
  id: ID;
  subject: Subject;
  titleRu: string;
  authorRefs: string[];
  grade?: string;
  publisher?: string;
  usagePolicy: "reference_only" | "licensed" | "own_summary";
  mappedTopicIds: ID[];
}

export interface Topic {
  id: ID;
  subject: Subject;
  titleRu: string;
  section: string;
  level: EducationLevel;
  grade?: string;
  order?: number;
  curriculumRefs?: ID[];
  sourceIds?: ID[];
}

export interface Lesson {
  id: ID;
  topicId: ID;
  titleRu: string;
  summaryRu?: string;
  estimatedMinutes?: number;
  blockIds: ID[];
  taskIds?: ID[];
  publicationStatus: PublicationStatus;
}

export interface ContentBlock {
  id: ID;
  subject: Subject;
  topicId?: ID;
  lessonId?: ID;
  titleRu: string;
  bodyRu?: string;
  contentType: "theory" | "example" | "task" | "lab" | "simulation" | "microscope" | "source_note" | string;
  sourceIds: ID[];
  authorId?: ID;
  reviewerIds?: ID[];
  licenseKind: LicenseKind;
  reviewStatus: ReviewStatus;
  publicationStatus: PublicationStatus;
  version: ContentVersion;
  payload?: Record<string, unknown>;
}

export interface Answer {
  id: ID;
  textRu?: string;
  value?: string | number | boolean;
  isCorrect?: boolean;
  feedbackRu?: string;
}

export interface Task {
  id: ID;
  subject: Subject;
  topicId?: ID;
  lessonId?: ID;
  kind: TaskKind;
  promptRu: string;
  answers?: Answer[];
  expectedAnswer?: Answer;
  rubricId?: ID;
  sourceIds: ID[];
  publicationStatus: PublicationStatus;
  payload?: Record<string, unknown>;
}

export interface ExamProfile {
  id: ID;
  titleRu: string;
  subject: Subject;
  examType: "oge" | "ege" | "vpr" | "mcko" | "ticket" | string;
  taskCount: number;
  allowedTopicIds?: ID[];
  durationMinutes?: number;
}
