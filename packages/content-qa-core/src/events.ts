import type { QaAuditEvent, ReviewTransition, ReviewerComment, VerificationCheck } from "./types";

export function createTransitionAuditEvent(id: string, contentId: string, transition: ReviewTransition): QaAuditEvent {
  return {
    id,
    contentId,
    type: "transition",
    actorId: transition.actorId,
    at: transition.at ?? new Date().toISOString(),
    payload: transition,
  };
}

export function createCommentAuditEvent(comment: ReviewerComment): QaAuditEvent {
  return {
    id: `${comment.id}:audit`,
    contentId: comment.contentId,
    type: "comment",
    actorId: comment.actorId,
    at: comment.createdAt,
    payload: comment,
  };
}

export function createCheckAuditEvent(id: string, contentId: string, check: VerificationCheck, actorId?: string): QaAuditEvent {
  return {
    id,
    contentId,
    type: "check",
    actorId,
    at: new Date().toISOString(),
    payload: check,
  };
}
