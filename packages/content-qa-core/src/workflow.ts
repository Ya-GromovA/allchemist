import type { QaStatus, ReviewTransition } from "./types";

const allowedTransitions: Record<QaStatus, QaStatus[]> = {
  draft: ["author_review", "returned", "rejected"],
  author_review: ["scientific_review", "returned", "rejected"],
  scientific_review: ["methodist_review", "returned", "rejected"],
  methodist_review: ["content_qa", "returned", "rejected"],
  content_qa: ["legal_review", "returned", "rejected"],
  legal_review: ["published", "returned", "rejected"],
  published: ["returned"],
  returned: ["draft", "author_review", "rejected"],
  rejected: ["draft"],
};

export function canTransition(from: QaStatus, to: QaStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function applyTransition(current: QaStatus, transition: ReviewTransition): QaStatus {
  if (transition.from !== current) throw new Error(`Transition source mismatch: ${transition.from} != ${current}`);
  if (!canTransition(transition.from, transition.to)) throw new Error(`Transition is not allowed: ${transition.from} -> ${transition.to}`);
  return transition.to;
}
