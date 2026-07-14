#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { request, chromium } from "playwright";

const webBaseUrl = process.env.ALLCHEMIST_WEB_BASE_URL;
const adminBaseUrl = process.env.ALLCHEMIST_ADMIN_BASE_URL;
const outputDir = "artifacts/ui-snapshots/ui-prod-2/student-dashboard";
const chemistryLabOutputDir = "artifacts/ui-snapshots/ui-science-1/chemistry-lab";
const layoutSystemOutputDir = "artifacts/ui-snapshots/layout-system";

const routes = [
  { app: "web", reference: "approved_web_landing", path: "/" },
  { app: "web", reference: "approved_web_student_dashboard", path: "/design-preview/student-dashboard" },
  { app: "web", reference: "approved_web_student_dashboard", path: "/dashboard/student" },
  { app: "web", reference: "approved_web_chemistry_lab", path: "/modules/chemistry" },
  { app: "web", reference: "approved_web_physics_simulation", path: "/modules/physics" },
  { app: "web", reference: "approved_web_biology_microscope", path: "/modules/biology" },
  { app: "admin", reference: "approved_admin_dashboard", path: "/dashboard" },
  { app: "admin", reference: "approved_admin_content_qa", path: "/content-qa" },
];

const studentRoutes = [
  { id: "preview", path: "/design-preview/student-dashboard" },
  { id: "dashboard", path: "/dashboard/student" },
];

const chemistryLabRoutes = [{ id: "zinc-hcl", path: "/modules/chemistry/lab/zinc-hcl" }];
const layoutSystemRoutes = [{ id: "platform-structure", path: "/design-preview/platform-structure" }];

const viewports = {
  desktop: { id: "desktop", width: 1672, height: 941 },
  tablet: { id: "tablet", width: 1024, height: 1200 },
  mobile: { id: "mobile", width: 390, height: 844 },
};

function resultLine(result) {
  const base = `${result.status} ${result.check}`;
  if (result.status === "PASS") return `${base}${result.screenshotPath ? ` -> ${result.screenshotPath}` : ""}`;
  return `${base}: ${result.error}`;
}

async function checkRouteStatus(baseUrl, routePath) {
  const ctx = await request.newContext();
  try {
    const url = new URL(routePath, baseUrl).toString();
    const response = await ctx.get(url, { timeout: 15000 });
    return { url, status: response.status(), ok: response.ok() };
  } finally {
    await ctx.dispose();
  }
}

async function openPage(browser, baseUrl, routePath, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const url = new URL(routePath, baseUrl).toString();
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  if (!response?.ok()) {
    await page.close();
    throw new Error(`HTTP ${response?.status() ?? 0} for ${url}`);
  }
  await page.locator("body").waitFor({ timeout: 10000 });
  return page;
}

async function assertNoMojibake(page) {
  const text = await page.locator("body").innerText({ timeout: 10000 });
  if (/�|\?{4,}|Р[ђЃѓ„…†‡€‰Љ‹ЊЌЋЏЎўЈ¤Ґ¦§Ё©Є«¬®Ї°±Ііґµ¶·ё№є»јЅѕї]|С[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏ]|в[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏ]|Ð|Ñ/.test(text)) {
    throw new Error("Potential mojibake detected in rendered text.");
  }
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentOverflow = document.documentElement.scrollWidth > viewportWidth + 1;
    const wideElements = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className : "",
          overflowX: style.overflowX,
          x: Number(rect.x.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
        };
      })
      .filter((rect) => rect.width > viewportWidth + 1 || rect.right > viewportWidth + 1)
      .slice(0, 8);
    return { documentOverflow, viewportWidth, scrollWidth: document.documentElement.scrollWidth, wideElements };
  });
  if (overflow.documentOverflow || overflow.wideElements.length > 0) {
    throw new Error(`Horizontal overflow detected: ${JSON.stringify(overflow)}`);
  }
}

