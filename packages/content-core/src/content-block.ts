import type { ContentBlock } from "./types";
import { canPublishStatus } from "./publication";

export function hasRequiredSourceMetadata(block: ContentBlock): boolean {
  return block.sourceIds.length > 0 && block.licenseKind !== "unknown";
}

export function isContentBlockPublishable(block: ContentBlock): boolean {
  return hasRequiredSourceMetadata(block) && canPublishStatus(block.publicationStatus, block.reviewStatus);
}
