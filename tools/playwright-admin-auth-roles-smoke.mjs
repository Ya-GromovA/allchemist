import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "https://api.allchemist.ru";
const outDir = process.env.OUT_DIR || "/tmp/allchemist-admin-auth-roles-smoke";
const password = process.env.TEST_PASSWORD || "AlchTest2070";

const users = [
  { name: "owner", login: "alch_test_owner", role: "owner", expected: ["панель управления", "Журнал", "Безопасность", "Роли и права"] },
  { name: "content-editor", login: "alch_test_content_editor", role: "content_editor", expected: ["панель управления", "Контент", "Помощь"] },
  { name: "support", login: "alch_test_support", role: "support", expected: ["панель управления", "Безопасность", "Журнал"] },
  { name: "school-admin", login: "alch_test_school_admin", role: "school_admin", expected: ["панель управления", "Школы", "Пользователи", "Доступы"] },
];

const forbiddenUi = ["Invalid access token", "QA gate", "publish gate", "QA workflow", "Pro Monthly", "School Quarter", "Family Year"];

async function login(request, user) {
  const response = await request.post(`${baseUrl}/api/v1/auth/login`, { data: { login: user.login, password } });
  if (!response.ok()) throw new Error(`${user.name}: login failed ${response.status()} ${await response.text()}`);
  const data = await response.json();
  if (data.role !== user.role) throw new Error(`${user.name}: expected role ${user.role}, got ${data.role}`);
  return data;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const user of users) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const data = await login(context.request, user);
  await context.addInitScript((token) => localStorage.setItem("synapse_web_admin_token", token), data.accessToken);
  const page = await context.newPage();
  await page.goto(`${baseUrl}/api/v1/admin/web`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: `${outDir}/${user.name}.png`, fullPage: true });
  const bodyText = await page.locator("body").innerText({ timeout: 5000 });
  if (!bodyText.includes("Алхимик")) throw new Error(`${user.name}: admin marker missing`);
  for (const expected of user.expected) {
    if (!bodyText.includes(expected)) throw new Error(`${user.name}: missing expected text: ${expected}`);
  }
  for (const forbidden of forbiddenUi) {
    if (bodyText.includes(forbidden)) throw new Error(`${user.name}: forbidden text visible: ${forbidden}`);
  }
  await context.close();
}

await browser.close();
console.log(`Admin authenticated screenshots saved to ${outDir}`);
