import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8000";
const outDir = process.env.OUT_DIR || "/tmp/allchemist-visual-smoke";
const forbiddenUi = [
  "Pro Monthly",
  "School Quarter",
  "Family Year",
  "Ученик / студент",
  "browser cache",
  "user web",
  "MVP baseline",
  "Live-демо",
  "Web live-урок",
];
const pages = [
  { name: "public-web", path: "/api/v1/web" },
  { name: "admin-web", path: "/api/v1/admin/web" },
];
const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: false },
  { name: "mobile", ...devices["Pixel 5"] },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const profile of profiles) {
  const context = await browser.newContext(profile);
  for (const item of pages) {
    const page = await context.newPage();
    const url = `${baseUrl}${item.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: `${outDir}/${item.name}-${profile.name}.png`, fullPage: true });
    const title = await page.title();
    const bodyText = await page.locator("body").innerText({ timeout: 5000 });
    if (!bodyText.includes("Алхимик")) throw new Error(`${item.name}/${profile.name}: missing Алхимик marker, title=${title}`);
    for (const forbidden of forbiddenUi) {
      if (bodyText.includes(forbidden)) throw new Error(`${item.name}/${profile.name}: forbidden UI text: ${forbidden}`);
    }
    if (item.name === "public-web") {
      if (!bodyText.includes("Войти в кабинет")) throw new Error("public web landing marker missing");
      if (bodyText.includes("Кто вы?")) throw new Error("public web exposes old role chooser heading");
      if (bodyText.includes("Выберите роль")) throw new Error("public web asks users to choose a role before auth");
      await page.getByRole("button", { name: "Войти по логину и паролю", exact: true }).click();
      await page.locator("#roleContinueBtn").click();
      await page.getByRole("button", { name: "Активировать код" }).click();
      if (!(await page.locator("#accessCodePanel").isVisible())) throw new Error("access code panel did not open");
      if (await page.locator("#studentJoinLiveBtn").count()) throw new Error("student live join is visible before school active live");
    }
    if (item.name === "admin-web") {
      if (!bodyText.includes("панель управления")) throw new Error("admin panel marker missing");
      await page.locator("#btnOpenAuth").click();
      if (!(await page.locator("#adminLogin").isVisible())) throw new Error("admin login is not visible");
      if (!(await page.locator("#btnAdminLogin").isVisible())) throw new Error("admin login button is not visible");
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(`Visual smoke screenshots saved to ${outDir}`);
