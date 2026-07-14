import type { ID, ISODateTime, Locale } from "./common";
import type { AccessGrant, CapabilityFlags, FeatureFlag, SchoolMembership } from "./access";
import type { Role } from "./roles";

export interface UserProfile {
  userId: ID;
  displayName?: string | null;
  role: Role;
  activeRole: Role;
  availableRoles: Array<{ role: Role; labelRu?: string }>;
  schoolMemberships: SchoolMembership[];
  classMemberships: SchoolMembership[];
  subscriptions: Array<Record<string, unknown>>;
  grants: AccessGrant[];
  capabilities: CapabilityFlags;
  featureFlags: Record<string, boolean> | FeatureFlag[];
  plans: string[];
  modules: string[];
  preferences: Record<string, unknown>;
  roleData: Record<string, unknown>;
}

export interface UserListItem {
  userId: ID;
  phone?: string;
  login?: string;
  displayName?: string | null;
  role: Role;
  createdAt?: ISODateTime;
  lastSeenAt?: ISODateTime;
  plans?: string[];
  modules?: string[];
}

export interface StudentProfile extends UserProfile {
  role: "student" | "learner" | "pupil";
  grade?: string;
  locale?: Locale;
}

export interface ParentProfile extends UserProfile {
  role: "parent";
  children: Array<{ childId: ID; displayName?: string; classTitle?: string }>;
}

export interface TeacherProfile extends UserProfile {
  role: "teacher";
  subjects?: string[];
  classes?: Array<{ classId: ID; title: string }>;
}

export interface ClassTeacherProfile extends UserProfile {
  role: "homeroom_teacher" | "class_teacher";
  homeroomClasses?: Array<{ classId: ID; title: string }>;
}
