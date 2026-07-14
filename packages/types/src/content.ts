import type { ID, ISODateTime, Locale, SubjectKind } from "./common";
import type { SourceReference } from "./sources";

export type ContentStatus = "draft" | "author_review" | "scientific_review" | "methodist_review" | "content_qa" | "legal_review" | "published" | "archived";
export type ContentReviewStatus = ContentStatus;
export type PublishState = ContentStatus;

export interface ContentVersion {
  version: number;
  contentHash: string;
  updatedAt?: ISODateTime;
}

export interface ContentItem {
  id: ID;
  subject: SubjectKind | "ai_mentor" | string;
  moduleId?: string;
  titleRu: string;
  locale?: Locale;
  version?: ContentVersion;
  publishStatus?: PublishState;
}

export interface ContentBlock extends ContentItem {
  level: string;
  grade?: string | number | null;
  programType: string;
  textbookReferenceType: string;
  section: string;
  topic: string;
  contentType: string;
  difficulty: string;
  bodyRu: string;
  sourceList: SourceReference[] | Array<Record<string, unknown>>;
  licenseStatus: string;
  legalStatus: string;
  verifiedBy?: string | null;
  reviewedBy?: string | null;
  createdBy?: string | null;
  contentHash: string;
  updatedAt?: ISODateTime;
}

export interface ContentDraft extends ContentBlock {
  publishStatus: "draft";
}

export interface LessonBlock {
  id: ID;
  moduleId: string;
  title: string;
  description?: string;
  orderIndex?: number;
  tasks?: Array<Record<string, unknown>>;
  payload?: Record<string, unknown>;
}

export interface TaskItem {
  id: ID;
  moduleId: string;
  lessonId?: ID | null;
  title?: string | null;
  description?: string | null;
  type?: string | null;
  estimatedMinutes?: number | null;
  payload: Record<string, unknown>;
  tags: string[];
}
