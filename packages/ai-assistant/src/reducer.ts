import { mergeAssistantContext } from "./context";
import type { AssistantEvent } from "./events";
import type { AssistantState } from "./types";
import { createInitialAssistantState, visualStateForSafety } from "./state";

export function assistantReducer(state: AssistantState, event: AssistantEvent): AssistantState {
  const lastEventAt = event.at ?? new Date().toISOString();

  switch (event.type) {
    case "context:update":
    case "module:enter": {
      const context = event.context ? mergeAssistantContext(state.context, event.context) : state.context;
      return {
        ...state,
        context,
        visualState: visualStateForSafety(context.safetyLevel),
        lastEventAt,
      };
    }

    case "task:start":
      return {
        ...state,
        context: event.context ? mergeAssistantContext(state.context, event.context) : state.context,
        visualState: "thinking",
        currentHint: undefined,
        lastEventAt,
      };

    case "task:answer": {
      const correct = event.payload?.correct === true;
      return {
        ...state,
        visualState: correct ? "success" : "hint",
        currentHint: event.hint ?? state.currentHint,
        lastEventAt,
      };
    }

    case "lab:step":
    case "simulation:parameter-change":
      return {
        ...state,
        context: event.context ? mergeAssistantContext(state.context, event.context) : state.context,
        visualState: event.hint ? "hint" : "thinking",
        currentHint: event.hint ?? state.currentHint,
        lastEventAt,
      };

    case "lab:safety-warning":
      return {
        ...state,
        context: event.context ? mergeAssistantContext(state.context, { ...event.context, safetyLevel: event.context.safetyLevel ?? "warning" }) : state.context,
        visualState: "warning",
        currentHint: event.hint ?? {
          intent: "safety",
          priority: "high",
          title: "Safety check",
          body: "Review the safety note before continuing.",
        },
        unreadCount: state.chatOpen ? state.unreadCount : state.unreadCount + 1,
        lastEventAt,
      };

    case "qa:verification-change":
      return {
        ...state,
        context: event.context ? mergeAssistantContext(state.context, event.context) : state.context,
        visualState: event.context?.verificationStatus === "verified" ? "success" : "warning",
        lastEventAt,
      };

    case "chat:open":
      return { ...state, chatOpen: true, unreadCount: 0, visualState: "chatOpen", lastEventAt };

    case "chat:close":
      return { ...state, chatOpen: false, visualState: state.currentHint ? "hint" : "idle", lastEventAt };

    case "typing:start":
      return { ...state, visualState: "typing", lastEventAt };

    case "typing:end":
      return { ...state, visualState: state.chatOpen ? "chatOpen" : "idle", lastEventAt };

    case "hint:show":
      return {
        ...state,
        currentHint: event.hint,
        visualState: event.hint?.intent === "safety" ? "warning" : "hint",
        unreadCount: state.chatOpen ? state.unreadCount : state.unreadCount + 1,
        lastEventAt,
      };

    case "hint:clear":
      return { ...state, currentHint: undefined, visualState: state.chatOpen ? "chatOpen" : "idle", lastEventAt };

    case "state:set":
      return { ...state, visualState: event.visualState ?? state.visualState, lastEventAt };

    default:
      return createInitialAssistantState(state);
  }
}

export function recommendAssistantState(event: AssistantEvent): AssistantState["visualState"] {
  if (event.type === "lab:safety-warning") return "warning";
  if (event.type === "hint:show") return event.hint?.intent === "safety" ? "warning" : "hint";
  if (event.type === "task:answer") return event.payload?.correct === true ? "success" : "hint";
  if (event.type === "typing:start") return "typing";
  if (event.type === "chat:open") return "chatOpen";
  if (event.type === "simulation:parameter-change" || event.type === "task:start") return "thinking";
  return "idle";
}
