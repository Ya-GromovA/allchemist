import type { RefreshSessionResponse } from "./types";

export type ApiHeaders = Record<string, string>;

export interface ApiRequestInit {
  method?: string;
  headers?: ApiHeaders;
  body?: string;
  signal?: unknown;
}

export interface ApiFetchResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
}

export type ApiFetch = (url: string, init?: ApiRequestInit) => Promise<ApiFetchResponse>;
export type AuthTokenProvider = () => string | undefined | null | Promise<string | undefined | null>;

export interface RefreshSessionContext {
  failedStatus: number;
  failedUrl: string;
}

export type RefreshSessionCallback = (context: RefreshSessionContext) => Promise<RefreshSessionResponse | string | null | undefined>;

export interface ApiClientConfig {
  baseUrl: string;
  fetch: ApiFetch;
  getAuthToken?: AuthTokenProvider;
  refreshSession?: RefreshSessionCallback;
  timeoutMs?: number;
  defaultHeaders?: ApiHeaders;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: ApiHeaders;
  auth?: boolean;
  raw?: boolean;
  timeoutMs?: number;
  retryOnAuthFailure?: boolean;
}
