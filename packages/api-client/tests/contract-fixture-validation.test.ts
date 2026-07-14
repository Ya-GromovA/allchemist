import { describe, expect, it } from "vitest";
import authLogin from "./fixtures/contracts/auth-login.json";
import authMe from "./fixtures/contracts/auth-me.json";
import entitlements from "./fixtures/contracts/access-entitlements.json";
import adminDashboard from "./fixtures/contracts/admin-dashboard.json";
import studentCabinet from "./fixtures/contracts/student-cabinet.json";
import teacherCabinet from "./fixtures/contracts/teacher-cabinet.json";
import parentCabinet from "./fixtures/contracts/parent-cabinet.json";
import contentQaQueue from "./fixtures/contracts/content-qa-queue.json";
import progressSync from "./fixtures/contracts/progress-sync.json";
import molecules from "./fixtures/contracts/chemistry-molecules.json";
import reactions from "./fixtures/contracts/chemistry-reactions.json";
import payment from "./fixtures/contracts/payment-subscription.json";

const fixtures = [
  ["auth-login", authLogin],
  ["auth-me", authMe],
  ["access-entitlements", entitlements],
  ["admin-dashboard", adminDashboard],
  ["student-cabinet", studentCabinet],
  ["teacher-cabinet", teacherCabinet],
  ["parent-cabinet", parentCabinet],
  ["content-qa-queue", contentQaQueue],
  ["progress-sync", progressSync],
  ["chemistry-molecules", molecules],
  ["chemistry-reactions", reactions],
  ["payment-subscription", payment],
] as const;

function textOf(value: unknown): string {
  return JSON.stringify(value);
}

function hasVisualChemistryFields(value: unknown): boolean {
  const text = textOf(value);
  return /solutionAppearance|precipitate|gasObservation|odorNote|ph|pH|colorHex/.test(text);
}

describe("contract fixture validation", () => {
  it("marks every contract fixture explicitly", () => {
    for (const [, fixture] of fixtures) expect(fixture.contractFixture).toBe(true);
  });

  it("contains no obvious fake personal data", () => {
    for (const [name, fixture] of fixtures) {
      const text = textOf(fixture);
      expect(text, name).not.toMatch(/"(?:phone|tel|mobile)"\s*:\s*"\+?\d[\d ()-]{8,}\d"/i);
      expect(text, name).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    }
  });

  it("does not pretend future-only endpoints are implemented", () => {
    expect(textOf(studentCabinet)).toContain("No dedicated student cabinet endpoint found");
    for (const [name, fixture] of fixtures) {
      expect(textOf(fixture), name).not.toContain("physicsSimulationEndpointImplemented");
      expect(textOf(fixture), name).not.toContain("biologyMicroscopeEndpointImplemented");
      expect(textOf(fixture), name).not.toContain("mediaRegistryEndpointImplemented");
    }
  });

  it("keeps chemistry visual metadata source-aware when present", () => {
    for (const fixture of [molecules, reactions]) {
      if (!hasVisualChemistryFields(fixture)) continue;
      const text = textOf(fixture);
      expect(text).toMatch(/sourceReferenceId|sourceRefs|verificationStatus|future-required|unverified/);
    }
  });

  it("represents odor as note/safety metadata only", () => {
    for (const [name, fixture] of fixtures) {
      const text = textOf(fixture);
      expect(text, name).not.toMatch(/odor.*visualEffect|smell.*visualEffect/i);
    }
  });

  it("content QA fixture exposes queue status", () => {
    expect(contentQaQueue.queues[0]?.status).toBe("draft");
    expect(Array.isArray(contentQaQueue.queues[0]?.items)).toBe(true);
  });
});
