import type { PublicationStatus, ReviewStatus } from "./types";

export const publicationOrder: PublicationStatus[] = [
  "draft",
  "author_review",
  "scientific_review",
  "methodist_review",
  "content_qa",
  "legal_review",
  "published",
  "archived",
  "rejected",
];

export function canPublishStatus(publicationStatus: PublicationStatus, reviewStatus: ReviewStatus): boolean {
  return publicationStatus === "published" && reviewStatus === "approved";
}

export function isTerminalPublicationStatus(status: PublicationStatus): boolean {
  return status === "published" || status === "archived" || status === "rejected";
}
