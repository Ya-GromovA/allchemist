import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { request, chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = resolve(root, "apps/web");
const nextBin = resolve(root, "node_modules/.bin/next");
const contractPath = resolve(root, "docs/design/screen-contracts/student-dashboard.layout-contract.json");
const outputDir = resolve(root, "artifacts/ui-snapshots/web");
const jsonReportPath = resolve(outputDir, "student-dashboard-layout-report.json");
const markdownReportPath = resolve(root, "docs/design/implementation-reports/student-dashboard-layout-contract.md");
const port = 3230;
const baseUrl = `http://127.0.0.1:${port}`;
const route = "/design-preview/student-dashboard";

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function ensureBuild() {
  if (!existsSync(resolve(webDir, ".next/BUILD_ID"))) {
    run("npm", ["run", "build:web"]);
  }
}

function startWeb() {
  const child = spawn(nextBin, ["start", "-p", String(port)], { cwd: webDir, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => process.stdout.write(`[apps/web] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[apps/web] ${chunk}`));
  return child;
}

async function waitFor(url) {
  const ctx = await request.newContext();
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await ctx.get(url);
      if (res.ok()) {
        await ctx.dispose();
        return;
      }
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  await ctx.dispose();
  throw new Error(`Timed out waiting for ${url}`);
}

function deltaReport(expected, actual) {
  return {
    x: Number((actual.x - expected.x).toFixed(2)),
    y: Number((actual.y - expected.y).toFixed(2)),
    width: Number((actual.width - expected.width).toFixed(2)),
    height: Number((actual.height - expected.height).toFixed(2)),
  };
}

function markdownFor(report) {
  const failing = report.zones.filter((zone) => zone.status !== "PASS");
  return [
    "# Student Dashboard Layout Contract",
    "",
    `Screen: \`${report.screenId}\``,
    `Route: \`${route}\``,
    `Viewport: \`${report.viewport.width}x${report.viewport.height}\``,
    "",
    `Layout contract: **${report.result}**`,
    "",
    "| Zone | Test id | Expected | Actual | Delta | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.zones.map((zone) => {
      const expected = `${zone.expected.x},${zone.expected.y},${zone.expected.width}x${zone.expected.height}`;
      const actual = zone.actual ? `${zone.actual.x},${zone.actual.y},${zone.actual.width}x${zone.actual.height}` : "missing";
      const delta = zone.delta ? `${zone.delta.x},${zone.delta.y},${zone.delta.width},${zone.delta.height}` : "n/a";
      return `| ${zone.label} | \`${zone.requiredTestId}\` | ${expected} | ${actual} | ${delta} | ${zone.status} |`;
    }),
    "",
    "## Failing Zones",
    "",
    failing.length ? failing.map((zone) => `- ${zone.label}: ${zone.reason}`).join("\n") : "- None",
    "",
  ].join("\n");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(markdownReportPath), { recursive: true });
  const contract = JSON.parse(await readFile(contractPath, "utf8"));

  ensureBuild();
  const web = startWeb();
  try {
    await waitFor(`${baseUrl}${route}`);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: contract.viewport, deviceScaleFactor: contract.viewport.deviceScaleFactor });
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });

      const zones = [];
      for (const zone of contract.zones) {
        const locator = page.getByTestId(zone.requiredTestId);
        const count = await locator.count();
        if (count === 0) {
          zones.push({
            id: zone.id,
            label: zone.label,
            requiredTestId: zone.requiredTestId,
            expected: zone,
            actual: null,
            delta: null,
            status: "FAIL",
            reason: "Required element missing.",
          });
          continue;
        }
        const box = await locator.first().boundingBox();
        if (!box) {
          zones.push({
            id: zone.id,
            label: zone.label,
            requiredTestId: zone.requiredTestId,
            expected: zone,
            actual: null,
            delta: null,
            status: "FAIL",
            reason: "Element has no bounding box.",
          });
          continue;
        }
        const actual = {
          x: Number(box.x.toFixed(2)),
          y: Number(box.y.toFixed(2)),
          width: Number(box.width.toFixed(2)),
          height: Number(box.height.toFixed(2)),
        };
        const delta = deltaReport(zone, actual);
        const positionDelta = Math.max(Math.abs(delta.x), Math.abs(delta.y));
        const sizeDelta = Math.max(Math.abs(delta.width), Math.abs(delta.height));
        const passed = positionDelta <= zone.maxPositionDeltaPx && sizeDelta <= zone.maxSizeDeltaPx;
        zones.push({
          id: zone.id,
          label: zone.label,
          requiredTestId: zone.requiredTestId,
          expected: zone,
          actual,
          delta,
          positionDelta,
          sizeDelta,
          status: passed ? "PASS" : "FAIL",
          reason: passed ? "Within contract tolerance." : `Position delta ${positionDelta}px / size delta ${sizeDelta}px exceeds ${zone.maxPositionDeltaPx}px / ${zone.maxSizeDeltaPx}px.`,
        });
      }

      const result = zones.every((zone) => zone.status === "PASS") ? "PASS" : "FAIL";
      const report = {
        result,
        generatedAt: new Date().toISOString(),
        screenId: contract.screenId,
        viewport: contract.viewport,
        contractPath,
        route,
        zones,
        artifacts: {
          jsonReportPath,
          markdownReportPath,
        },
      };

      await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      await writeFile(markdownReportPath, markdownFor(report), "utf8");

      console.log(`Layout contract: ${result}`);
      for (const zone of zones) {
        console.log(`- ${zone.label}: ${zone.status}`);
      }
      console.log(`Report: ${jsonReportPath}`);
      console.log(`Markdown: ${markdownReportPath}`);

      if (result !== "PASS") process.exitCode = 1;
    } finally {
      await browser.close();
    }
  } finally {
    web.kill("SIGTERM");
  }
}

await main();
