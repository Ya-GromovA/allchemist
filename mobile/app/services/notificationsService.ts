import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { api } from "@app/config/api";
import { getDeviceId } from "@app/services/deviceId";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerDevicePushToken(): Promise<{ ok: boolean; token?: string; reason?: string }> {
  if (Platform.OS === "web") return { ok: false, reason: "web" };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0ea5e9",
    });
  }

  const perms = await Notifications.getPermissionsAsync();
  let status = perms.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return { ok: false, reason: "permission_denied" };

  const projectId =
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  if (!projectId) return { ok: false, reason: "missing_project_id" };

  const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = String(tokenObj?.data ?? "").trim();
  if (!token) return { ok: false, reason: "empty_token" };

  const deviceId = await getDeviceId();
  await api.post(
    `/notifications/push/register-token?token=${encodeURIComponent(token)}&platform=${encodeURIComponent(Platform.OS)}&deviceId=${encodeURIComponent(deviceId)}`
  );

  return { ok: true, token };
}
