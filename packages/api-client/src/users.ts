import type { ID, UserListItem, UserProfile } from "./types";
import type { HttpClient } from "./http";

export function createUsersClient(http: HttpClient) {
  return {
    getProfile() {
      return http.get<UserProfile>("/users/profile");
    },
    listUsers(params: { limit?: number; offset?: number; query?: string } = {}) {
      return http.get<UserListItem[]>("/admin/users", { query: params });
    },
    getDevices(userId?: ID) {
      return http.get<Record<string, unknown>>("/users/devices", { query: { userId } });
    },
    registerDevice(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/users/devices/register", payload);
    },
    revokeDevice(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/users/devices/revoke", payload);
    },
    exportCurrentUserData() {
      return http.get<Record<string, unknown>>("/users/export");
    },
  };
}
