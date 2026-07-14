import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = resolve(root, "apps/web");
const nextBin = resolve(root, "node_modules/.bin/next");
const outputDir = resolve(root, "artifacts/ui-snapshots/web");
const reportPath = resolve(outputDir, "student-dashboard-production-readiness-report.json");
const engineeringReportPath = resolve(outputDir, "student-dashboard-engineering-readiness-report.json");
const markdownPath = resolve(root, "docs/design/implementation-reports/student-dashboard-production-readiness.md");
const engineeringMarkdownPath = resolve(root, "docs/design/implementation-reports/student-dashboard-engineering-readiness.md");
const zipPath = resolve(root, "artifacts/ui-snapshots/student-dashboard-production-scaffold.zip");
const engineeringZipPath = resolve(root, "artifacts/ui-snapshots/student-dashboard-engineering-scaffold.zip");
const route = "/design-preview/student-dashboard";
const port = 3240;
const baseUrl = `http://127.0.0.1:${port}`;
const viewport = { width: 1672, height: 941 };

const files = {
  component: resolve(root, "apps/web/components/student-dashboard-preview.tsx"),
  css: resolve(root, "apps/web/app/globals.css"),
  demoData: resolve(root, "apps/web/lib/demo/student-dashboard-demo-data.ts"),
  manifest: resolve(root, "apps/web/public/design-assets/student-dashboard/manifest.json"),
  parityDesktop: resolve(outputDir, "student-dashboard-desktop-parity-1672x941.png"),
  paritySideBySide: resolve(outputDir, "student-dashboard-side-by-side.png"),
  parityDiff: resolve(outputDir, "student-dashboard-visual-diff.png"),
  layoutReport: resolve(outputDir, "student-dashboard-layout-report.json"),
  visualReport: resolve(outputDir, "student-dashboard-parity-report.json"),
  productionScaffold: resolve(outputDir, "student-dashboard-desktop-production-scaffold.png"),
  productionSideBySide: resolve(outputDir, "student-dashboard-production-side-by-side.png"),
  productionDiff: resolve(outputDir, "student-dashboard-production-visual-diff.png"),
  engineeringScaffold: resolve(outputDir, "student-dashboard-engineering-scaffold.png"),
  engineeringSideBySide: resolve(outputDir, "student-dashboard-engineering-side-by-side.png"),
  engineeringDiff: resolve(outputDir, "student-dashboard-engineering-visual-diff.png"),
};

const requiredTestIds = [
  "student-dashboard-page",
  "student-sidebar",
  "student-topbar",
  "student-greeting",
  "continue-learning-card",
  "live-lesson-card",
  "ai-recommendations-card",
  "quick-access-strip",
  "assignments-card",
  "subject-progress-card",
  "weak-topics-card",
  "popular-now-card",
  "weekly-progress-card",
  "locked-feature-card",
  "ai-assistant-widget",
];

function runCheck(label, command, args, { allowFailure = false } = {}) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const passed = result.status === 0;
  if (!passed && !allowFailure) {
    console.error(`${label} failed with status ${result.status}`);
  }
  return {
    label,
    command: `${command} ${args.join(" ")}`,
    status: passed ? "PASS" : "FAIL",
    exitCode: result.status ?? 1,
    allowedToFail: allowFailure,
  };
}

async function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

async function waitFor(url) {
  const ctx = await request.newContext();
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await ctx.get(url);
      if (response.ok()) {
        await ctx.dispose();
        return;
      }
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  await ctx.dispose();
  throw new Error(`Timed out waiting for ${url}`);
}

