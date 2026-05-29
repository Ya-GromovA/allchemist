import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

const KEY = "synapse_device_id";

function fallbackId() {
  return `device-${Platform.OS}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;

  let appId: string | null = null;
  if (Platform.OS === "android") {
    appId = Application.getAndroidId?.() || null;
  } else if (Platform.OS === "ios") {
    appId = (await Application.getIosIdForVendorAsync?.()) || null;
  }

  let id: string;
  if (typeof appId === "string" && appId.length > 0) {
    id = `device-${Platform.OS}-${appId}`;
  } else {
    id = fallbackId();
  }

  await AsyncStorage.setItem(KEY, id);
  return id;
}
