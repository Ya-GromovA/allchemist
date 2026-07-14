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
    if (!bodyText.includes("Алхимик") && !(item.name === "admin-web" && title.includes("Алхимик"))) throw new Error(`${item.name}/${profile.name}: missing Алхимик marker, title=${title}`);
    for (const forbidden of forbiddenUi) {
      if (bodyText.includes(forbidden)) throw new Error(`${item.name}/${profile.name}: forbidden UI text: ${forbidden}`);
    }
    if (item.name === "public-web") {
      if (!bodyText.includes("Добро пожаловать в научную платформу нового поколения")) throw new Error("public web Figma hero marker missing");
      if (!bodyText.includes("Три предмета. Одна платформа.")) throw new Error("public web subjects marker missing");
      if (!bodyText.includes("Интерактивные возможности")) throw new Error("public web features marker missing");
      if (bodyText.includes("Войти в кабинет")) throw new Error("old public login block is still visible");
      if (bodyText.includes("Кто вы?")) throw new Error("public web exposes old role chooser heading");
      if (bodyText.includes("Выберите роль")) throw new Error("public web asks users to choose a role before auth");
      await page.getByRole("link", { name: /Попробовать/ }).first().click();
      await page.waitForURL(/\/demo$/);
      await page.getByText("\u0414\u0435\u043c\u043e-\u0440\u0435\u0436\u0438\u043c \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b").first().waitFor({ timeout: 5000 });
      if (!((await page.locator("body").innerText()).includes("Демо-режим платформы"))) throw new Error("demo page did not open");
      if ((await page.locator("body").innerText()).includes("Выйти")) throw new Error("demo page shows logout");
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.locator("a:visible", { hasText: /^Войти$/ }).first().click();
      await page.waitForURL(/\/login$/);
      await page.getByText("\u0412\u0445\u043e\u0434 \u0432 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0443").first().waitFor({ timeout: 5000 });
      if (!((await page.locator("body").innerText()).includes("Вход в платформу"))) throw new Error("login page did not open");
      if (await page.locator("#studentJoinLiveBtn").count()) throw new Error("student live join is visible before school active live");
    }
    if (item.name === "admin-web") {
      if (!bodyText.includes("Доступ") || !bodyText.includes("После успешного входа откроется рабочая панель.")) throw new Error("admin login shell marker missing");
      if (!(await page.locator("#adminLogin").isVisible())) throw new Error("admin login is not visible");
      if (!(await page.locator("#btnAdminLogin").isVisible())) throw new Error("admin login button is not visible");
      if (bodyText.includes("Админка «Алхимик»")) throw new Error("admin dashboard is visible before auth");
    }
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(`Visual smoke screenshots saved to ${outDir}`);
