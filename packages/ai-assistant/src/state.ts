import { createAssistantContext } from "./context";
import type { AssistantState } from "./types";

export function createInitialAssistantState(partial: Partial<AssistantState> = {}): AssistantState {
  return {
    visualState: "idle",
    context: createAssistantContext(partial.context),
    unreadCount: 0,
    chatOpen: false,
    reducedMotion: false,
    ...partial,
  };
}

export function visualStateForSafety(level: AssistantState["context"]["safetyLevel"]): AssistantState["visualState"] {
  if (level === "critical" || level === "warning") return "warning";
  if (level === "notice") return "hint";
  return "idle";
}
