import type { ID, ISODateTime, EntityStatus } from "./common";
import type { Role } from "./roles";

export interface School {
  schoolId: ID;
  title: string;
  organizationId?: ID;
  organizationTitle?: string;
  siteId?: ID;
  siteTitle?: string;
  status: EntityStatus | string;
}

export interface SchoolClass {
  classId: ID;
  schoolId: ID;
  siteId?: ID;
  title: string;
  subject?: string;
  teacherUserId?: ID;
  homeroomTeacherUserId?: ID;
  membersCount?: number;
}

export interface SchoolInvite {
  code: string;
  classId?: ID;
  schoolId: ID;
  siteId?: ID;
  role: Role;
  title?: string;
  subject?: string;
  expiresAt?: ISODateTime;
  maxActivations: number;
  activationCount?: number;
  teacherUserId?: ID;
  studentLabel?: string;
  status?: "active" | "expired" | "depleted" | "revoked";
}

export interface SchoolAccessCode extends SchoolInvite {}

export interface SchoolLicenseSummary {
  licenseId: ID;
  schoolId: ID;
  siteId?: ID;
  title: string;
  modules: string[];
  features: string[];
  seatsTotal?: number; // TODO: future-required backend contract.
  seatsUsed?: number; // TODO: future-required backend contract.
  expiresAt?: ISODateTime;
  status: "active" | "expired" | "draft" | "revoked";
}
