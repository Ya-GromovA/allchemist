import { chromium } from "playwright";

const baseUrl = "https://api.allchemist.ru";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const response = await context.request.post(`${baseUrl}/api/v1/auth/login`, {
  data: { login: "alch_test_student_school", password: "AlchTest2070" },
});
if (!response.ok()) throw new Error(`login ${response.status()}`);
const session = await response.json();
await context.addInitScript((saved) => {
  localStorage.setItem("allchemist_web_session_v1", JSON.stringify(saved));
}, {
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  userId: session.userId,
  role: session.role,
  phone: "",
});
const page = await context.newPage();
await page.goto(`${baseUrl}/api/v1/web`, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("#appShell").waitFor({ state: "visible", timeout: 15000 });
await page.locator('[data-workspace-tab="modules"]').click();
await page.locator(".periodicTablePanel").waitFor({ state: "visible", timeout: 15000 });
const count = await page.locator(".periodicCell").count();
if (count !== 118) throw new Error(`periodic cells: ${count}`);
await page.locator('[data-element-symbol="Fe"]').click();
await page.locator(".periodicDetail h5", { hasText: "Железо" }).waitFor({ timeout: 5000 });
await page.locator('[data-periodic-mode="memory"]').click();
await page.locator(".periodicModeHint", { hasText: "Запоминание" }).waitFor({ timeout: 5000 });
await page.screenshot({ path: "/tmp/allchemist-periodic-table-web.png", fullPage: true });
console.log("Periodic table web smoke OK: 118 cells, Fe card, memory mode");
await browser.close();
