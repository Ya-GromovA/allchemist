import { createAllchemistApiClient, type ApiFetch } from "../src";
import type { LoginResponse } from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const authFixture: LoginResponse = {
  userId: "u_demo",
  login: "demo",
  displayName: "Demo User",
  role: "student",
  activeRole: "student",
  availableRoles: [{ role: "student", labelRu: "????????????????" }],
  schoolMemberships: [],
  classMemberships: [],
  subscriptions: [],
  grants: [],
  capabilities: { canStudy: true, canUseAi: true },
  featureFlags: {},
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-07-02T12:00:00Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2026-08-02T12:00:00Z",
};

export async function testLoginEndpoint() {
  let path = "";
  const fetch: ApiFetch = async (url, init) => {
    path = url;
    assert(init?.method === "POST", "login uses POST");
    assert(init?.body?.includes("demo"), "body is JSON encoded");
    return { ok: true, status: 200, text: async () => JSON.stringify(authFixture) };
  };
  const client = createAllchemistApiClient({ baseUrl: "https://api.example.test/api/v1", fetch });
  const result = await client.auth.login({ login: "demo", password: "secret" });
  assert(path.endsWith("/auth/login"), "login endpoint used");
  assert(result.userId === "u_demo", "auth fixture parsed");
}
