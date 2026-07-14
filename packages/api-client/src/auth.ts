import type { AuthContext, InviteAuthRequest, InvitePreviewRequest, InvitePreviewResponse, LoginRequest, LoginResponse, PhoneCodeRequest, PhoneCodeRequestResponse, PhoneCodeVerifyRequest, RefreshSessionRequest, RefreshSessionResponse, RoleSwitchRequest, RoleSwitchResponse } from "./types";
import type { HttpClient } from "./http";

export function createAuthClient(http: HttpClient) {
  return {
    requestPhoneCode(payload: PhoneCodeRequest) {
      return http.post<PhoneCodeRequestResponse>("/auth/phone/request-code", payload, { auth: false });
    },
    verifyPhoneCode(payload: PhoneCodeVerifyRequest) {
      return http.post<LoginResponse>("/auth/phone/verify", payload, { auth: false });
    },
    login(payload: LoginRequest) {
      return http.post<LoginResponse>("/auth/login", payload, { auth: false });
    },
    previewInvite(payload: InvitePreviewRequest) {
      return http.post<InvitePreviewResponse>("/auth/invite/preview", payload, { auth: false });
    },
    activateInvite(payload: InviteAuthRequest) {
      return http.post<LoginResponse>("/auth/invite/activate", payload, { auth: false });
    },
    refreshSession(payload: RefreshSessionRequest) {
      return http.post<RefreshSessionResponse>("/auth/refresh", payload, { auth: false });
    },
    logout(payload: RefreshSessionRequest) {
      return http.post<{ ok: boolean }>("/auth/logout", payload);
    },
    me() {
      return http.get<AuthContext>("/auth/me");
    },
    getCurrentAuthContext() {
      return http.get<AuthContext>("/auth/me");
    },
    switchRole(payload: RoleSwitchRequest) {
      return http.post<RoleSwitchResponse>("/auth/role/switch", payload);
    },
    changePassword(payload: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) {
      return http.post<{ ok: boolean }>("/auth/change-password", payload);
    },
  };
}
