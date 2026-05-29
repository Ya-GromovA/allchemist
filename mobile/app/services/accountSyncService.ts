import { api } from "@app/config/api";

export async function fetchEntitlements(userId: string) {
  const { data } = await api.get("/users/entitlements", {
    params: { userId },
  });
  return data;
}

export async function restoreDeviceSnapshot(userId: string) {
  const { data } = await api.get("/users/devices/sync", {
    params: { userId },
  });
  return data;
}

export async function uploadDeviceSnapshot(userId: string, payload: {
  contentVersions: Record<string, string>;
  purchases: string[];
  preferences: Record<string, unknown>;
}) {
  const { data } = await api.post("/users/devices/sync", {
    userId,
    contentVersions: payload.contentVersions,
    purchases: payload.purchases,
    preferences: payload.preferences,
  });
  return data;
}
