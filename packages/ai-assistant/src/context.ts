import type { AssistantContextPayload } from "./types";

export function createAssistantContext(payload: AssistantContextPayload = {}): AssistantContextPayload {
  return {
    subject: payload.subject ?? "general",
    locale: payload.locale ?? "ru",
    safetyLevel: payload.safetyLevel ?? "none",
    verificationStatus: payload.verificationStatus ?? "unknown",
    ...payload,
    metadata: payload.metadata ? { ...payload.metadata } : undefined,
  };
}

export function mergeAssistantContext(
  current: AssistantContextPayload,
  patch: AssistantContextPayload,
): AssistantContextPayload {
  return createAssistantContext({
    ...current,
    ...patch,
    metadata: {
      ...(current.metadata ?? {}),
      ...(patch.metadata ?? {}),
    },
  });
}