async function assertSidebarPinned(page) {
  const sidebar = page.locator('aside[aria-label="Навигация ученика"]').first();
  await sidebar.waitFor({ timeout: 10000 });
  const before = await sidebar.boundingBox();
  if (!before) throw new Error("Sidebar is not visible before scroll.");

  const mainScrollTop = await page.evaluate(() => {
    const main = document.querySelector('[class*="main"]');
    if (!main) return -1;
    main.scrollTop = 620;
    return main.scrollTop;
  });
  if (mainScrollTop <= 0) throw new Error("Main content did not scroll independently.");
  await page.waitForTimeout(120);

  const after = await sidebar.boundingBox();
  if (!after) throw new Error("Sidebar is not visible after main scroll.");
  if (Math.abs(after.y - before.y) > 1 || after.height < windowSafeHeight(page) - 4) {
    throw new Error(`Sidebar moved or lost viewport height after scroll: before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  }
}

async function assertCoreDashboardVisible(page, { enforceDensity = false } = {}) {
  await page.getByRole("link", { name: "Главная" }).waitFor({ timeout: 5000 });
  await page.getByText("Быстрый доступ").waitFor({ timeout: 5000 });
  await page.getByText("AI-рекомендации").waitFor({ timeout: 5000 });
  await page.locator('aside[aria-label="AI-наставник"]').waitFor({ timeout: 5000 });

  const density = await page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const quick = Array.from(document.querySelectorAll("h2")).find((node) => node.textContent?.includes("Быстрый доступ"));
    const tasks = Array.from(document.querySelectorAll("h2")).find((node) => node.textContent?.includes("Задания от учителя"));
    const quickTop = quick?.getBoundingClientRect().top ?? 9999;
    const tasksTop = tasks?.getBoundingClientRect().top ?? 9999;
    return { viewportHeight, quickTop, tasksTop };
  });
  if (enforceDensity && (density.quickTop > density.viewportHeight * 0.58 || density.tasksTop > density.viewportHeight * 0.78)) {
    throw new Error(`First viewport density is too sparse: ${JSON.stringify(density)}`);
  }
}

function windowSafeHeight(page) {
  return page.viewportSize()?.height ?? 0;
}

async function captureDesktopFlow(browser, baseUrl) {
  const results = [];
  const page = await openPage(browser, baseUrl, "/design-preview/student-dashboard", viewports.desktop);
  try {
    await assertNoMojibake(page);
    await assertNoHorizontalOverflow(page);
    await assertCoreDashboardVisible(page, { enforceDensity: true });
    await page.screenshot({ path: `${outputDir}/desktop-top.png`, fullPage: false });
    results.push({ status: "PASS", check: "desktop top", screenshotPath: `${outputDir}/desktop-top.png` });

    await assertSidebarPinned(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${outputDir}/desktop-scrolled.png`, fullPage: false });
    results.push({ status: "PASS", check: "desktop scrolled", screenshotPath: `${outputDir}/desktop-scrolled.png` });

    await page.getByRole("button", { name: /Визуализация/ }).click();
    await page.locator('aside[aria-label="Навигация ученика"]').getByRole("link", { name: "3D-молекулы" }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${outputDir}/visualization-open.png`, fullPage: false });
    results.push({ status: "PASS", check: "desktop visualization submenu", screenshotPath: `${outputDir}/visualization-open.png` });

    await page.getByRole("button", { name: /Справочники/ }).click();
    await page.locator('aside[aria-label="Навигация ученика"]').getByRole("link", { name: "Таблица элементов" }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${outputDir}/reference-open.png`, fullPage: false });
    results.push({ status: "PASS", check: "desktop references submenu", screenshotPath: `${outputDir}/reference-open.png` });

    return results;
  } catch (error) {
    return [{ status: "FAIL", check: "desktop shell behavior", error: error instanceof Error ? error.message : String(error) }, ...results];
  } finally {
    await page.close();
  }
}

