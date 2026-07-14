import type { AssistantContextPayload, AssistantHint, AssistantVisualState } from "./types";

export type AssistantEventType =
  | "context:update"
  | "module:enter"
  | "task:start"
  | "task:answer"
  | "lab:step"
  | "lab:safety-warning"
  | "simulation:parameter-change"
  | "qa:verification-change"
  | "chat:open"
  | "chat:close"
  | "typing:start"
  | "typing:end"
  | "hint:show"
  | "hint:clear"
  | "state:set";

export interface AssistantEvent {
  type: AssistantEventType;
  at?: string;
  context?: AssistantContextPayload;
  hint?: AssistantHint;
  visualState?: AssistantVisualState;
  payload?: Record<string, unknown>;
}

export function nowEvent(type: AssistantEventType, payload: Omit<AssistantEvent, "type" | "at"> = {}): AssistantEvent {
  return { ...payload, type, at: new Date().toISOString() };
}
