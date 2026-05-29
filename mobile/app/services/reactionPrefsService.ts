import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReactionPrefs = {
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  narrationEnabled: boolean;
};

const STORAGE_KEY = "synapse.reaction.prefs.v1";

const DEFAULT_PREFS: ReactionPrefs = {
  hapticsEnabled: true,
  audioEnabled: true,
  narrationEnabled: true,
};

export async function loadReactionPrefs(): Promise<ReactionPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReactionPrefs>;
    return {
      hapticsEnabled: parsed.hapticsEnabled ?? DEFAULT_PREFS.hapticsEnabled,
      audioEnabled: parsed.audioEnabled ?? DEFAULT_PREFS.audioEnabled,
      narrationEnabled: parsed.narrationEnabled ?? DEFAULT_PREFS.narrationEnabled,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveReactionPrefs(next: Partial<ReactionPrefs>): Promise<ReactionPrefs> {
  const current = await loadReactionPrefs();
  const merged: ReactionPrefs = {
    ...current,
    ...next,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
