import type { ID, ISODateTime } from "./common";
import type { ContentBlock, PublishState } from "./content";
import type { ContentSource } from "./sources";
import type { ReviewerRole } from "./roles";

export type ContentQaStatus = PublishState;

export interface ContentQaBlock extends ContentBlock {
  missingFields?: string[];
  statusLabelRu?: string;
}

export interface ContentQaEvent {
  id: ID | number;
  contentId: ID;
  fromStatus?: ContentQaStatus | string | null;
  toStatus: ContentQaStatus | string;
  actor: string;
  actorRole?: ReviewerRole;
  comment?: string | null;
  createdAt: ISODateTime;
}

export interface ContentQaQueue {
  status: ContentQaStatus;
  titleRu?: string;
  items: ContentQaBlock[];
  count: number;
}

export interface ContentQaSummary {
  workflowRu: string[];
  publishGateRu: string;
  requiredMetadata: string[];
  statusCounts: Record<string, number>;
  latestBlocks: ContentQaBlock[];
}

export interface ContentSourceUpsertRequest extends Partial<ContentSource> {
  id?: ID;
  titleRu: string;
}

export interface ContentBlockTransitionRequest {
  toStatus: ContentQaStatus;
  actor?: string;
  comment?: string;
}
