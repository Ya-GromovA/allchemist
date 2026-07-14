import type { CheckoutSession, ID, Payment, PaymentStatus } from "./types";
import type { HttpClient } from "./http";

export function createPaymentsClient(http: HttpClient) {
  return {
    createCheckout(payload: { provider: string; moduleId: string; amountRub: number; returnUrl?: string; idempotencyKey?: string }) {
      return http.post<CheckoutSession>("/payments/create", payload);
    },
    getPaymentStatus(paymentId: ID) {
      return http.get<Payment>(`/payments/${encodeURIComponent(paymentId)}`);
    },
    listAudit(params: { provider?: string; limit?: number } = {}) {
      return http.get<Array<Record<string, unknown>>>("/payments/audit/query", { query: params });
    },
    getSubscriptionsKpi() {
      return http.get<Record<string, unknown>>("/admin/subscriptions/kpi");
    },
    grantSubscription(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/admin/subscriptions/grant", payload);
    },
    revokeSubscription(payload: Record<string, unknown>) {
      return http.post<Record<string, unknown>>("/admin/subscriptions/revoke", payload);
    },
    normalizeStatus(status: string): PaymentStatus | string {
      return status;
    },
  };
}
