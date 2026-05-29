const { spawnSync } = require("child_process");
const axios = require("axios");

const DEFAULT_API = "http://127.0.0.1:8000/api/v1";
const TEST_PHONE = process.env.TEST_PHONE || "89154674679";
const API_BASE_URL = (process.env.API_BASE_URL || DEFAULT_API).replace(/\/$/, "");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  return result.status === 0;
}

async function checkHealth() {
  const url = `${API_BASE_URL}/health`;
  const response = await axios.get(url, { timeout: 6000 });
  if (response.status !== 200) {
    throw new Error(`Health check failed: ${response.status}`);
  }
}

async function main() {
  process.env.TEST_PHONE = TEST_PHONE;

  console.log("[preflight] API_BASE_URL:", API_BASE_URL);
  console.log("[preflight] TEST_PHONE:", TEST_PHONE);

  await checkHealth();
  console.log("[preflight] Backend health OK");

  const smokeOk = run("npm", ["run", "smoke:migration"], process.cwd());
  if (!smokeOk) {
    throw new Error("smoke:migration failed");
  }
  console.log("[preflight] smoke:migration OK");

  const hasExpoToken = Boolean((process.env.EXPO_TOKEN || "").trim());
  if (!hasExpoToken) {
    console.log("[preflight] WARNING: EXPO_TOKEN is not set. EAS build may require interactive auth.");
  }

  console.log("[preflight] APK demo preflight passed");
}

main().catch((error) => {
  console.error("[preflight] FAILED:", error.message || error);
  process.exit(1);
});
