import type { ID } from "./common";
import type { Role } from "./roles";

export interface TeacherCabinetSummary {
  userId: ID;
  role: "teacher" | "homeroom_teacher";
  classes: Array<Record<string, unknown>>;
  homeworkSummary: Record<string, unknown>;
  analytics: Record<string, unknown>;
}

export interface ParentCabinetSummary {
  userId: ID;
  role: "parent";
  children: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  recommendations: string[];
}

export interface ChildProgressSummary {
  childId: ID;
  solvedTasks: number;
  examsStarted: number;
  weakTopics: string[];
}

export interface CabinetRoleSummary {
  userId: ID;
  role: Role;
  roleData?: Record<string, unknown>;
}
