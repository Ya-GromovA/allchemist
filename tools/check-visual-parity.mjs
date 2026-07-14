import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "artifacts/ui-snapshots/web");
const goldenPath = resolve(root, "apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png");
const implementationPath = resolve(outputDir, "student-dashboard-desktop-parity-1672x941.png");
const overlayPath = resolve(outputDir, "student-dashboard-overlay-check.png");
const sideBySidePath = resolve(outputDir, "student-dashboard-side-by-side.png");
const diffPath = resolve(outputDir, "student-dashboard-visual-diff.png");
const jsonReportPath = resolve(outputDir, "student-dashboard-parity-report.json");
const markdownReportPath = resolve(root, "docs/design/implementation-reports/student-dashboard-visual-parity.md");
const zipPath = resolve(root, "artifacts/ui-snapshots/student-dashboard-visual-parity.zip");

const expected = { width: 1672, height: 941 };
const pixelThreshold = 24;
const passThresholds = {
  fullMismatchPercent: 12,
  zoneMismatchPercent: 22,
  veryHighMismatchPercent: 35,
};

const zones = [
  { id: "sidebar", label: "sidebar", x: 0, y: 0, width: 236, height: 941 },
  { id: "topbar", label: "topbar", x: 236, y: 0, width: 1436, height: 88 },
  { id: "greeting_header", label: "greeting/header", x: 268, y: 16, width: 360, height: 56 },
  { id: "first_row_cards", label: "first row cards", x: 268, y: 92, width: 1368, height: 260 },
  { id: "quick_access_strip", label: "quick access strip", x: 268, y: 366, width: 1368, height: 112 },
  { id: "assignments_card", label: "assignments card", x: 268, y: 500, width: 390, height: 222 },
  { id: "progress_card", label: "progress card", x: 674, y: 500, width: 420, height: 222 },
  { id: "weak_topics_card", label: "weak topics card", x: 1110, y: 500, width: 526, height: 222 },
  { id: "popular_now_card", label: "popular now card", x: 268, y: 738, width: 390, height: 186 },
  { id: "weekly_progress_card", label: "weekly progress card", x: 674, y: 738, width: 330, height: 186 },
  { id: "locked_feature_card", label: "locked feature card", x: 1020, y: 738, width: 430, height: 186 },
  { id: "ai_assistant_widget", label: "AI assistant widget", x: 1390, y: 735, width: 260, height: 190 },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function readPngAsDataUrl(path) {
  const buffer = await readFile(path);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function createZip() {
  const script = [
    "from pathlib import Path",
    "from zipfile import ZipFile, ZIP_DEFLATED",
    `zip_path = Path(${JSON.stringify(zipPath)})`,
    "zip_path.parent.mkdir(parents=True, exist_ok=True)",
    "files = [",
    `    (Path(${JSON.stringify(goldenPath)}), 'golden-approved-web-student-dashboard.png'),`,
    `    (Path(${JSON.stringify(implementationPath)}), 'student-dashboard-desktop-parity-1672x941.png'),`,
    `    (Path(${JSON.stringify(overlayPath)}), 'student-dashboard-overlay-check.png'),`,
    `    (Path(${JSON.stringify(sideBySidePath)}), 'student-dashboard-side-by-side.png'),`,
    `    (Path(${JSON.stringify(diffPath)}), 'student-dashboard-visual-diff.png'),`,
    `    (Path(${JSON.stringify(jsonReportPath)}), 'student-dashboard-parity-report.json'),`,
    `    (Path(${JSON.stringify(markdownReportPath)}), 'student-dashboard-visual-parity.md'),`,
    "]",
    "with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zf:",
    "    for file, arcname in files:",
    "        if file.exists():",
    "            zf.write(file, arcname)",
  ].join("\n");
  run("python3", ["-c", script]);
}

function statusFor(mismatchPercent) {
  if (mismatchPercent > passThresholds.veryHighMismatchPercent) return "VERY_HIGH";
  if (mismatchPercent > passThresholds.zoneMismatchPercent) return "FAIL";
  return "OK";
}

function summarizeMetrics(metrics) {
  const pixelCount = metrics.width * metrics.height;
  return {
    ...metrics,
    pixelCount,
    mismatchPercent: Number(((metrics.mismatchedPixels / pixelCount) * 100).toFixed(2)),
    meanDelta: Number((metrics.totalDelta / (pixelCount * 255)).toFixed(4)),
    meanDelta255: Number((metrics.totalDelta / pixelCount).toFixed(2)),
    maxDelta: metrics.maxDelta,
  };
}

function markdownFor(report) {
  const failingZones = report.zones.filter((zone) => zone.status !== "OK");
  const topFailingZones = report.topFailingZones ?? failingZones.sort((a, b) => b.mismatchPercent - a.mismatchPercent).slice(0, 5);
  const lines = [
    "# Student Dashboard Visual Parity",
    "",
    `Figma target: \`APPROVED_WEB_STUDENT_DASHBOARD\`, node \`3:12\``,
    `Preview route: \`/design-preview/student-dashboard\``,
    `Viewport: \`${expected.width}x${expected.height}\`, deviceScaleFactor \`1\``,
    "",
    "## Result",
    "",
    `Visual parity: **${report.result}**`,
    `Full-screen mismatch: **${report.fullScreen.mismatchPercent}%**`,
    `Full-screen mean delta: **${report.fullScreen.meanDelta255} / 255**`,
    report.previous?.fullMismatchPercent == null ? "" : `Previous full-screen mismatch: **${report.previous.fullMismatchPercent}%**`,
    report.previous?.fullMismatchDelta == null ? "" : `Full-screen mismatch delta: **${report.previous.fullMismatchDelta}%**`,
    report.previous?.improved == null ? "" : `Improved vs previous: **${report.previous.improved ? "yes" : "no"}**`,
    "",
    "## Thresholds",
    "",
    `- Pixel mismatch threshold: max RGB delta greater than \`${pixelThreshold}\``,
    `- Full-screen provisional pass threshold: \`${passThresholds.fullMismatchPercent}%\``,
    `- Zone provisional pass threshold: \`${passThresholds.zoneMismatchPercent}%\``,
    `- Very high zone mismatch threshold: \`${passThresholds.veryHighMismatchPercent}%\``,
    "",
    "## Zone Summary",
    "",
    "| Zone | Box | Mismatch | Mean delta | Status |",
    "| --- | --- | ---: | ---: | --- |",
    ...report.zones.map((zone) => `| ${zone.label} | ${zone.x},${zone.y},${zone.width}x${zone.height} | ${zone.mismatchPercent}% | ${zone.meanDelta255} | ${zone.status} |`),
    "",
    "## Failing Zones",
    "",
    failingZones.length ? failingZones.map((zone) => `- ${zone.label}: ${zone.mismatchPercent}% (${zone.status})`).join("\n") : "- None",
    "",
    "## Top 5 Failing Zones",
    "",
    topFailingZones.length ? topFailingZones.map((zone) => `- ${zone.label}: ${zone.mismatchPercent}% (${zone.status})`).join("\n") : "- None",
    "",
    "## Artifacts",
    "",
    `- Golden: \`${goldenPath}\``,
    `- Implementation: \`${implementationPath}\``,
    `- Overlay: \`${overlayPath}\``,
    `- Side-by-side: \`${sideBySidePath}\``,
    `- Visual diff: \`${diffPath}\``,
    `- JSON report: \`${jsonReportPath}\``,
    `- Zip: \`${zipPath}\``,
    "",
    "## Acceptance",
    "",
    report.result === "PASS"
      ? "The provisional visual parity check passed. This does not make the route production-ready."
      : "The provisional visual parity check failed. Do not call this screen ready for manual review.",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(dirname(markdownReportPath), { recursive: true });

  for (const path of [goldenPath, implementationPath]) {
    if (!existsSync(path)) throw new Error(`Missing required image: ${path}`);
  }

  let previousReport = null;
  if (existsSync(jsonReportPath)) {
    try {
      previousReport = JSON.parse(await readFile(jsonReportPath, "utf8"));
    } catch {}
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: expected, deviceScaleFactor: 1 });
    const goldenSrc = await readPngAsDataUrl(goldenPath);
    const implementationSrc = await readPngAsDataUrl(implementationPath);
    await page.setContent(`<html><body style="margin:0;background:#fff"><canvas width="${expected.width}" height="${expected.height}"></canvas></body></html>`);
    const comparison = await page.evaluate(
      async ({ goldenSrc: goldenUrl, implementationSrc: implementationUrl, expectedSize, zonesToMeasure, threshold }) => {
        function load(src) {
          return new Promise((resolveImage, rejectImage) => {
            const image = new Image();
            image.onload = () => resolveImage(image);
            image.onerror = rejectImage;
            image.src = src;
          });
        }

        const [goldenImage, implementationImage] = await Promise.all([load(goldenUrl), load(implementationUrl)]);
        const dimensions = {
          golden: { width: goldenImage.naturalWidth, height: goldenImage.naturalHeight },
          implementation: { width: implementationImage.naturalWidth, height: implementationImage.naturalHeight },
        };
        if (
          dimensions.golden.width !== expectedSize.width ||
          dimensions.golden.height !== expectedSize.height ||
          dimensions.implementation.width !== expectedSize.width ||
          dimensions.implementation.height !== expectedSize.height
        ) {
          return { dimensions, dimensionError: true };
        }

        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(goldenImage, 0, 0, expectedSize.width, expectedSize.height);
        const goldenData = ctx.getImageData(0, 0, expectedSize.width, expectedSize.height);
        ctx.clearRect(0, 0, expectedSize.width, expectedSize.height);
        ctx.drawImage(implementationImage, 0, 0, expectedSize.width, expectedSize.height);
        const implementationData = ctx.getImageData(0, 0, expectedSize.width, expectedSize.height);

        function empty(width, height) {
          return { width, height, mismatchedPixels: 0, totalDelta: 0, maxDelta: 0 };
        }

        const full = empty(expectedSize.width, expectedSize.height);
        const zoneMetrics = zonesToMeasure.map((zone) => ({ ...zone, ...empty(zone.width, zone.height) }));
        const diff = ctx.createImageData(expectedSize.width, expectedSize.height);

        for (let y = 0; y < expectedSize.height; y += 1) {
          for (let x = 0; x < expectedSize.width; x += 1) {
            const i = (y * expectedSize.width + x) * 4;
            const r = Math.abs(goldenData.data[i] - implementationData.data[i]);
            const g = Math.abs(goldenData.data[i + 1] - implementationData.data[i + 1]);
            const b = Math.abs(goldenData.data[i + 2] - implementationData.data[i + 2]);
            const delta = Math.max(r, g, b);
            const meanDelta = (r + g + b) / 3;
            if (delta > threshold) full.mismatchedPixels += 1;
            full.totalDelta += meanDelta;
            full.maxDelta = Math.max(full.maxDelta, delta);

            for (const zone of zoneMetrics) {
              if (x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height) {
                if (delta > threshold) zone.mismatchedPixels += 1;
                zone.totalDelta += meanDelta;
                zone.maxDelta = Math.max(zone.maxDelta, delta);
              }
            }

            diff.data[i] = delta > threshold ? 255 : Math.min(255, delta * 2);
            diff.data[i + 1] = delta > threshold ? Math.max(0, 100 - delta) : 245;
            diff.data[i + 2] = delta > threshold ? 80 : 255;
            diff.data[i + 3] = 255;
          }
        }

        ctx.putImageData(diff, 0, 0);
        return { dimensions, dimensionError: false, full, zones: zoneMetrics };
      },
      { goldenSrc, implementationSrc, expectedSize: expected, zonesToMeasure: zones, threshold: pixelThreshold },
    );

    if (comparison.dimensionError) {
      throw new Error(`Image dimensions differ from expected ${expected.width}x${expected.height}: ${JSON.stringify(comparison.dimensions)}`);
    }

    await page.locator("canvas").screenshot({ path: diffPath });
    await page.close();

    const fullScreen = summarizeMetrics(comparison.full);
    const zoneReports = comparison.zones.map((zone) => {
      const summary = summarizeMetrics(zone);
      return { ...summary, status: statusFor(summary.mismatchPercent) };
    });
    const result =
      fullScreen.mismatchPercent <= passThresholds.fullMismatchPercent &&
      zoneReports.every((zone) => zone.mismatchPercent <= passThresholds.zoneMismatchPercent)
        ? "PASS"
        : "FAIL";
    const sortedZones = [...zoneReports].sort((a, b) => b.mismatchPercent - a.mismatchPercent);
    const topFailingZones = sortedZones.filter((zone) => zone.status !== "OK").slice(0, 5);
    const previousFullMismatch = previousReport?.fullScreen?.mismatchPercent ?? null;
    const fullMismatchDelta = previousFullMismatch == null ? null : Number((fullScreen.mismatchPercent - previousFullMismatch).toFixed(2));
    const improvedVsPrevious = fullMismatchDelta == null ? null : fullMismatchDelta < 0;

    const report = {
      result,
      generatedAt: new Date().toISOString(),
      expectedDimensions: expected,
      dimensions: comparison.dimensions,
      pixelThreshold,
      passThresholds,
      fullScreen,
      zones: zoneReports,
      sortedZones,
      topFailingZones,
      previous: {
        fullMismatchPercent: previousFullMismatch,
        fullMismatchDelta,
        improved: improvedVsPrevious,
      },
      artifacts: {
        goldenPath,
        implementationPath,
        overlayPath,
        sideBySidePath,
        diffPath,
        jsonReportPath,
        markdownReportPath,
        zipPath,
      },
    };

    await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(markdownReportPath, markdownFor(report), "utf8");
    createZip();

    console.log(`Visual parity: ${result}`);
    console.log(`Full-screen mismatch: ${fullScreen.mismatchPercent}%`);
    if (previousFullMismatch != null) {
      console.log(`Previous full-screen mismatch: ${previousFullMismatch}%`);
      console.log(`Full-screen mismatch delta: ${fullMismatchDelta}%`);
      console.log(`Improved vs previous: ${improvedVsPrevious ? "yes" : "no"}`);
    }
    console.log("Top 5 failing zones:");
    for (const zone of topFailingZones) {
      console.log(`- ${zone.label}: ${zone.mismatchPercent}% (${zone.status})`);
    }
    for (const zone of zoneReports) {
      console.log(`- ${zone.label}: ${zone.mismatchPercent}% (${zone.status})`);
    }
    console.log(`Report: ${jsonReportPath}`);
    console.log(`Markdown: ${markdownReportPath}`);
    console.log(`Zip: ${zipPath}`);
  } finally {
    await browser.close();
  }
}

await main();
