import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActiveLiveSession = {
  sessionId: string;
  joinCode?: string;
  moduleId?: string;
  lessonId?: string;
  classroom?: string;
  joinedAt: string;
};

const ACTIVE_LIVE_SESSION_KEY = "synapse.live.active.v1";

export async function saveActiveLiveSession(session: Omit<ActiveLiveSession, "joinedAt"> & { joinedAt?: string }): Promise<void> {
  const payload: ActiveLiveSession = {
    ...session,
    joinedAt: session.joinedAt ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(ACTIVE_LIVE_SESSION_KEY, JSON.stringify(payload));
}

export async function getActiveLiveSession(): Promise<ActiveLiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_LIVE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveLiveSession;
    if (!parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearActiveLiveSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_LIVE_SESSION_KEY);
}
