import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLang = "ru" | "en";

const KEY = "synapse.lang";

export async function getLang(): Promise<AppLang> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "en" ? "en" : "ru";
}

export async function setLang(lang: AppLang): Promise<void> {
  await AsyncStorage.setItem(KEY, lang);
}
