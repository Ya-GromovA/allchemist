import type { ID, ISODateTime, SubjectKind } from "./common";

export interface ProgressSyncItem {
  deviceId: ID;
  moduleId: string;
  lessonId?: string;
  taskId: string;
  completed: 0 | 1;
  score: number;
  lastAnswer?: string | null;
  updatedAt?: ISODateTime | null;
  clientOffsetMin?: number | null;
  clientTz?: string | null;
}

export interface ProgressSync {
  deviceId: ID;
  items: ProgressSyncItem[];
}

export interface ProgressSyncResponse {
  acceptedTaskIds: string[];
}

export interface SubjectProgress {
  subject: SubjectKind;
  completed: number;
  total: number;
  score?: number;
}

export interface ModuleProgress {
  moduleId: string;
  completedLessons: number;
  totalLessons?: number;
  completedTasks: number;
  averageScore?: number;
}

export type AssignmentStatus = "draft" | "assigned" | "in_progress" | "submitted" | "reviewed" | "overdue";

export interface Assignment {
  assignmentId: ID;
  title: string;
  subject: SubjectKind;
  status: AssignmentStatus;
  dueAt?: ISODateTime;
}

export type ExamKind = "oge" | "ege" | "mcko" | "vpr" | "ticket";

export interface ExamAttempt {
  attemptId: ID;
  examKind: ExamKind;
  subject: SubjectKind;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  score?: number;
}

export interface AssessmentResult {
  score: number;
  total: number;
  correct?: boolean[];
  weakTopics?: WeakTopic[];
  recommendations?: Recommendation[];
}

export interface WeakTopic {
  topicId?: ID;
  titleRu: string;
  subject?: SubjectKind;
  severity?: "low" | "medium" | "high";
}

export interface Recommendation {
  id?: ID;
  titleRu: string;
  reasonRu?: string;
  targetContentId?: ID;
}
