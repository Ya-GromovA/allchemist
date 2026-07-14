import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { request, chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = resolve(root, "apps/web");
const nextBin = resolve(root, "node_modules/.bin/next");
const outputDir = resolve(root, "artifacts/ui-snapshots/web");
const zipPath = resolve(root, "artifacts/ui-snapshots/student-dashboard-visual-parity.zip");
const goldenPath = resolve(root, "apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png");
const markdownReportPath = resolve(root, "docs/design/implementation-reports/student-dashboard-visual-parity.md");
const jsonReportPath = resolve(outputDir, "student-dashboard-parity-report.json");
const port = 3220;
const baseUrl = `http://127.0.0.1:${port}`;
const route = "/design-preview/student-dashboard";
const greetingText = "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u0410\u043b\u0438\u043d\u0430";
const parityViewport = { width: 1672, height: 941 };

const parityDesktopPath = resolve(outputDir, "student-dashboard-desktop-parity-1672x941.png");
const overlayPath = resolve(outputDir, "student-dashboard-overlay-check.png");
const sideBySidePath = resolve(outputDir, "student-dashboard-side-by-side.png");
const visualDiffPath = resolve(outputDir, "student-dashboard-visual-diff.png");

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

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error(`Horizontal overflow on ${page.url()}`);
}

async function assertPreviewReady(page) {
  await page.locator(".student-shell").waitFor();
  await page.locator(".student-sidebar").waitFor();
  await page.locator(".student-topbar").waitFor();
  await page.locator(".student-assistant").waitFor();
  const textOk = await page.locator("body").evaluate((body, expected) => body.textContent?.includes(expected) ?? false, greetingText);
  if (!textOk) throw new Error("Student dashboard greeting text was not rendered correctly.");
  await assertNoOverflow(page);
}

