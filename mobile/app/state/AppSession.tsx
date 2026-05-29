import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthMe, logoutAuth } from "@app/services/authService";
import { flushTelemetryQueue } from "@app/services/telemetryService";
import { flushLearningEventsQueue } from "@app/services/learningEventService";
import { clearActiveLiveSession } from "@app/services/liveSessionService";

export type UserRole = "student" | "teacher" | "homeroom_teacher" | "parent";
export type AppMode = "standard" | "lite" | "enhanced";
export type NetworkMode = "online" | "offline";
export type AppTheme = "graphite" | "paper" | "sunrise" | "aurora";
export type TitleStyle = "standard" | "classic" | "accent";

type SessionContextValue = {
  loading: boolean;
  userId: string;
  role: UserRole | null;
  onboardingDone: boolean;
  appMode: AppMode;
  networkMode: NetworkMode;
  theme: AppTheme;
  titleStyle: TitleStyle;
  accessToken: string | null;
  refreshToken: string | null;
  completeOnboarding: (role: UserRole, nextUserIdOverride?: string) => Promise<void>;
  setUserIdentity: (userId: string) => Promise<void>;
  setAuthTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setNetworkMode: (mode: NetworkMode) => Promise<void>;
  setAppMode: (mode: AppMode) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  setTitleStyle: (style: TitleStyle) => Promise<void>;
};

const STORAGE_KEY = "synapse.session.v1";
const DEVICE_SYNC_KEY = "synapse.device.sync.v1";

const SessionContext = createContext<SessionContextValue | null>(null);

function detectAppMode(): AppMode {
  if (Platform.OS !== "android") return "standard";

  const rawVersion = Platform.Version;
  const sdk = typeof rawVersion === "number" ? rawVersion : Number(rawVersion);
  if (Number.isFinite(sdk) && sdk <= 26) {
    return "lite";
  }
  return "standard";
}

function normalizeTheme(theme?: string): AppTheme {
  switch (theme) {
    case "midnight":
      return "graphite";
    case "ocean":
      return "aurora";
    case "forest":
      return "sunrise";
    case "graphite":
    case "paper":
    case "sunrise":
    case "aurora":
      return theme;
    default:
      return "graphite";
  }
}

function normalizeTitleStyle(style?: string): TitleStyle {
  switch (style) {
    case "classic":
    case "accent":
    case "standard":
      return style;
    default:
      return "standard";
  }
}

