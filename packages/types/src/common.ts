export type ID = string;
export type ISODateTime = string;
export type Locale = "ru" | "en";
export type SubjectKind = "chemistry" | "physics" | "biology";

export type EntityStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived"
  | "deleted"
  | "pending"
  | "failed"
  | "published";

export type CurrentContract = "current-contract";
export type FutureRequired<T> = T | undefined;

export interface ApiError {
  code?: string;
  message: string;
  messageRu?: string;
  status?: number;
  details?: Record<string, unknown>;
  missingFields?: string[];
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  count?: number;
  limit: number;
  offset: number;
}