function createZip() {
  const script = [
    "from pathlib import Path",
    "from zipfile import ZipFile, ZIP_DEFLATED",
    `zip_path = Path(${JSON.stringify(zipPath)})`,
    "zip_path.parent.mkdir(parents=True, exist_ok=True)",
    "files = [",
    `    (Path(${JSON.stringify(goldenPath)}), 'golden-approved-web-student-dashboard.png'),`,
    `    (Path(${JSON.stringify(parityDesktopPath)}), 'student-dashboard-desktop-parity-1672x941.png'),`,
    `    (Path(${JSON.stringify(overlayPath)}), 'student-dashboard-overlay-check.png'),`,
    `    (Path(${JSON.stringify(sideBySidePath)}), 'student-dashboard-side-by-side.png'),`,
    `    (Path(${JSON.stringify(visualDiffPath)}), 'student-dashboard-visual-diff.png'),`,
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

async function readPngAsDataUrl(path) {
  const buffer = await readFile(path);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

async function getImageDimensions(browser, path) {
  const page = await browser.newPage({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 });
  try {
    const dataUrl = await readPngAsDataUrl(path);
    return await page.evaluate(
      (src) =>
        new Promise((resolveImage, rejectImage) => {
          const image = new Image();
          image.onload = () => resolveImage({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => rejectImage(new Error(`Unable to load image ${src.slice(0, 64)}`));
          image.src = src;
        }),
      dataUrl,
    );
  } finally {
    await page.close();
  }
}

async function createComparisonImages(browser) {
  const golden = await readPngAsDataUrl(goldenPath);
  const implementation = await readPngAsDataUrl(parityDesktopPath);

  const sideBySide = await browser.newPage({ viewport: { width: parityViewport.width * 2, height: parityViewport.height }, deviceScaleFactor: 1 });
  try {
    await sideBySide.setContent(`<html><body style="margin:0;background:#eef5ff"><canvas width="${parityViewport.width * 2}" height="${parityViewport.height}"></canvas></body></html>`);
    await sideBySide.evaluate(
      async ({ goldenSrc, implementationSrc, width, height }) => {
        function load(src) {
          return new Promise((resolveImage, rejectImage) => {
            const image = new Image();
            image.onload = () => resolveImage(image);
            image.onerror = rejectImage;
            image.src = src;
          });
        }
        const [goldenImage, implementationImage] = await Promise.all([load(goldenSrc), load(implementationSrc)]);
        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#eef5ff";
        ctx.fillRect(0, 0, width * 2, height);
        ctx.drawImage(goldenImage, 0, 0, width, height);
        ctx.drawImage(implementationImage, width, 0, width, height);
      },
      { goldenSrc: golden, implementationSrc: implementation, width: parityViewport.width, height: parityViewport.height },
    );
    await sideBySide.locator("canvas").screenshot({ path: sideBySidePath });
  } finally {
    await sideBySide.close();
  }

  const diff = await browser.newPage({ viewport: parityViewport, deviceScaleFactor: 1 });
  try {
    await diff.setContent(`<html><body style="margin:0;background:#fff"><canvas width="${parityViewport.width}" height="${parityViewport.height}"></canvas></body></html>`);
    await diff.evaluate(
      async ({ goldenSrc, implementationSrc, width, height }) => {
        function load(src) {
          return new Promise((resolveImage, rejectImage) => {
            const image = new Image();
            image.onload = () => resolveImage(image);
            image.onerror = rejectImage;
            image.src = src;
          });
        }
        const [goldenImage, implementationImage] = await Promise.all([load(goldenSrc), load(implementationSrc)]);
        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        ctx.drawImage(goldenImage, 0, 0, width, height);
        const goldenData = ctx.getImageData(0, 0, width, height);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(implementationImage, 0, 0, width, height);
        const implementationData = ctx.getImageData(0, 0, width, height);
        const output = ctx.createImageData(width, height);
        for (let i = 0; i < output.data.length; i += 4) {
          const r = Math.abs(goldenData.data[i] - implementationData.data[i]);
          const g = Math.abs(goldenData.data[i + 1] - implementationData.data[i + 1]);
          const b = Math.abs(goldenData.data[i + 2] - implementationData.data[i + 2]);
          const delta = Math.max(r, g, b);
          output.data[i] = Math.min(255, delta * 2);
          output.data[i + 1] = delta > 18 ? 36 : 245;
          output.data[i + 2] = delta > 18 ? 95 : 255;
          output.data[i + 3] = 255;
        }
        ctx.putImageData(output, 0, 0);
      },
      { goldenSrc: golden, implementationSrc: implementation, width: parityViewport.width, height: parityViewport.height },
    );
    await diff.locator("canvas").screenshot({ path: visualDiffPath });
  } finally {
    await diff.close();
  }
}

async function capture() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const goldenDimensions = await getImageDimensions(browser, goldenPath);
    if (goldenDimensions.width !== parityViewport.width || goldenDimensions.height !== parityViewport.height) {
      throw new Error(`Golden reference dimensions are ${goldenDimensions.width}x${goldenDimensions.height}, expected ${parityViewport.width}x${parityViewport.height}.`);
    }

    const desktop = await browser.newPage({ viewport: parityViewport, deviceScaleFactor: 1 });
    await desktop.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await assertPreviewReady(desktop);
    await desktop.waitForTimeout(300);
    await desktop.screenshot({ path: parityDesktopPath, fullPage: false });
    await desktop.close();

    const overlay = await browser.newPage({ viewport: parityViewport, deviceScaleFactor: 1 });
    await overlay.goto(`${baseUrl}${route}?overlay=1`, { waitUntil: "networkidle" });
    await assertPreviewReady(overlay);
    await overlay.waitForTimeout(300);
    await overlay.screenshot({ path: overlayPath, fullPage: false });
    await overlay.close();

    await createComparisonImages(browser);
  } finally {
    await browser.close();
  }

  createZip();
}

ensureBuild();
const web = startWeb();
try {
  await waitFor(`${baseUrl}${route}`);
  await capture();
  console.log("UI snapshots captured:");
  console.log(`- ${goldenPath}`);
  console.log(`- ${parityDesktopPath}`);
  console.log(`- ${overlayPath}`);
  console.log(`- ${sideBySidePath}`);
  console.log(`- ${visualDiffPath}`);
  console.log(`- ${zipPath}`);
} finally {
  web.kill("SIGTERM");
}
