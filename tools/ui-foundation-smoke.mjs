import { spawn } from "node:child_process";
import { request, chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const nextBin = `${root}node_modules/.bin/next`;
const greetingText = "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0410\u043b\u0438\u043d\u0430";

function startApp(dir, port) {
  const child = spawn(nextBin, ["start", "-p", String(port)], { cwd: `${root}${dir}`, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${dir}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${dir}] ${chunk}`));
  return child;
}

async function waitFor(url) {
  const ctx = await request.newContext();
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await ctx.get(url);
      if (res.ok()) {
        await ctx.dispose();
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await ctx.dispose();
  throw new Error(`Timed out waiting for ${url}`);
}

async function checkNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error(`Horizontal overflow on ${page.url()}`);
}

async function smokeApp(baseUrl, routes, widths) {
  const browser = await chromium.launch();
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600 });
      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        const bodyText = await page.locator("body").innerText();
        if (!bodyText.trim()) throw new Error(`Blank page at ${baseUrl}${route}`);
        await checkNoHorizontalOverflow(page);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function smokeStudentDashboardPreview(baseUrl) {
  const browser = await chromium.launch();
  try {
    for (const width of [1366, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 600 });
      await page.goto(`${baseUrl}/design-preview/student-dashboard`, { waitUntil: "networkidle" });
      await page.locator(".student-shell").waitFor();
      await page.locator(".student-sidebar").waitFor();
      await page.locator(".student-topbar").waitFor();
      await page.locator(".student-assistant").waitFor();
      const hasGreeting = await page.locator("body").evaluate((body, expected) => body.textContent?.includes(expected) ?? false, greetingText);
      if (!hasGreeting) throw new Error("Student dashboard greeting text was not rendered correctly.");
      await checkNoHorizontalOverflow(page);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

const web = startApp("apps/web", 3210);
const admin = startApp("apps/admin", 3211);

try {
  await waitFor("http://127.0.0.1:3210/");
  await waitFor("http://127.0.0.1:3211/dashboard");
  await smokeApp("http://127.0.0.1:3210", ["/", "/modules", "/dashboard/student", "/modules/chemistry", "/modules/physics", "/modules/biology", "/design-preview/student-dashboard"], [1366, 390]);
  await smokeStudentDashboardPreview("http://127.0.0.1:3210");
  await smokeApp("http://127.0.0.1:3211", ["/dashboard", "/schools", "/users", "/content-qa", "/media-assets", "/analytics"], [1366]);
  console.log("UI foundation Playwright smoke passed.");
} finally {
  web.kill("SIGTERM");
  admin.kill("SIGTERM");
}