export const AppSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("demo-user");
  const [role, setRole] = useState<UserRole | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [networkMode, setNetworkModeState] = useState<NetworkMode>("online");
  const [theme, setThemeState] = useState<AppTheme>("graphite");
  const [titleStyle, setTitleStyleState] = useState<TitleStyle>("standard");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [appMode, setAppModeState] = useState<AppMode>(() => detectAppMode());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as {
          userId?: string;
          role?: UserRole;
          onboardingDone?: boolean;
          theme?: string;
          titleStyle?: string;
          appMode?: AppMode;
          networkMode?: NetworkMode;
          accessToken?: string;
          refreshToken?: string;
        };
        const nextTheme = normalizeTheme(parsed.theme);
        const nextTitleStyle = normalizeTitleStyle(parsed.titleStyle);
        const nextMode = parsed.appMode ?? detectAppMode();
        const nextNetworkMode = parsed.networkMode ?? "online";
        const hasTokens = Boolean(parsed.accessToken && parsed.refreshToken);

        if (hasTokens) {
          try {
            const me = await getAuthMe();
            setUserId(me.userId);
            setRole(me.role);
            setOnboardingDone(true);
            setThemeState(nextTheme);
            setTitleStyleState(nextTitleStyle);
            setAppModeState(nextMode);
            setNetworkModeState(nextNetworkMode);
            setAccessToken(parsed.accessToken ?? null);
            setRefreshToken(parsed.refreshToken ?? null);
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                userId: me.userId,
                role: me.role,
                onboardingDone: true,
                theme: nextTheme,
                titleStyle: nextTitleStyle,
                appMode: nextMode,
                networkMode: nextNetworkMode,
                accessToken: parsed.accessToken,
                refreshToken: parsed.refreshToken,
              })
            );
          } catch {
            setRole(null);
            setOnboardingDone(false);
            setThemeState(nextTheme);
            setTitleStyleState(nextTitleStyle);
            setAppModeState(nextMode);
            setNetworkModeState(nextNetworkMode);
            setAccessToken(null);
            setRefreshToken(null);
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                userId: parsed.userId ?? "demo-user",
                role: null,
                onboardingDone: false,
                theme: nextTheme,
                titleStyle: nextTitleStyle,
                appMode: nextMode,
                networkMode: "online",
                accessToken: null,
                refreshToken: null,
              })
            );
          }
        } else {
          if (parsed.userId) setUserId(parsed.userId);
          if (parsed.role) setRole(parsed.role);
          if (parsed.theme) setThemeState(normalizeTheme(parsed.theme));
          if (parsed.titleStyle) setTitleStyleState(normalizeTitleStyle(parsed.titleStyle));
          if (parsed.appMode) setAppModeState(parsed.appMode);
          if (parsed.networkMode) setNetworkModeState(parsed.networkMode);
          if ((parsed.networkMode ?? "online") === "online") {
            await flushTelemetryQueue();
            await flushLearningEventsQueue();
          }
          if (parsed.accessToken) setAccessToken(parsed.accessToken);
          if (parsed.refreshToken) setRefreshToken(parsed.refreshToken);
          setOnboardingDone(Boolean(parsed.onboardingDone));
        }
      } catch {
        setRole(null);
        setOnboardingDone(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completeOnboarding = async (nextRole: UserRole, nextUserIdOverride?: string) => {
    const nextUserId = nextUserIdOverride || userId || "user-" + Date.now();
    setUserId(nextUserId);
    setRole(nextRole);
    setOnboardingDone(true);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: nextUserId,
        role: nextRole,
        onboardingDone: true,
        theme,
        titleStyle,
        appMode,
        networkMode,
        accessToken,
        refreshToken,
      })
    );
  };

  const setUserIdentity = async (nextUserId: string) => {
    setUserId(nextUserId);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: nextUserId, role, onboardingDone, theme, titleStyle, appMode, networkMode, accessToken, refreshToken })
    );
  };

  const setAuthTokens = async (tokens: { accessToken: string; refreshToken: string }) => {
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, role, onboardingDone, theme, titleStyle, appMode, networkMode, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    );
  };

  const signOut = async () => {
    const currentRefreshToken = refreshToken;
    if (currentRefreshToken) {
      try {
        await logoutAuth(currentRefreshToken);
      } catch {
        // best-effort revoke on backend
      }
    }

    const nextUserId = "demo-user-" + Date.now();
    setUserId(nextUserId);
    setRole(null);
    setOnboardingDone(false);
    setAccessToken(null);
    setRefreshToken(null);
    setThemeState("graphite");
    setTitleStyleState("standard");
    setNetworkModeState("online");

    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(DEVICE_SYNC_KEY);
    await clearActiveLiveSession();
  };

  const setNetworkMode = async (nextMode: NetworkMode) => {
    setNetworkModeState(nextMode);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, role, onboardingDone, theme, titleStyle, appMode, networkMode: nextMode, accessToken, refreshToken })
    );
    await AsyncStorage.setItem(
      DEVICE_SYNC_KEY,
      JSON.stringify({ userId, preferences: { theme, titleStyle, appMode, networkMode: nextMode } })
    );
    if (nextMode === "online") {
      await flushTelemetryQueue();
      await flushLearningEventsQueue();
    }
  };

  const setAppMode = async (nextMode: AppMode) => {
    setAppModeState(nextMode);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, role, onboardingDone, theme, titleStyle, appMode: nextMode, networkMode, accessToken, refreshToken })
    );
    await AsyncStorage.setItem(
      DEVICE_SYNC_KEY,
      JSON.stringify({ userId, preferences: { theme, titleStyle, appMode: nextMode, networkMode } })
    );
  };

  const setTheme = async (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, role, onboardingDone, theme: nextTheme, titleStyle, appMode, networkMode, accessToken, refreshToken })
    );
    await AsyncStorage.setItem(
      DEVICE_SYNC_KEY,
      JSON.stringify({ userId, preferences: { theme: nextTheme, titleStyle, appMode, networkMode } })
    );
  };

  const setTitleStyle = async (nextTitleStyle: TitleStyle) => {
    setTitleStyleState(nextTitleStyle);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId, role, onboardingDone, theme, titleStyle: nextTitleStyle, appMode, networkMode, accessToken, refreshToken })
    );
    await AsyncStorage.setItem(
      DEVICE_SYNC_KEY,
      JSON.stringify({ userId, preferences: { theme, titleStyle: nextTitleStyle, appMode, networkMode } })
    );
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      loading,
      userId,
      role,
      onboardingDone,
      appMode,
      networkMode,
      theme,
      titleStyle,
      accessToken,
      refreshToken,
      completeOnboarding,
      setUserIdentity,
      setAuthTokens,
      signOut,
      setNetworkMode,
      setAppMode,
      setTheme,
      setTitleStyle,
    }),
    [loading, userId, role, onboardingDone, appMode, networkMode, theme, titleStyle, accessToken, refreshToken]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useAppSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAppSession must be used inside AppSessionProvider");
  return ctx;
}
