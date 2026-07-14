import type { ID, ISODateTime } from "./common";
import type { AccessGrant, CapabilityFlags, Entitlement, FeatureFlag, SchoolMembership } from "./access";
import type { Role } from "./roles";

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: ISODateTime;
  refreshToken: string;
  refreshTokenExpiresAt: ISODateTime;
}

export interface AuthUser {
  userId: ID;
  phone?: string;
  login?: string;
  displayName?: string | null;
  role: Role;
  activeRole: Role;
}

export interface AuthContext extends AuthUser {
  availableRoles: Array<{ role: Role; labelRu?: string }>;
  schoolMemberships: SchoolMembership[];
  classMemberships: SchoolMembership[];
  subscriptions: Array<Record<string, unknown>>;
  grants: AccessGrant[];
  capabilities: CapabilityFlags;
  featureFlags: Record<string, boolean> | FeatureFlag[];
  accessTokenExpiresAt: ISODateTime;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse extends AuthContext, AuthSession {}

export interface PhoneCodeRequest {
  phone: string;
}

export interface PhoneCodeRequestResponse {
  phone: string;
  expiresAt: ISODateTime;
  debugCode?: string | null;
  smsStatus: string;
}

export interface PhoneCodeVerifyRequest {
  phone: string;
  code: string;
  localUserId?: ID;
  localPurchases?: string[];
  localContentVersions?: Record<string, string>;
  localPreferences?: Record<string, unknown>;
}

export interface RefreshSessionRequest {
  refreshToken: string;
}

export type RefreshSessionResponse = AuthSession;

export interface RoleSwitchRequest {
  role: Role;
}

export type RoleSwitchResponse = AuthContext;

export interface InviteAuthRequest {
  code: string;
  phone: string;
  userId?: ID;
  displayName?: string | null;
  login?: string | null;
  password?: string | null;
  passwordConfirm?: string | null;
}

export interface InvitePreviewRequest {
  code: string;
}

export interface InvitePreviewResponse {
  code: string;
  status: string;
  statusLabelRu: string;
  schoolId?: ID | null;
  schoolTitle?: string | null;
  siteId?: ID | null;
  siteTitle?: string | null;
  classId?: ID | null;
  classTitle?: string | null;
  role: Role;
  roleLabelRu: string;
  expiresAt?: ISODateTime | null;
  licenseTitle?: string | null;
  modules: string[];
  features: string[];
  modulesLabelRu?: string | null;
  messageRu: string;
}

export interface ConsentAcceptRequest {
  userId: ID;
  role: Role;
  version: string;
  acceptedAt?: ISODateTime | null;
  parentApproved?: boolean;
}

export interface UserEntitlementsResponse extends Entitlement {}