function startWeb() {
  const child = spawn(nextBin, ["start", "-p", String(port)], { cwd: webDir, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => process.stdout.write(`[apps/web] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[apps/web] ${chunk}`));
  return child;
}

async function runInteractionSmoke() {
  const web = startWeb();
  try {
    await waitFor(`${baseUrl}${route}`);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });

      for (const testId of requiredTestIds) {
        await page.getByTestId(testId).waitFor();
      }

      await page.getByTestId("continue-learning-card").getByRole("button").click();
      const liveLessonButton = page.getByTestId("live-lesson-card").getByRole("button");
      const liveLessonTextBefore = await liveLessonButton.textContent();
      await liveLessonButton.click();
      await page.waitForFunction(
        ({ before }) => {
          const button = document.querySelector('[data-testid="live-lesson-card"] button');
          return Boolean(button?.textContent && button.textContent !== before);
        },
        { before: liveLessonTextBefore },
      );
      await page.getByTestId("quick-access-strip").getByRole("button").first().click();
      await page.getByTestId("weak-topics-card").getByRole("button").first().click();
      await page.getByRole("button", { name: /повторяется/i }).first().waitFor();
      await page.getByTestId("locked-feature-card").getByRole("button").click();
      await page.getByTestId("ai-assistant-widget").getByRole("button").first().click();
      await page.getByText(/AI-наставник/i).last().waitFor();
      await page.getByLabel(/закрыть/i).click();
      await page.keyboard.press("Tab");

      const focusableCount = await page.locator("button, a, input").count();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (focusableCount < 20) throw new Error(`Expected at least 20 focusable controls, got ${focusableCount}.`);
      if (overflow) throw new Error("Horizontal overflow detected.");

      await page.close();
      return { status: "PASS", focusableCount };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { status: "FAIL", error: error instanceof Error ? error.message : String(error) };
  } finally {
    web.kill("SIGTERM");
  }
}

async function runViewportFitCheck() {
  const web = startWeb();
  try {
    await waitFor(`${baseUrl}${route}`);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      for (const testId of requiredTestIds) {
        await page.getByTestId(testId).waitFor();
      }

      const result = await page.evaluate((requiredIds) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const criticalIds = [
          "popular-now-card",
          "weekly-progress-card",
          "locked-feature-card",
          "ai-assistant-widget",
        ];
        const fitIds = [
          "student-dashboard-page",
          ...criticalIds,
        ];
        const issues = [];
        const boxes = {};

        const documentHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
        );
        if (documentHeight > viewportHeight + 1) {
          issues.push(`Document height ${documentHeight}px exceeds viewport height ${viewportHeight}px.`);
        }

        for (const id of requiredIds) {
          const element = document.querySelector(`[data-testid="${id}"]`);
          if (!element) {
            issues.push(`Missing required element: ${id}.`);
            continue;
          }
          const rect = element.getBoundingClientRect();
          boxes[id] = {
            x: Number(rect.x.toFixed(2)),
            y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
            bottom: Number(rect.bottom.toFixed(2)),
            right: Number(rect.right.toFixed(2)),
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
          };
          if (fitIds.includes(id) || criticalIds.includes(id)) {
            if (rect.top < -1 || rect.left < -1 || rect.right > viewportWidth + 1 || rect.bottom > viewportHeight + 1) {
              issues.push(`${id} is outside ${viewportWidth}x${viewportHeight}: ${JSON.stringify(boxes[id])}.`);
            }
          }
          if (criticalIds.includes(id) && element.scrollHeight > element.clientHeight + 1) {
            issues.push(`${id} has clipped internal content: scrollHeight ${element.scrollHeight}px, clientHeight ${element.clientHeight}px.`);
          }
        }

        return {
          status: issues.length === 0 ? "PASS" : "FAIL",
          viewport: { width: viewportWidth, height: viewportHeight },
          documentHeight,
          boxes,
          issues,
        };
      }, requiredTestIds);

      await page.close();
      return result;
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { status: "FAIL", error: error instanceof Error ? error.message : String(error), issues: [error instanceof Error ? error.message : String(error)] };
  } finally {
    web.kill("SIGTERM");
  }
}

async function checkStaticContracts() {
  const component = await readFile(files.component, "utf8");
  const css = await readFile(files.css, "utf8");
  const cssWithoutOverlay = css.replace(/\.student-golden-overlay\s*\{[\s\S]*?\n\}/g, "");
  const missingTestIds = requiredTestIds.filter((testId) => !component.includes(`data-testid="${testId}"`));
  const fullPageScreenshotHits = [
    "approved-student-dashboard.png",
    "golden-approved-web-student-dashboard.png",
  ].filter((asset) => cssWithoutOverlay.includes(asset) || component.includes(asset));

  const requiredComponentNames = [
    "StudentDashboardPage",
    "StudentSidebar",
    "StudentTopbar",
    "StudentGreeting",
    "ContinueLearningCard",
    "LiveLessonCard",
    "AIRecommendationsCard",
    "QuickAccessStrip",
    "AssignmentsCard",
    "SubjectProgressCard",
    "WeakTopicsCard",
    "PopularNowCard",
    "WeeklyProgressCard",
    "LockedFeatureCard",
    "AIAssistantWidget",
    "ProgressRing",
    "PrimaryButton",
    "Badge",
  ];
  const missingComponentNames = requiredComponentNames.filter((name) => !component.includes(`function ${name}`) && !component.includes(`export function ${name}`));

  const tokenCommentPresent = css.includes("Generated from student-dashboard.tokens.json");

  return {
    status: missingTestIds.length === 0 && fullPageScreenshotHits.length === 0 && missingComponentNames.length === 0 && tokenCommentPresent ? "PASS" : "FAIL",
    missingTestIds,
    fullPageScreenshotHits,
    missingComponentNames,
    tokenCommentPresent,
    demoDataExists: existsSync(files.demoData),
    manifestExists: existsSync(files.manifest),
  };
}

