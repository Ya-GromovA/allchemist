// app/config/api.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_API_BASE_URL = "https://api.allchemist.ru/api/v1";

function normalizeApiBaseUrl(raw?: string): string {
  const value = (raw ?? "").trim();
  if (!value) return DEFAULT_API_BASE_URL;

  const withoutSlash = value.endsWith("/") ? value.slice(0, -1) : value;
  if (withoutSlash.endsWith("/api/v1")) return withoutSlash;
  return `${withoutSlash}/api/v1`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const SESSION_STORAGE_KEY = "synapse.session.v1";
const AUTH_ALLOWLIST = ["/auth/phone/request-code", "/auth/phone/verify", "/auth/refresh", "/auth/logout", "/auth/me", "/users/consents/accept"];
const OFFLINE_READ_ALLOWLIST = ["/progress/analytics/", "/cabinet/teacher/live/session/"];

type StoredSession = {
  userId?: string;
  role?: string;
  onboardingDone?: boolean;
  theme?: string;
  appMode?: "lite" | "standard" | "enhanced";
  networkMode?: "online" | "offline";
  accessToken?: string | null;
  refreshToken?: string | null;
};

async function readSession(): Promise<StoredSession> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSession;
  } catch {
    return {};
  }
}

async function writeSession(next: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
}

let refreshInFlight: Promise<string | null> | null = null;

function redactSecrets(input: unknown): string {
  const raw = typeof input === "string" ? input : JSON.stringify(input ?? "");
  return raw
    .replace(/hf_[A-Za-z0-9]{8,}/g, "hf_[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/(token|api[_-]?key|authorization)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]");
}

function safeLog(...args: unknown[]) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(...args);
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const session = await readSession();
  const token = session.accessToken;
  const mode = session.appMode ?? "standard";
  const networkMode = session.networkMode ?? "online";
  const url = String(config.url ?? "");

  if (networkMode === "offline") {
    const method = String(config.method ?? "get").toLowerCase();
    const headers = (config.headers ?? {}) as Record<string, unknown>;
    const explicitBypass = String(headers["X-Allow-Offline-Network"] ?? headers["x-allow-offline-network"] ?? "") === "1";
    const authAllowed = AUTH_ALLOWLIST.some((x) => url.includes(x));
    const readAllowed = method === "get" && OFFLINE_READ_ALLOWLIST.some((x) => url.includes(x));
    const allowed = authAllowed || readAllowed || explicitBypass;
    if (!allowed) {
      return Promise.reject(new Error(`Offline-first mode (${mode}): network request blocked for ${url}`));
    }
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error?.config as any;
    const status = error?.response?.status;

    if (status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;
      const session = await readSession();
      const refreshToken = session.refreshToken;

      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (!refreshInFlight) {
        refreshInFlight = (async () => {
          try {
            const { data } = await authApi.post("/auth/refresh", { refreshToken });
            const nextAccess = String(data?.accessToken ?? "").trim();
            const nextRefresh = String(data?.refreshToken ?? "").trim();
            if (!nextAccess || !nextRefresh) return null;
            await writeSession({ ...session, accessToken: nextAccess, refreshToken: nextRefresh });
            return nextAccess;
          } catch {
            return null;
          } finally {
            refreshInFlight = null;
          }
        })();
      }

      const nextAccess = await refreshInFlight;
      if (nextAccess) {
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${nextAccess}`;
        return api.request(originalConfig);
      }
    }

    const method = error?.config?.method?.toUpperCase();
    const url = error?.config?.url;
    const code = error?.code;

    safeLog("[API ERROR]", method, url, status, code, redactSecrets(error?.message));
    return Promise.reject(error);
  }
);
