import type { ID, ISODateTime } from "./common";
import type { Role, RoleScope } from "./roles";

export type AccessScope = "user" | "class" | "school" | "site" | "organization" | "platform";
export type LicenseScope = "individual" | "school" | "site" | "organization" | "manual" | "promo";

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  source?: "role" | "subscription" | "school_license" | "manual_grant" | "experiment";
  expiresAt?: ISODateTime;
}

export interface Entitlement {
  userId: ID;
  plans: string[];
  modules: string[];
  aiQuotaLeft: number;
  features?: string[];
}

export interface AccessGrant {
  id?: ID;
  userId: ID;
  sourceType: "manual" | "subscription" | "school_license" | "payment" | "promo" | string;
  title?: string;
  plan?: string;
  moduleId?: string;
  feature?: string;
  organizationId?: ID;
  schoolId?: ID;
  siteId?: ID;
  licenseId?: ID;
  expiresAt?: ISODateTime;
  priceRub?: number;
  status?: "active" | "expired" | "revoked";
}

export interface SchoolMembership {
  schoolId: ID;
  schoolTitle?: string;
  siteId?: ID;
  siteTitle?: string;
  classId?: ID;
  classTitle?: string;
  role: Role;
  roleLabelRu?: string;
  subject?: string;
  isHomeroom?: boolean;
}

export interface IndividualSubscriptionAccess {
  userId: ID;
  plan: string;
  modules: string[];
  features?: string[];
  startsAt?: ISODateTime;
  expiresAt?: ISODateTime;
  status: "active" | "trial" | "expired" | "cancelled";
}

export interface ModulePurchaseAccess {
  userId: ID;
  moduleId: string;
  paymentId?: ID;
  purchasedAt?: ISODateTime;
  expiresAt?: ISODateTime;
  status: "active" | "expired" | "refunded";
}

export interface CapabilityFlags {
  canStudy?: boolean;
  canViewChildProgress?: boolean;
  canTeach?: boolean;
  canLaunchLesson?: boolean;
  canManageHomeroom?: boolean;
  canManageSchool?: boolean;
  canUseAi?: boolean;
  canManageContent?: boolean;
  canSupportUsers?: boolean;
  canAdminSystem?: boolean;
}

export interface RolePermissionMatrixItem {
  role: Role;
  scope: RoleScope;
  baseAllow: boolean;
  effectiveAllow: boolean;
  overridden?: boolean;
}
