import type { ContentBlock, Task } from "./types";
import { hasRequiredSourceMetadata } from "./content-block";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "warning" | "error";
}

export function validateContentBlock(block: ContentBlock): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!block.titleRu.trim()) issues.push({ field: "titleRu", message: "Title is required.", severity: "error" });
  if (!hasRequiredSourceMetadata(block)) issues.push({ field: "sourceIds", message: "Source and license metadata are required.", severity: "error" });
  if (block.publicationStatus === "published" && block.reviewStatus !== "approved") {
    issues.push({ field: "reviewStatus", message: "Published content must be approved.", severity: "error" });
  }
  return issues;
}

export function validateTask(task: Task): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!task.promptRu.trim()) issues.push({ field: "promptRu", message: "Prompt is required.", severity: "error" });
  if (!task.sourceIds.length) issues.push({ field: "sourceIds", message: "Task source metadata is required.", severity: "error" });
  return issues;
}
