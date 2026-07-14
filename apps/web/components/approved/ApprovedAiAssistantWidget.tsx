"use client";

import { useReducer } from "react";
import {
  assistantReducer,
  createInitialAssistantState,
  type AssistantContextPayload,
  type AssistantHint,
  type AssistantVisualState,
} from "@allchemist/ai-assistant";

import styles from "./ApprovedStudentDashboard.module.css";

export interface ApprovedAiAssistantWidgetProps {
  title: string;
  state: AssistantVisualState;
  hint: AssistantHint;
  context: AssistantContextPayload;
  robotImage: string;
}

export function ApprovedAiAssistantWidget({ title, state, hint, context, robotImage }: ApprovedAiAssistantWidgetProps) {
  const [assistantState, dispatch] = useReducer(
    assistantReducer,
    createInitialAssistantState({
      visualState: state,
      context,
      currentHint: hint,
      unreadCount: 1,
    }),
  );

  const openChat = () => dispatch({ type: "chat:open" });
  const closeChat = () => dispatch({ type: "chat:close" });
  const showTyping = () => dispatch({ type: "typing:start" });

  return (
    <aside className={`${styles.floatingAssistant} ${styles[`assistant-${assistantState.visualState}`]}`} aria-label="AI-наставник">
      <button className={styles.assistantBubble} type="button" onClick={openChat}>
        <strong>{assistantState.chatOpen ? "Чат открыт" : title}</strong>
        <span>{hint.body}</span>
      </button>
      <button className={styles.assistantClose} type="button" onClick={closeChat} aria-label="Свернуть AI-наставника">
        ×
      </button>
      <button className={styles.assistantRobotButton} type="button" onClick={showTyping} aria-label={hint.title ?? title}>
        <img src={robotImage} alt="" />
        {assistantState.unreadCount > 0 ? <span>{assistantState.unreadCount}</span> : null}
      </button>
    </aside>
  );
}
