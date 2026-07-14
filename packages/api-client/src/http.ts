import type { ApiClientConfig, ApiFetchResponse, ApiHeaders, RequestOptions } from "./config";
import { ApiNetworkError, mapHttpError } from "./errors";

function trimSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string): string {
  const base = trimSlashes(baseUrl);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function withQuery(url: string, query?: RequestOptions["query"]): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isJsonBody(body: unknown): body is Record<string, unknown> | unknown[] {
  return typeof body === "object" && body !== null;
}

async function parsePayload<T>(response: ApiFetchResponse): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ApiNetworkError(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class HttpClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.requestInternal<T>(path, { retryOnAuthFailure: true, ...options });
  }

  get<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  delete<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  private async requestInternal<T>(path: string, options: RequestOptions): Promise<T> {
    const url = withQuery(joinUrl(this.config.baseUrl, path), options.query);
    const headers: ApiHeaders = { Accept: "application/json", ...(this.config.defaultHeaders ?? {}), ...(options.headers ?? {}) };
    const method = options.method ?? (options.body === undefined ? "GET" : "POST");
    let body: string | undefined;

    if (options.body !== undefined) {
      if (typeof options.body === "string") body = options.body;
      else if (isJsonBody(options.body) || typeof options.body === "number" || typeof options.body === "boolean") {
        body = JSON.stringify(options.body);
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      }
    }

    if (options.auth !== false && this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response: ApiFetchResponse;
    try {
      const init = body === undefined ? { method, headers } : { method, headers, body };
      response = await withTimeout(this.config.fetch(url, init), options.timeoutMs ?? this.config.timeoutMs);
    } catch (error) {
      if (error instanceof ApiNetworkError) throw error;
      throw new ApiNetworkError(error instanceof Error ? error.message : "Network error", error);
    }

    if (!response.ok && response.status === 401 && options.retryOnAuthFailure && this.config.refreshSession) {
      const refreshed = await this.config.refreshSession({ failedStatus: response.status, failedUrl: url });
      const nextToken = typeof refreshed === "string" ? refreshed : refreshed?.accessToken;
      if (nextToken) {
        const retryHeaders = { ...headers, Authorization: `Bearer ${nextToken}` };
        const retryInit = body === undefined ? { method, headers: retryHeaders } : { method, headers: retryHeaders, body };
        const retryResponse = await withTimeout(this.config.fetch(url, retryInit), options.timeoutMs ?? this.config.timeoutMs);
        if (retryResponse.ok) return parsePayload<T>(retryResponse);
        const retryPayload = await parsePayload<unknown>(retryResponse);
        throw mapHttpError(retryResponse.status, retryResponse.statusText, retryPayload);
      }
    }

    if (!response.ok) {
      const payload = await parsePayload<unknown>(response);
      throw mapHttpError(response.status, response.statusText, payload);
    }

    return parsePayload<T>(response);
  }
}
