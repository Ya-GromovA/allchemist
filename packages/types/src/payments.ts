import type { ID, ISODateTime } from "./common";

export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";

export interface Payment {
  paymentId: ID;
  provider: "robokassa" | "tbank" | "yookassa" | string;
  status: PaymentStatus | string;
  amountRub: number;
  currency?: string;
  moduleId?: string;
  paidAt?: ISODateTime | null;
  failureReason?: string | null;
}

export interface CheckoutSession {
  paymentId: ID;
  provider: string;
  status: PaymentStatus | string;
  amountRub: number;
  currency: string;
  checkoutUrl: string;
  moduleId: string;
  idempotencyKey?: string | null;
}

export interface Subscription {
  id?: ID;
  userId: ID;
  plan: string;
  modules: string[];
  status: SubscriptionStatus;
  startsAt?: ISODateTime;
  expiresAt?: ISODateTime;
}

export interface TariffPlan {
  planId: string;
  titleRu: string;
  priceRub?: number;
  modules: string[];
  features?: string[];
  period?: "month" | "quarter" | "year" | "lifetime";
}

export interface ModulePurchase {
  moduleId: string;
  paymentId?: ID;
  amountRub?: number;
  status: PaymentStatus | string;
  purchasedAt?: ISODateTime;
}

export interface PromoCode {
  code: string;
  plan?: string;
  moduleId?: string;
  expiresAt?: ISODateTime;
  maxActivations?: number;
  // TODO: future-required; no stable backend PromoCode endpoint found.
}

export interface Invoice {
  invoiceId: ID;
  userId?: ID;
  schoolId?: ID;
  amountRub: number;
  status: "draft" | "issued" | "paid" | "cancelled";
  // TODO: future-required; no stable backend Invoice endpoint found.
}
