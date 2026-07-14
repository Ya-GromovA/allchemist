import type { AccessGrant, CapabilityFlags, Entitlement, ID } from "./types";
import type { HttpClient } from "./http";

export interface UserAccessResponse extends Record<string, unknown> {
  userId?: ID;
  grants?: AccessGrant[];
  capabilities?: CapabilityFlags;
}

export function hasFeatureAccess(entitlement: Entitlement | undefined, featureOrModule: string): boolean {
  if (!entitlement) return false;
  return entitlement.modules.includes(featureOrModule) || (entitlement.features ?? []).includes(featureOrModule) || entitlement.plans.includes(featureOrModule);
}

export function createAccessClient(http: HttpClient) {
  return {
    getEntitlements(userId?: ID) {
      return http.get<Entitlement>("/users/entitlements", { query: { userId } });
    },
    getAccessGrants(userId: ID) {
      return http.get<UserAccessResponse>("/users/access", { query: { userId } });
    },
    hasFeatureAccess,
  };
}
