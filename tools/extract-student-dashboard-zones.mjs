import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const goldenPath = resolve(root, "apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png");
const zonesDir = resolve(root, "apps/web/public/design-preview/student-dashboard/zones");
const docsPath = resolve(root, "docs/design/assets/student-dashboard-zone-crops.md");

const zones = [
  { id: "sidebar", file: "sidebar.png", x: 0, y: 0, width: 236, height: 941, purpose: "Reference for real sidebar geometry, color and density." },
  { id: "greeting-header", file: "greeting-header.png", x: 268, y: 16, width: 360, height: 56, purpose: "Reference for topbar greeting typography and spacing." },
  { id: "first-row-cards", file: "first-row-cards.png", x: 268, y: 92, width: 1368, height: 260, purpose: "Reference for first-row card rhythm." },
  { id: "continue-learning-card", file: "continue-learning-card.png", x: 268, y: 92, width: 560, height: 260, purpose: "Temporary crop source for chemistry hero illustration area." },
  { id: "live-lesson-card", file: "live-lesson-card.png", x: 844, y: 92, width: 468, height: 260, purpose: "Temporary crop source for live lesson illustration area." },
  { id: "ai-recommendations-card", file: "ai-recommendations-card.png", x: 1330, y: 92, width: 306, height: 260, purpose: "Reference for AI recommendation density." },
  { id: "quick-access-strip", file: "quick-access-strip.png", x: 268, y: 366, width: 1368, height: 112, purpose: "Reference for quick access icon/card rhythm." },
  { id: "assignments-card", file: "assignments-card.png", x: 268, y: 500, width: 390, height: 222, purpose: "Reference for assignment card density." },
  { id: "progress-card", file: "progress-card.png", x: 674, y: 500, width: 420, height: 222, purpose: "Reference for progress ring rendering." },
  { id: "weak-topics-card", file: "weak-topics-card.png", x: 1110, y: 500, width: 526, height: 222, purpose: "Reference for weak topics density." },
  { id: "popular-now-card", file: "popular-now-card.png", x: 268, y: 738, width: 390, height: 186, purpose: "Temporary crop source for approved popular thumbnails." },
  { id: "weekly-progress-card", file: "weekly-progress-card.png", x: 674, y: 738, width: 330, height: 186, purpose: "Reference for weekly chart rendering." },
  { id: "locked-feature-card", file: "locked-feature-card.png", x: 1020, y: 738, width: 430, height: 186, purpose: "Temporary crop source for locked feature illustration." },
  { id: "ai-assistant-widget", file: "ai-assistant-widget.png", x: 1390, y: 735, width: 260, height: 190, purpose: "Temporary crop source for approved AI assistant avatar/bubble visual." },
];

async function readPngAsDataUrl(path) {
  const buffer = await readFile(path);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function markdown() {
  return [
    "# Student Dashboard Zone Crops",
    "",
    "Source: `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`",
    "Target: `APPROVED_WEB_STUDENT_DASHBOARD`, node `3:12`, viewport `1672x941`.",
    "",
    "These crops are approved-reference visual aids and temporary asset sources only. They must not be used to replace the full page or rasterize real text/buttons/cards.",
    "",
    "| Zone | Crop file | Coordinates | Purpose |",
    "| --- | --- | --- | --- |",
    ...zones.map((zone) => `| ${zone.id} | \`apps/web/public/design-preview/student-dashboard/zones/${zone.file}\` | x=${zone.x}, y=${zone.y}, w=${zone.width}, h=${zone.height} | ${zone.purpose} |`),
    "",
    "## Usage Rules",
    "",
    "- Allowed as temporary sources for illustration, thumbnail, avatar, logo or decorative art zones.",
    "- Not allowed as a full-screen UI replacement.",
    "- Dynamic text and interactive controls must remain real HTML/React components.",
    "- Replace temporary crops with clean exported Figma layer assets when available.",
    "",
  ].join("\n");
}

await mkdir(zonesDir, { recursive: true });
await mkdir(dirname(docsPath), { recursive: true });

const browser = await chromium.launch();
try {
  const golden = await readPngAsDataUrl(goldenPath);
  for (const zone of zones) {
    const page = await browser.newPage({ viewport: { width: zone.width, height: zone.height }, deviceScaleFactor: 1 });
    try {
      await page.setContent(`<html><body style="margin:0"><canvas width="${zone.width}" height="${zone.height}"></canvas></body></html>`);
      await page.evaluate(
        async ({ src, zoneConfig }) => {
          const image = await new Promise((resolveImage, rejectImage) => {
            const img = new Image();
            img.onload = () => resolveImage(img);
            img.onerror = rejectImage;
            img.src = src;
          });
          const canvas = document.querySelector("canvas");
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, zoneConfig.x, zoneConfig.y, zoneConfig.width, zoneConfig.height, 0, 0, zoneConfig.width, zoneConfig.height);
        },
        { src: golden, zoneConfig: zone },
      );
      await page.locator("canvas").screenshot({ path: resolve(zonesDir, zone.file) });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(docsPath, markdown(), "utf8");

console.log("Student dashboard zone crops extracted:");
for (const zone of zones) {
  console.log(`- ${zone.id}: ${resolve(zonesDir, zone.file)} (${zone.x},${zone.y},${zone.width}x${zone.height})`);
}
console.log(`Documentation: ${docsPath}`);