async function copyProductionArtifacts() {
  await mkdir(outputDir, { recursive: true });
  const copies = [
    [files.parityDesktop, files.productionScaffold],
    [files.paritySideBySide, files.productionSideBySide],
    [files.parityDiff, files.productionDiff],
    [files.parityDesktop, files.engineeringScaffold],
    [files.paritySideBySide, files.engineeringSideBySide],
    [files.parityDiff, files.engineeringDiff],
  ];
  for (const [from, to] of copies) {
    if (existsSync(from)) await copyFile(from, to);
  }
}

function zipArtifacts() {
  const script = [
    "from pathlib import Path",
    "from zipfile import ZipFile, ZIP_DEFLATED",
    `zip_path = Path(${JSON.stringify(engineeringZipPath)})`,
    "zip_path.parent.mkdir(parents=True, exist_ok=True)",
    "files = [",
    `    (Path(${JSON.stringify(files.engineeringScaffold)}), 'web/student-dashboard-engineering-scaffold.png'),`,
    `    (Path(${JSON.stringify(files.engineeringSideBySide)}), 'web/student-dashboard-engineering-side-by-side.png'),`,
    `    (Path(${JSON.stringify(files.engineeringDiff)}), 'web/student-dashboard-engineering-visual-diff.png'),`,
    `    (Path(${JSON.stringify(engineeringReportPath)}), 'web/student-dashboard-engineering-readiness-report.json'),`,
    `    (Path(${JSON.stringify(engineeringMarkdownPath)}), 'docs/student-dashboard-engineering-readiness.md'),`,
    `    (Path(${JSON.stringify(files.layoutReport)}), 'web/student-dashboard-layout-report.json'),`,
    `    (Path(${JSON.stringify(files.visualReport)}), 'web/student-dashboard-parity-report.json'),`,
    "]",
    "with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zf:",
    "    for file, arcname in files:",
    "        if file.exists():",
    "            zf.write(file, arcname)",
  ].join("\n");
  const result = spawnSync("python3", ["-c", script], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error("Unable to create engineering scaffold zip.");
}

function markdownFor(report) {
  return [
    "# Student Dashboard Engineering Readiness",
    "",
    `Generated: ${report.generatedAt}`,
    `Route: \`${route}\``,
    `Status: **${report.status}**`,
    `Engineering scaffold: **${report.engineeringScaffoldReady ? "ready" : "not ready"}**`,
    `Visual approval: **${report.visualApprovalBlocked ? "blocked" : "not blocked"}**`,
    `Production ready: **${report.productionReady}**`,
    "",
    "## Checks",
    "",
    ...report.commands.map((check) => `- ${check.label}: ${check.status}${check.allowedToFail ? " (non-blocking)" : ""}`),
    `- Static contract: ${report.staticContracts.status}`,
    `- Interaction smoke: ${report.interactionSmoke.status}`,
    `- Viewport fit: ${report.viewportFit.status}`,
    `- Layout contract: ${report.layout.result ?? "UNKNOWN"}`,
    `- Visual parity: ${report.visual.result ?? "UNKNOWN"}`,
    "",
    "## Visual Parity Note",
    "",
    report.visualApprovalBlocked ? "Visual approval is blocked: visual parity is FAIL and clean assets are still missing." : "Visual approval is not blocked by the current automated threshold.",
    "",
    "## Viewport Fit",
    "",
    report.viewportFit.status === "PASS"
      ? `Full dashboard content fits inside ${viewport.width}x${viewport.height}.`
      : `Viewport fit failed: ${(report.viewportFit.issues ?? []).join("; ")}`,
    "",
    "## Artifacts",
    "",
    `- Desktop scaffold: \`${files.engineeringScaffold}\``,
    `- Side-by-side: \`${files.engineeringSideBySide}\``,
    `- Visual diff: \`${files.engineeringDiff}\``,
    `- JSON report: \`${engineeringReportPath}\``,
    `- Zip: \`${engineeringZipPath}\``,
    "",
  ].join("\n");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(markdownPath), { recursive: true });
  await mkdir(dirname(engineeringMarkdownPath), { recursive: true });

  const commands = [
    runCheck("Screenshot capture", "node", ["tools/capture-ui-snapshots.mjs"]),
    runCheck("Layout contract check", "node", ["tools/check-layout-contract.mjs"], { allowFailure: true }),
    runCheck("Visual parity check", "node", ["tools/check-visual-parity.mjs"], { allowFailure: true }),
  ];

  const staticContracts = await checkStaticContracts();
  const interactionSmoke = await runInteractionSmoke();
  const viewportFit = await runViewportFitCheck();
  await copyProductionArtifacts();

  const layoutReport = (await readJson(files.layoutReport)) ?? {};
  const visualReport = (await readJson(files.visualReport)) ?? {};
  const visualResult = visualReport.result ?? "UNKNOWN";
  const fullMismatchPercent = visualReport.fullScreen?.mismatchPercent ?? null;
  const visualApprovalBlocked = visualResult === "FAIL";

  const blockingFailures = [
    commands[0].status !== "PASS" ? "screenshot capture failed" : null,
    staticContracts.status !== "PASS" ? "static contract failed" : null,
    interactionSmoke.status !== "PASS" ? "interaction smoke failed" : null,
    viewportFit.status !== "PASS" ? "viewport fit failed" : null,
    layoutReport.result && layoutReport.result !== "PASS" ? "layout contract failed" : null,
    !staticContracts.demoDataExists ? "demo data missing" : null,
    !staticContracts.manifestExists ? "asset manifest missing" : null,
  ].filter(Boolean);
  const engineeringScaffoldReady = blockingFailures.length === 0;
  const status = !engineeringScaffoldReady
    ? "NOT_READY"
    : visualApprovalBlocked
      ? "ENGINEERING_SCAFFOLD_READY"
      : "VISUAL_REVIEW_READY";

  const report = {
    status,
    generatedAt: new Date().toISOString(),
    route,
    targetViewport: viewport,
    engineeringScaffoldReady,
    visualApprovalBlocked,
    visualApprovalBlockedReason: visualApprovalBlocked ? "Visual parity is FAIL and clean assets are still missing." : null,
    productionReady: false,
    commands,
    staticContracts,
    interactionSmoke,
    viewportFit,
    layout: {
      result: layoutReport.result ?? "UNKNOWN",
      reportPath: files.layoutReport,
    },
    visual: {
      result: visualResult,
      fullMismatchPercent,
      reportPath: files.visualReport,
      reason: visualApprovalBlocked ? "Visual parity still blocked by missing clean assets." : "Provisional visual parity passed.",
    },
    artifacts: {
      desktopScaffold: files.engineeringScaffold,
      sideBySide: files.engineeringSideBySide,
      visualDiff: files.engineeringDiff,
      report: engineeringReportPath,
      markdown: engineeringMarkdownPath,
      zip: engineeringZipPath,
    },
    blockingFailures,
  };

  await writeFile(engineeringReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const markdown = markdownFor(report);
  await writeFile(engineeringMarkdownPath, markdown, "utf8");
  await writeFile(markdownPath, markdown, "utf8");
  zipArtifacts();

  console.log(`\nStudent dashboard status: ${report.status}`);
  console.log(`Engineering scaffold: ${report.engineeringScaffoldReady ? "ready" : "not ready"}`);
  console.log(`Visual approval blocked: ${report.visualApprovalBlocked}`);
  console.log(`Viewport fit: ${report.viewportFit.status}`);
  console.log(`Visual parity: ${report.visual.result}`);
  if (report.visualApprovalBlocked) console.log("Visual parity still blocked by missing clean assets.");
  console.log(`Report: ${engineeringReportPath}`);
  console.log(`Markdown: ${engineeringMarkdownPath}`);
  console.log(`Zip: ${engineeringZipPath}`);

  if (report.status === "NOT_READY") process.exit(1);
}

await main();
