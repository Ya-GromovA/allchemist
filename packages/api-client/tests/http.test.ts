import { ApiAuthError, ApiForbiddenError, ApiNetworkError, ApiNotFoundError, ApiServerError, HttpClient, type ApiFetch } from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };
}

export async function testBaseRequestSuccess() {
  const calls: string[] = [];
  const fetch: ApiFetch = async (url) => {
    calls.push(url);
    return response(200, { ok: true });
  };
  const http = new HttpClient({ baseUrl: "https://api.example.test/api/v1", fetch });
  const result = await http.get<{ ok: boolean }>("/health");
  assert(result.ok === true, "success JSON parsed");
  assert(calls[0] === "https://api.example.test/api/v1/health", "base URL joined");
}

export async function testEmptyResponseHandling() {
  const http = new HttpClient({ baseUrl: "https://api.example.test/api/v1", fetch: async () => response(204) });
  const result = await http.post<undefined>("/auth/logout", {});
  assert(result === undefined, "204 returns undefined");
}

export async function testAuthHeaderInjection() {
  let auth = "";
  const http = new HttpClient({
    baseUrl: "https://api.example.test/api/v1",
    getAuthToken: () => "token-a",
    fetch: async (_url, init) => {
      auth = init?.headers?.Authorization ?? "";
      return response(200, { ok: true });
    },
  });
  await http.get("/auth/me");
  assert(auth === "Bearer token-a", "auth header injected");
}

export async function testRefreshCallbackPath() {
  let call = 0;
  const http = new HttpClient({
    baseUrl: "https://api.example.test/api/v1",
    getAuthToken: () => "old-token",
    refreshSession: async () => "new-token",
    fetch: async (_url, init) => {
      call += 1;
      if (call === 1) return response(401, { detail: "expired" });
      assert(init?.headers?.Authorization === "Bearer new-token", "retry uses refreshed token");
      return response(200, { ok: true });
    },
  });
  const result = await http.get<{ ok: boolean }>("/auth/me");
  assert(result.ok === true, "retry succeeds");
}

export async function testErrorMapping() {
  const cases = [
    { status: 401, Expected: ApiAuthError },
    { status: 403, Expected: ApiForbiddenError },
    { status: 404, Expected: ApiNotFoundError },
    { status: 500, Expected: ApiServerError },
  ] as const;
  for (const item of cases) {
    const http = new HttpClient({ baseUrl: "https://api.example.test/api/v1", fetch: async () => response(item.status, { detail: "bad" }) });
    try {
      await http.get("/x");
      throw new Error("expected failure");
    } catch (error) {
      assert(error instanceof item.Expected, `status ${item.status} maps to ${item.Expected.name}`);
    }
  }
}

export async function testNetworkError() {
  const http = new HttpClient({ baseUrl: "https://api.example.test/api/v1", fetch: async () => { throw new Error("offline"); } });
  try {
    await http.get("/health");
    throw new Error("expected network failure");
  } catch (error) {
    assert(error instanceof ApiNetworkError, "network errors are mapped");
  }
}
