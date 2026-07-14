import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "artifacts/ui-snapshots/web");
const zonesDir = resolve(root, "apps/web/public/design-preview/student-dashboard/zones");
const implementationPath = resolve(outputDir, "student-dashboard-desktop-parity-1672x941.png");
const jsonReportPath = resolve(outputDir, "student-dashboard-zone-parity-report.json");
const markdownReportPath = resolve(root, "docs/design/implementation-reports/student-dashboard-zone-parity.md");
const pixelThreshold = 24;

const zones = [
  { id: "sidebar", label: "sidebar", crop: "sidebar.png", x: 0, y: 0, width: 236, height: 941 },
  { id: "first_row_cards", label: "first row cards", crop: "first-row-cards.png", x: 268, y: 92, width: 1368, height: 260 },
  { id: "popular_now_card", label: "popular now card", crop: "popular-now-card.png", x: 268, y: 738, width: 390, height: 186 },
  { id: "locked_feature_card", label: "locked feature card", crop: "locked-feature-card.png", x: 1020, y: 738, width: 430, height: 186 },
  { id: "ai_assistant_widget", label: "AI assistant widget", crop: "ai-assistant-widget.png", x: 1390, y: 735, width: 260, height: 190 },
];

async function dataUrl(path) {
  const buffer = await readFile(path);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function summarize(metrics) {
  const pixelCount = metrics.width * metrics.height;
  return {
    ...metrics,
    pixelCount,
    mismatchPercent: Number(((metrics.mismatchedPixels / pixelCount) * 100).toFixed(2)),
    meanDelta255: Number((metrics.totalDelta / pixelCount).toFixed(2)),
  };
}

function markdown(report) {
  return [
    "# Student Dashboard Zone Parity",
    "",
    `Implementation: \`${implementationPath}\``,
    `Pixel threshold: \`${pixelThreshold}\``,
    "",
    "| Zone | Mismatch | Mean delta | Crop |",
    "| --- | ---: | ---: | --- |",
    ...report.zones.map((zone) => `| ${zone.label} | ${zone.mismatchPercent}% | ${zone.meanDelta255} | \`${zone.cropPath}\` |`),
    "",
    "## Worst Zones",
    "",
    ...report.sortedZones.slice(0, 5).map((zone) => `- ${zone.label}: ${zone.mismatchPercent}%`),
    "",
  ].join("\n");
}

await mkdir(outputDir, { recursive: true });
await mkdir(dirname(markdownReportPath), { recursive: true });
if (!existsSync(implementationPath)) throw new Error(`Missing implementation screenshot: ${implementationPath}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  const implementation = await dataUrl(implementationPath);
  const results = [];
  for (const zone of zones) {
    const cropPath = resolve(zonesDir, zone.crop);
    if (!existsSync(cropPath)) throw new Error(`Missing approved zone crop: ${cropPath}`);
    const crop = await dataUrl(cropPath);
    await page.setContent(`<html><body style="margin:0"><canvas width="${zone.width}" height="${zone.height}"></canvas></body></html>`);
    const raw = await page.evaluate(
      async ({ cropSrc, implementationSrc, zoneConfig, threshold }) => {
        function load(src) {
          return new Promise((resolveImage, rejectImage) => {
            const image = new Image();
            image.onload = () => resolveImage(image);
            image.onerror = rejectImage;
            image.src = src;
          });
        }
        const [cropImage, implementationImage] = await Promise.all([load(cropSrc), load(implementationSrc)]);
        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(cropImage, 0, 0, zoneConfig.width, zoneConfig.height);
        const approvedData = ctx.getImageData(0, 0, zoneConfig.width, zoneConfig.height);
        ctx.clearRect(0, 0, zoneConfig.width, zoneConfig.height);
        ctx.drawImage(implementationImage, zoneConfig.x, zoneConfig.y, zoneConfig.width, zoneConfig.height, 0, 0, zoneConfig.width, zoneConfig.height);
        const implementationData = ctx.getImageData(0, 0, zoneConfig.width, zoneConfig.height);
        const metrics = { width: zoneConfig.width, height: zoneConfig.height, mismatchedPixels: 0, totalDelta: 0, maxDelta: 0 };
        for (let i = 0; i < approvedData.data.length; i += 4) {
          const r = Math.abs(approvedData.data[i] - implementationData.data[i]);
          const g = Math.abs(approvedData.data[i + 1] - implementationData.data[i + 1]);
          const b = Math.abs(approvedData.data[i + 2] - implementationData.data[i + 2]);
          const delta = Math.max(r, g, b);
          if (delta > threshold) metrics.mismatchedPixels += 1;
          metrics.totalDelta += (r + g + b) / 3;
          metrics.maxDelta = Math.max(metrics.maxDelta, delta);
        }
        return metrics;
      },
      { cropSrc: crop, implementationSrc: implementation, zoneConfig: zone, threshold: pixelThreshold },
    );
    results.push({ ...zone, cropPath, ...summarize(raw) });
  }
  const sortedZones = [...results].sort((a, b) => b.mismatchPercent - a.mismatchPercent);
  const report = {
    result: "REPORT_ONLY",
    generatedAt: new Date().toISOString(),
    pixelThreshold,
    zones: results,
    sortedZones,
    artifacts: {
      implementationPath,
      jsonReportPath,
      markdownReportPath,
    },
  };
  await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownReportPath, markdown(report), "utf8");
  console.log("Student dashboard zone parity:");
  for (const zone of sortedZones) {
    console.log(`- ${zone.label}: ${zone.mismatchPercent}%`);
  }
  console.log(`Report: ${jsonReportPath}`);
  console.log(`Markdown: ${markdownReportPath}`);
} finally {
  await browser.close();
}
