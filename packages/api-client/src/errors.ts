import type { ApiError } from "./types";

export class ApiClientError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export class ApiValidationError extends ApiClientError { constructor(message: string, status = 400, details?: unknown) { super(message, { status, code: "validation_error", details }); this.name = "ApiValidationError"; } }
export class ApiAuthError extends ApiClientError { constructor(message = "Unauthorized", details?: unknown) { super(message, { status: 401, code: "unauthorized", details }); this.name = "ApiAuthError"; } }
export class ApiForbiddenError extends ApiClientError { constructor(message = "Forbidden", details?: unknown) { super(message, { status: 403, code: "forbidden", details }); this.name = "ApiForbiddenError"; } }
export class ApiNotFoundError extends ApiClientError { constructor(message = "Not found", details?: unknown) { super(message, { status: 404, code: "not_found", details }); this.name = "ApiNotFoundError"; } }
export class ApiServerError extends ApiClientError { constructor(message = "Server error", status = 500, details?: unknown) { super(message, { status, code: "server_error", details }); this.name = "ApiServerError"; } }
export class ApiNetworkError extends ApiClientError { constructor(message = "Network error", details?: unknown) { super(message, { code: "network_error", details }); this.name = "ApiNetworkError"; } }

function messageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = record.detail;
    if (typeof record.message === "string") return record.message;
    if (typeof record.messageRu === "string") return record.messageRu;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const detailRecord = detail as Record<string, unknown>;
      if (typeof detailRecord.message === "string") return detailRecord.message;
      if (typeof detailRecord.messageRu === "string") return detailRecord.messageRu;
    }
  }
  return fallback;
}

export function mapHttpError(status: number, statusText: string | undefined, payload: unknown): ApiClientError {
  const fallback = statusText || `HTTP ${status}`;
  const message = messageFromPayload(payload, fallback);
  if (status === 400 || status === 422) return new ApiValidationError(message, status, payload);
  if (status === 401) return new ApiAuthError(message, payload);
  if (status === 403) return new ApiForbiddenError(message, payload);
  if (status === 404) return new ApiNotFoundError(message, payload);
  if (status >= 500) return new ApiServerError(message, status, payload);
  return new ApiClientError(message, { status, code: "http_error", details: payload });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    const out: ApiError = { message: error.message };
    if (error.status !== undefined) out.status = error.status;
    if (error.code !== undefined) out.code = error.code;
    if (error.details !== undefined && typeof error.details === "object" && error.details !== null) {
      out.details = error.details as Record<string, unknown>;
    }
    return out;
  }
  return { message: error instanceof Error ? error.message : "Unknown error", code: "unknown" };
}
