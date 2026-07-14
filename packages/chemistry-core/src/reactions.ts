import type { Reaction } from "./types";

export function isReactionVerified(reaction: Reaction): boolean {
  return reaction.verificationStatus === "verified" && reaction.sourceIds.length > 0;
}

export function reactionHasHazard(reaction: Reaction, hazard: string): boolean {
  return reaction.hazards.includes(hazard as Reaction["hazards"][number]);
}
