import type { ID, ISODateTime } from "./common";

export interface OwnerMetric {
  id: ID;
  titleRu: string;
  value: number | string;
  period?: string;
  updatedAt?: ISODateTime;
}

export interface RevenueMetric extends OwnerMetric {
  amountRub: number;
}

export interface UsageMetric extends OwnerMetric {
  activeUsers?: number;
  events?: number;
}

export interface RetentionMetric extends OwnerMetric {
  cohort?: string;
  retentionRate?: number;
}

export interface PlatformHealthMetric extends OwnerMetric {
  status: "ok" | "degraded" | "critical" | "unknown";
}

export interface ErrorSummary {
  code: string;
  count: number;
  lastSeenAt?: ISODateTime;
}

export interface FunnelMetric {
  step: string;
  users: number;
  conversionRate?: number;
}
