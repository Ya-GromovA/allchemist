import type { PublishGateResult, VerificationCheck } from "./types";

export function hasBlockingChecks(checks: VerificationCheck[]): boolean {
  return checks.some((check) => check.status === "missing" || check.status === "failed");
}

export function evaluatePublishGate(checks: VerificationCheck[]): PublishGateResult {
  return {
    allowed: !hasBlockingChecks(checks) && checks.some((check) => check.area === "source" && check.status === "passed"),
    checks,
  };
}

export function requiredFoundationChecks(): VerificationCheck[] {
  return [
    { area: "source", status: "missing", message: "At least one source is required." },
    { area: "scientific", status: "pending" },
    { area: "safety", status: "pending" },
    { area: "license", status: "pending" },
    { area: "copyright", status: "pending" },
  ];
}
