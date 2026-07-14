export type AssistantVisualState =
  | "idle"
  | "blink"
  | "wink"
  | "smile"
  | "thinking"
  | "hint"
  | "warning"
  | "success"
  | "typing"
  | "chatOpen";

export type AssistantIntent =
  | "none"
  | "explain"
  | "hint"
  | "safety"
  | "validation"
  | "celebrate"
  | "openChat"
  | "recommendNext";

export type AssistantSubject = "chemistry" | "physics" | "biology" | "general";

export interface AssistantContextPayload {
  subject?: AssistantSubject;
  moduleId?: string;
  topicId?: string;
  topicTitle?: string;
  labScenarioId?: string;
  simulationId?: string;
  taskId?: string;
  attemptId?: string;
  role?: string;
  locale?: "ru" | "en";
  safetyLevel?: "none" | "notice" | "warning" | "critical";
  verificationStatus?: "unknown" | "draft" | "review" | "verified" | "rejected";
  metadata?: Record<string, unknown> | undefined;
}

export interface AssistantHint {
  intent: AssistantIntent;
  title?: string;
  body?: string;
  priority: "low" | "normal" | "high";
  relatedActionId?: string;
}

export interface AssistantState {
  visualState: AssistantVisualState;
  context: AssistantContextPayload;
  unreadCount: number;
  chatOpen: boolean;
  reducedMotion: boolean;
  currentHint?: AssistantHint | undefined;
  lastEventAt?: string | undefined;
}
