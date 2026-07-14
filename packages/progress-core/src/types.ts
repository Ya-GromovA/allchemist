export type Subject = "chemistry" | "physics" | "biology";
export type ActivityType = "lesson" | "task" | "lab" | "simulation" | "microscope" | "exam" | "ai_hint";

export interface ProgressEvent {
  id: string;
  userId: string;
  subject: Subject;
  moduleId?: string;
  contentId?: string;
  activityType: ActivityType;
  result?: "started" | "completed" | "failed" | "skipped";
  score?: number;
  durationSec?: number;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface Attempt {
  id: string;
  userId: string;
  subject: Subject;
  activityType: ActivityType;
  contentId: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
  answers?: TaskAnswerResult[];
}

export interface Skill {
  id: string;
  titleRu: string;
  subject: Subject;
  parentSkillId?: string;
}

export interface ModuleProgress {
  userId: string;
  moduleId: string;
  completedCount: number;
  totalCount: number;
  progressPct: number;
  weakSkillIds: string[];
}

export interface LabAttemptResult {
  attemptId: string;
  scenarioId: string;
  completed: boolean;
  completedStepIds: string[];
  safetyWarningsSeen: string[];
}

export interface SimulationAttemptResult {
  attemptId: string;
  scenarioId: string;
  completed: boolean;
  finalValues: Record<string, number>;
  validationOk?: boolean;
}

export interface TaskAnswerResult {
  taskId: string;
  answer: string | number | boolean | string[];
  correct?: boolean;
  score?: number;
  feedbackRu?: string;
}
