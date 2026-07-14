export type CurrentBackendRole =
  | "student"
  | "learner"
  | "teacher"
  | "homeroom_teacher"
  | "parent"
  | "school_admin"
  | "content_editor"
  | "support"
  | "admin"
  | "owner";

export type TargetOnlyRole =
  | "pupil"
  | "university_student"
  | "class_teacher"
  | "system_admin"
  | "content_author"
  | "methodist"
  | "reviewer";

export type Role = CurrentBackendRole | TargetOnlyRole;
export type PlatformRole = Role;
export type UserFacingRole =
  | "pupil"
  | "student"
  | "university_student"
  | "parent"
  | "teacher"
  | "class_teacher"
  | "school_admin";

export type RoleScope =
  | "auth:me"
  | "user:read_self"
  | "user:sync_self"
  | "user:profile_self"
  | "telemetry:write_self"
  | "payments:admin"
  | "cabinet:teacher"
  | "cabinet:parent"
  | "admin:panel"
  | "admin:roles"
  | "admin:rights"
  | "admin:subscriptions"
  | "content:manage";

export type Permission = RoleScope | string;

export type ReviewerRole =
  | "content_author"
  | "methodist"
  | "scientific_reviewer"
  | "legal_reviewer"
  | "content_qa"
  | "owner";

export interface RoleDescriptor {
  role: Role;
  labelRu?: string;
  isCurrentBackendRole: boolean;
  isTargetOnly?: boolean;
}
