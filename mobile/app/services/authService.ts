import { api } from "@app/config/api";

type AuthRole = "student" | "teacher" | "homeroom_teacher" | "parent";

type ServerDrivenAuth = {
  displayName?: string;
  activeRole?: AuthRole;
  availableRoles?: Array<{ role: AuthRole; labelRu: string; active?: boolean }>;
  schoolMemberships?: Array<Record<string, unknown>>;
  classMemberships?: Array<Record<string, unknown>>;
  subscriptions?: Array<Record<string, unknown>>;
  grants?: Array<Record<string, unknown>>;
  capabilities?: Record<string, unknown>;
  featureFlags?: Record<string, unknown>;
};

export async function requestPhoneCode(phone: string) {
  const { data } = await api.post("/auth/phone/request-code", { phone });
  return data as { phone: string; expiresAt: string; debugCode?: string; smsStatus: string };
}

export async function verifyPhoneCode(
  phone: string,
  code: string,
  localPayload?: {
    localUserId?: string;
    localPurchases?: string[];
    localContentVersions?: Record<string, string>;
    localPreferences?: Record<string, unknown>;
  }
) {
  const { data } = await api.post("/auth/phone/verify", {
    phone,
    code,
    localUserId: localPayload?.localUserId,
    localPurchases: localPayload?.localPurchases ?? [],
    localContentVersions: localPayload?.localContentVersions ?? {},
    localPreferences: localPayload?.localPreferences ?? {},
  });
  return data as {
    userId: string;
    phone: string;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    role?: AuthRole;
  } & ServerDrivenAuth;
}

export async function loginWithPassword(login: string, password: string) {
  const { data } = await api.post("/auth/login", { login, password });
  return data as {
    userId: string;
    login: string;
    role: AuthRole;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  } & ServerDrivenAuth;
}

export async function activateInviteCode(payload: { code: string; phone: string; displayName?: string; login: string; password: string; passwordConfirm: string }) {
  const { data } = await api.post("/auth/invite/activate", payload);
  return data as {
    userId: string;
    phone: string;
    login?: string;
    role: AuthRole;
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  } & ServerDrivenAuth;
}

export async function previewInviteCode(code: string) {
  const { data } = await api.post("/auth/invite/preview", { code });
  return data as {
    code: string;
    status: string;
    statusLabelRu: string;
    schoolTitle?: string;
    siteTitle?: string;
    classTitle?: string;
    role: AuthRole;
    roleLabelRu: string;
    expiresAt?: string;
    licenseTitle?: string;
    modules: string[];
    features: string[];
    modulesLabelRu?: string;
    messageRu: string;
  };
}

export async function changePassword(currentPassword: string, newPassword: string, newPasswordConfirm: string) {
  const { data } = await api.post("/auth/change-password", { currentPassword, newPassword, newPasswordConfirm });
  return data as { ok: boolean; userId: string };
}

export async function refreshAuth(refreshToken: string) {
  const { data } = await api.post("/auth/refresh", { refreshToken });
  return data as {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
  };
}

export async function logoutAuth(refreshToken: string) {
  const { data } = await api.post("/auth/logout", { refreshToken });
  return data as { ok: boolean };
}

export async function getAuthMe() {
  const { data } = await api.get("/auth/me");
  return data as {
    userId: string;
    role: AuthRole;
    activeRole?: AuthRole;
    accessTokenExpiresAt: string;
  } & ServerDrivenAuth;
}
