import { createAllchemistApiClient, type ApiFetch } from "../src";
import type {
  AuthContext,
  Entitlement,
  LoginResponse,
  ParentCabinetSummary,
  ProgressSyncResponse,
  TeacherCabinetSummary,
} from "../src";

function response(body: unknown) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

const fetch: ApiFetch = async (url) => {
  if (url.endsWith("/auth/login")) {
    return response({
      userId: "u",
      login: "u",
      role: "student",
      activeRole: "student",
      availableRoles: [],
      schoolMemberships: [],
      classMemberships: [],
      subscriptions: [],
      grants: [],
      capabilities: {},
      featureFlags: {},
      accessToken: "a",
      accessTokenExpiresAt: "2026-07-02T12:00:00Z",
      refreshToken: "r",
      refreshTokenExpiresAt: "2026-08-02T12:00:00Z",
    });
  }
  return response({});
};

export async function testStableMethodReturnTypes() {
  const client = createAllchemistApiClient({ baseUrl: "https://api.example.test/api/v1", fetch });
  const login: LoginResponse = await client.auth.login({ login: "u", password: "p" });
  const mePromise: Promise<AuthContext> = client.auth.me();
  const entitlementsPromise: Promise<Entitlement> = client.access.getEntitlements("u");
  const teacherPromise: Promise<TeacherCabinetSummary> = client.cabinet.getTeacherOverview();
  const parentPromise: Promise<ParentCabinetSummary> = client.cabinet.getParentOverview();
  const progressPromise: Promise<ProgressSyncResponse> = client.progress.sync({ deviceId: "d", items: [] });

  void mePromise;
  void entitlementsPromise;
  void teacherPromise;
  void parentPromise;
  void progressPromise;
  if (!login.accessToken) throw new Error("login should type access token");
}