async function captureResponsive(browser, baseUrl, viewport) {
  const screenshotPath = `${outputDir}/${viewport.id}.png`;
  const page = await openPage(browser, baseUrl, "/design-preview/student-dashboard", viewport);
  try {
    await assertNoMojibake(page);
    await assertNoHorizontalOverflow(page);
    await assertCoreDashboardVisible(page);
    await page.getByRole("button", { name: /Визуализация/ }).click();
    await page.locator('aside[aria-label="Навигация ученика"]').getByRole("link", { name: "3D-молекулы" }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return { status: "PASS", check: `${viewport.id} preview`, screenshotPath };
  } catch (error) {
    return { status: "FAIL", check: `${viewport.id} preview`, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await page.close();
  }
}

async function assertChemistryLabVisible(page) {
  await page.getByRole("heading", { name: /Реакция Zn \+ HCl/ }).waitFor({ timeout: 5000 });
  await page.getByText("Draft / needs safety review").waitFor({ timeout: 5000 });
  await page.getByLabel("Интерактивная лабораторная сцена").waitFor({ timeout: 5000 });
  await page.getByLabel("Управление лабораторией").waitFor({ timeout: 5000 });
  await page.getByLabel("AI-наставник").waitFor({ timeout: 5000 });
}

async function captureChemistryLabFlow(browser, baseUrl) {
  const results = [];
  const page = await openPage(browser, baseUrl, "/modules/chemistry/lab/zinc-hcl", viewports.desktop);
  try {
    await assertNoMojibake(page);
    await assertNoHorizontalOverflow(page);
    await assertChemistryLabVisible(page);
    await page.screenshot({ path: `${chemistryLabOutputDir}/desktop-initial.png`, fullPage: false });
    results.push({ status: "PASS", check: "chemistry lab desktop initial", screenshotPath: `${chemistryLabOutputDir}/desktop-initial.png` });

    await page.getByRole("button", { name: "Начать лабораторию" }).click();
    await page.getByRole("button", { name: "Добавить Zn" }).click();
    await page.getByRole("button", { name: "Добавить HCl" }).click();
    await page.getByText("Идёт реакция").first().waitFor({ timeout: 5000 });
    await page.getByText("Gas: H2").waitFor({ timeout: 5000 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${chemistryLabOutputDir}/desktop-reacting.png`, fullPage: false });
    results.push({ status: "PASS", check: "chemistry lab desktop reacting", screenshotPath: `${chemistryLabOutputDir}/desktop-reacting.png` });

    await page.getByRole("button", { name: "Наблюдать" }).click();
    await page.getByRole("button", { name: "Проверить pH" }).click();
    await page.getByRole("button", { name: "Сделать вывод" }).click();
    await page.getByText("Лаборатория завершена").first().waitFor({ timeout: 5000 });
    await page.getByText("Вывод готов").waitFor({ timeout: 5000 });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${chemistryLabOutputDir}/desktop-completed.png`, fullPage: false });
    results.push({ status: "PASS", check: "chemistry lab desktop completed", screenshotPath: `${chemistryLabOutputDir}/desktop-completed.png` });

    return results;
  } catch (error) {
    return [{ status: "FAIL", check: "chemistry lab flow", error: error instanceof Error ? error.message : String(error) }, ...results];
  } finally {
    await page.close();
  }
}

async function captureChemistryLabResponsive(browser, baseUrl, viewport) {
  const screenshotPath = `${chemistryLabOutputDir}/${viewport.id}.png`;
  const page = await openPage(browser, baseUrl, "/modules/chemistry/lab/zinc-hcl", viewport);
  try {
    await assertNoMojibake(page);
    await assertNoHorizontalOverflow(page);
    await assertChemistryLabVisible(page);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return { status: "PASS", check: `chemistry lab ${viewport.id}`, screenshotPath };
  } catch (error) {
    return { status: "FAIL", check: `chemistry lab ${viewport.id}`, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await page.close();
  }
}

async function capturePlatformStructure(browser, baseUrl) {
  const screenshotPath = `${layoutSystemOutputDir}/platform-structure-desktop.png`;
  const page = await openPage(browser, baseUrl, "/design-preview/platform-structure", viewports.desktop);
  try {
    await assertNoMojibake(page);
    await assertNoHorizontalOverflow(page);
    await page.getByRole("navigation", { name: "Основное меню ученика" }).waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /Визуализация/ }).click();
    await page.getByRole("link", { name: "3D-молекулы" }).waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: /Справочники/ }).click();
    await page.getByRole("link", { name: "Таблица элементов" }).waitFor({ timeout: 5000 });
    const structure = await page.evaluate(() => {
      const sidebar = document.querySelector('aside[aria-label="Боковая навигация платформы"]')?.getBoundingClientRect();
      const topbar = document.querySelector("header")?.getBoundingClientRect();
      const notification = document.querySelector('button[aria-label^="Уведомления"]')?.getBoundingClientRect();
      const user = document.querySelector('button[aria-label^="Профиль пользователя"]')?.getBoundingClientRect();
      return {
        sidebarLeft: sidebar?.left ?? null,
        sidebarTop: sidebar?.top ?? null,
        topbarTop: topbar?.top ?? null,
        topbarLeft: topbar?.left ?? null,
        notificationRight: notification?.right ?? null,
        userLeft: user?.left ?? null,
      };
    });
    if (structure.sidebarLeft !== 0 || structure.sidebarTop !== 0 || structure.topbarTop !== 0) {
      throw new Error(`Fixed shell positions are wrong: ${JSON.stringify(structure)}`);
    }
    if (typeof structure.notificationRight === "number" && typeof structure.userLeft === "number" && structure.notificationRight > structure.userLeft + 1) {
      throw new Error(`Notification slot is not before user slot: ${JSON.stringify(structure)}`);
    }
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return { status: "PASS", check: "platform layout structure", screenshotPath };
  } catch (error) {
    return { status: "FAIL", check: "platform layout structure", error: error instanceof Error ? error.message : String(error) };
  } finally {
    await page.close();
  }
}

