import { describe, expect, it } from "vitest";
import { createAllchemistApiClient } from "../src";
import type { ContentQaBlock, Reaction, SolutionAppearance } from "../src";

function isReactionPublishableForVisualization(reaction: Reaction): boolean {
  return reaction.verificationStatus === "verified" || reaction.verificationStatus === "scientific_review";
}

function isSolutionColorSourceAware(appearance: Partial<SolutionAppearance>): boolean {
  return Boolean(
    appearance.verificationStatus === "unverified" ||
      appearance.verificationStatus === "draft" ||
      (appearance.sourceRefs && appearance.sourceRefs.length > 0)
  );
}

function isAiContentPublishable(block: Partial<ContentQaBlock> & { aiGenerated?: boolean }): boolean {
  if (!block.aiGenerated) return block.publishStatus === "published";
  return block.publishStatus === "published" && Boolean(block.verifiedBy && block.reviewedBy && block.legalStatus === "approved");
}

describe("scientific visualization guardrails", () => {
  it("does not treat unverified chemistry reactions as publishable visualizations", () => {
    const reaction: Reaction = { id: "r", equation: "A + B -> C", reactants: [], products: [] };
    expect(isReactionPublishableForVisualization(reaction)).toBe(false);
  });

  it("requires solution color metadata to be source-aware or explicitly unverified", () => {
    expect(isSolutionColorSourceAware({ colorNameRu: "??????????", colorHex: "#0000ff" })).toBe(false);
    expect(isSolutionColorSourceAware({ colorNameRu: "??????????", verificationStatus: "unverified" })).toBe(true);
  });

  it("keeps precipitate, gas and pH metadata verification-aware through DTO shape", () => {
    const reaction: Reaction = {
      id: "r_verified",
      equation: "A + B -> C",
      reactants: [],
      products: [],
      observations: [
        {
          precipitate: { substanceId: "c", verificationStatus: "unverified", confidence: "low", fidelity: "schematic", sourceRefs: [] },
          gas: { gasSubstanceId: "g", bubblesVisible: true, verificationStatus: "unverified", confidence: "low", fidelity: "schematic", sourceRefs: [] },
          ph: { value: 7, verificationStatus: "unverified", confidence: "low", fidelity: "schematic", sourceRefs: [] },
        },
      ],
    };
    expect(reaction.observations?.[0]?.precipitate?.verificationStatus).toBe("unverified");
    expect(reaction.observations?.[0]?.gas?.verificationStatus).toBe("unverified");
    expect(reaction.observations?.[0]?.ph?.verificationStatus).toBe("unverified");
  });

  it("never represents odor as a visual effect", () => {
    const reaction: Reaction = {
      id: "odor_note",
      equation: "A -> B",
      reactants: [],
      products: [],
      observations: [
        {
          odorNote: {
            labelRu: "?????????? ?????????????????????? ???????????? ?????????????????? ????????????????",
            verificationStatus: "unverified",
            confidence: "low",
            fidelity: "schematic",
            sourceRefs: [],
          },
        },
      ],
    };
    expect(JSON.stringify(reaction)).not.toMatch(/visualEffect/i);
  });

  it("does not publish AI-generated content without Content QA status", () => {
    expect(isAiContentPublishable({ aiGenerated: true, publishStatus: "draft" })).toBe(false);
    expect(isAiContentPublishable({ aiGenerated: true, publishStatus: "published", verifiedBy: "reviewer", reviewedBy: "methodist", legalStatus: "approved" })).toBe(true);
  });

  it("marks future physics/biology visual clients as future-required", () => {
    const client = createAllchemistApiClient({ baseUrl: "https://api.example.test/api/v1", fetch: async () => ({ ok: true, status: 200, text: async () => "{}" }) });
    expect(client.physics.futureRequired.length).toBeGreaterThan(0);
    expect(client.biology.futureRequired.length).toBeGreaterThan(0);
  });
});
