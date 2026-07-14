export type ID = string;
export type ISODateTime = string;

export type QaStatus = "draft" | "author_review" | "scientific_review" | "methodist_review" | "content_qa" | "legal_review" | "published" | "returned" | "rejected";
export type QaCheckStatus = "missing" | "pending" | "passed" | "failed" | "not_applicable";
export type VerificationArea = "source" | "scientific" | "safety" | "copyright" | "license" | "localization";

export interface QaQueueItem {
  id: ID;
  contentId: ID;
  titleRu: string;
  subject: "chemistry" | "physics" | "biology" | "general" | string;
  status: QaStatus;
  priority: "low" | "normal" | "high" | "blocker";
  assignedTo?: ID;
  updatedAt?: ISODateTime;
}

export interface ReviewTransition {
  from: QaStatus;
  to: QaStatus;
  actorId: ID;
  comment?: string;
  at?: ISODateTime;
}

export interface ReviewerComment {
  id: ID;
  contentId: ID;
  actorId: ID;
  body: string;
  area?: VerificationArea;
  createdAt: ISODateTime;
  resolvedAt?: ISODateTime;
}

export interface VerificationCheck {
  area: VerificationArea;
  status: QaCheckStatus;
  message?: string;
  sourceIds?: ID[];
}

export interface PublishGateResult {
  allowed: boolean;
  checks: VerificationCheck[];
}

export interface QaAuditEvent {
  id: ID;
  contentId: ID;
  type: "transition" | "comment" | "check" | "publish_gate";
  actorId?: ID | undefined;
  at: ISODateTime;
  payload: object;
}
