import type { ApiError } from "./common";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "payment_failed"
  | "content_publish_blocked"
  | "unknown";

export interface ApiErrorDetail extends ApiError {
  code: ApiErrorCode | string;
  traceId?: string;
}
