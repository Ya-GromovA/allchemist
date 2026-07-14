import type { ID, Locale, SubjectKind } from "./common";
import type { Role } from "./roles";

export type AiTutorMode =
  | "auto"
  | "online"
  | "offline"
  | "hint"
  | "explanation"
  | "mistake_review"
  | "repetition_plan"
  | "exam_preparation"
  | "lab_assistant"
  | "methodist"
  | "parent_translator";

export type AiTutorSafetyStatus = "allowed" | "needs_review" | "blocked" | "draft_only";

export interface AiTutorRoleContext {
  userId?: ID;
  role?: Role;
  grade?: number;
  subject?: SubjectKind;
  topicId?: ID;
}

export interface AiTutorMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiTutorRequest {
  question: string;
  subject?: SubjectKind | "ai_mentor";
  language?: Locale;
  mode?: AiTutorMode;
  context?: AiTutorRoleContext;
}

export interface AiTutorResponse {
  answer: string;
  source?: "online" | "offline" | "fallback" | string;
  debug?: Record<string, unknown> | null;
  safetyStatus?: AiTutorSafetyStatus;
}
