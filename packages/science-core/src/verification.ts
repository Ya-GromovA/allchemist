import type { SourceBackedMetadata, VerificationStatus } from "./types";

export function isVerified(metadata: SourceBackedMetadata): boolean {
  return metadata.verificationStatus === "verified" && metadata.sourceIds.length > 0;
}

export function canUseForPublishedVisualization(status: VerificationStatus, sourceIds: string[]): boolean {
  return status === "verified" && sourceIds.length > 0;
}
