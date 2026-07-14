import { hasFeatureAccess } from "../src";
import type { Entitlement } from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function testAccessHelper() {
  const entitlement: Entitlement = { userId: "u1", plans: ["free"], modules: ["chemistry"], aiQuotaLeft: 20, features: ["ai_basic"] };
  assert(hasFeatureAccess(entitlement, "chemistry"), "module access works");
  assert(hasFeatureAccess(entitlement, "ai_basic"), "feature access works");
  assert(!hasFeatureAccess(entitlement, "biology"), "missing module denied");
}