console.log("Approved UI visual smoke");
console.log("No production routes are changed by this script.");
console.log(JSON.stringify({ webBaseUrl: webBaseUrl ?? null, adminBaseUrl: adminBaseUrl ?? null, routes }, null, 2));

if (!webBaseUrl) {
  console.log("SKIPPED approved_web_student_dashboard: set ALLCHEMIST_WEB_BASE_URL to enable live screenshot checks.");
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });
await mkdir(chemistryLabOutputDir, { recursive: true });
await mkdir(layoutSystemOutputDir, { recursive: true });

const routeStatuses = [];
for (const route of [...studentRoutes, ...chemistryLabRoutes, ...layoutSystemRoutes]) {
  try {
    routeStatuses.push(await checkRouteStatus(webBaseUrl, route.path));
  } catch (error) {
    routeStatuses.push({
      url: new URL(route.path, webBaseUrl).toString(),
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  results.push(...(await captureDesktopFlow(browser, webBaseUrl)));
  results.push(await captureResponsive(browser, webBaseUrl, viewports.tablet));
  results.push(await captureResponsive(browser, webBaseUrl, viewports.mobile));
  results.push(...(await captureChemistryLabFlow(browser, webBaseUrl)));
  results.push(await captureChemistryLabResponsive(browser, webBaseUrl, viewports.tablet));
  results.push(await captureChemistryLabResponsive(browser, webBaseUrl, viewports.mobile));
  results.push(await capturePlatformStructure(browser, webBaseUrl));
} finally {
  await browser.close();
}

console.log("Route status:");
for (const status of routeStatuses) {
  console.log(`${status.ok ? "PASS" : "FAIL"} ${status.status} ${status.url}${status.error ? ` ${status.error}` : ""}`);
}

console.log("Screenshot results:");
for (const result of results) console.log(resultLine(result));

const failures = [...routeStatuses.filter((status) => !status.ok), ...results.filter((result) => result.status !== "PASS")];
if (failures.length > 0) {
  console.error(`FAIL approved_web_student_dashboard visual smoke: ${failures.length} failure(s).`);
  process.exit(1);
}

console.log("PASS approved_web_student_dashboard visual smoke.");
