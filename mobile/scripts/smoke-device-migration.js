const axios = require("axios");

const DEFAULT_API = "http://127.0.0.1:8000/api/v1";
const API_BASE_URL = (process.env.API_BASE_URL || DEFAULT_API).replace(/\/$/, "");
const DEFAULT_TEST_PHONE = "89154674679";
const TEST_PHONE = (process.env.TEST_PHONE || DEFAULT_TEST_PHONE).trim();
const INTERNAL_DEBUG_SECRET = (process.env.INTERNAL_DEBUG_SECRET || "change-me-admin-bootstrap").trim();

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const phone = TEST_PHONE;
  const checks = [];

  const http = axios.create({
    headers: { "X-Internal-Debug": INTERNAL_DEBUG_SECRET },
  });

  const reqA = await http.post(`${API_BASE_URL}/auth/phone/request-code`, { phone });
  ensure(reqA.status === 200, "deviceA request-code failed");
  const codeA = reqA.data?.debugCode;
  ensure(codeA, "deviceA debugCode missing (set ENV=dev or provide real SMS flow)");
  checks.push({ step: "deviceA.requestCode", status: reqA.status });

  const verifyA = await axios.post(`${API_BASE_URL}/auth/phone/verify`, {
    phone,
    code: codeA,
    localUserId: "deviceA_local",
    localPurchases: ["chemistry_pro_lab"],
    localContentVersions: { chemistry_core: "v2" },
    localPreferences: { theme: "ocean", appMode: "standard" },
  });
  ensure(verifyA.status === 200, "deviceA verify failed");
  const userId = verifyA.data?.userId;
  const accessA = verifyA.data?.accessToken;
  const refreshA = verifyA.data?.refreshToken;
  ensure(userId && accessA && refreshA, "deviceA tokens/userId missing");
  checks.push({ step: "deviceA.verify", status: verifyA.status, userId });

  const uploadA = await axios.post(`${API_BASE_URL}/users/devices/sync`, {
    userId,
    contentVersions: { chemistry_core: "v2", physics_core: "v3" },
    purchases: ["physics_core", "exam_pack"],
    preferences: { theme: "ocean", appMode: "exam" },
  }, {
    headers: { Authorization: `Bearer ${accessA}` },
  });
  ensure(uploadA.status === 200, "deviceA upload snapshot failed");
  checks.push({ step: "deviceA.uploadSnapshot", status: uploadA.status });

  const reqB = await http.post(`${API_BASE_URL}/auth/phone/request-code`, { phone });
  ensure(reqB.status === 200, "deviceB request-code failed");
  const codeB = reqB.data?.debugCode;
  ensure(codeB, "deviceB debugCode missing");
  checks.push({ step: "deviceB.requestCode", status: reqB.status });

  const verifyB = await axios.post(`${API_BASE_URL}/auth/phone/verify`, {
    phone,
    code: codeB,
    localUserId: "deviceB_local",
    localPurchases: ["biology_preview", "chemistry_pro_lab"],
    localContentVersions: { chemistry_core: "v3", biology_core: "v1" },
    localPreferences: { theme: "forest", appMode: "exam" },
  });
  ensure(verifyB.status === 200, "deviceB verify failed");
  ensure(verifyB.data?.userId === userId, "deviceB did not map to same user");
  const accessB = verifyB.data?.accessToken;
  const refreshB = verifyB.data?.refreshToken;
  ensure(accessB && refreshB, "deviceB tokens missing");
  checks.push({ step: "deviceB.verify", status: verifyB.status, sameUser: true });

  const ent = await axios.get(`${API_BASE_URL}/users/entitlements`, {
    params: { userId },
    headers: { Authorization: `Bearer ${accessB}` },
  });
  ensure(ent.status === 200, "entitlements fetch failed");
  const modules = Array.isArray(ent.data?.modules) ? ent.data.modules : [];
  for (const required of ["chemistry_pro_lab", "physics_core", "exam_pack", "biology_preview"]) {
    ensure(modules.includes(required), `missing merged module: ${required}`);
  }
  checks.push({ step: "postMerge.entitlements", status: ent.status, modules });

  const sync = await axios.get(`${API_BASE_URL}/users/devices/sync`, {
    params: { userId },
    headers: { Authorization: `Bearer ${accessB}` },
  });
  ensure(sync.status === 200, "device snapshot fetch failed");
  ensure(sync.data?.contentVersions?.chemistry_core === "v3", "chemistry_core version not merged to latest");
  ensure(sync.data?.contentVersions?.physics_core === "v3", "physics_core version missing");
  ensure(sync.data?.contentVersions?.biology_core === "v1", "biology_core version missing");
  checks.push({ step: "postMerge.deviceSnapshot", status: sync.status, contentVersions: sync.data.contentVersions });

  const rotate = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: refreshA });
  ensure(rotate.status === 200, "refresh failed");
  ensure(rotate.data?.refreshToken && rotate.data.refreshToken !== refreshA, "refresh token was not rotated");
  checks.push({ step: "deviceA.refreshRotate", status: rotate.status, rotated: true });

  const logout = await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken: refreshB });
  ensure(logout.status === 200 && logout.data?.ok === true, "logout failed");
  checks.push({ step: "deviceB.logout", status: logout.status, ok: true });

  console.log(JSON.stringify({ ok: true, apiBaseUrl: API_BASE_URL, phone, userId, checks }, null, 2));
}

main().catch((error) => {
  if (error?.response) {
    console.error(JSON.stringify({ ok: false, status: error.response.status, data: error.response.data }, null, 2));
  } else {
    console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }, null, 2));
  }
  process.exit(1);
});
