import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const requiredAssets = [
  "shared-logo-allchemist-mark",
  "shared-logo-allchemist-lockup",
  "nav-home",
  "nav-courses",
  "nav-theory",
  "nav-tasks",
  "nav-labs",
  "nav-visualization",
  "nav-references",
  "nav-exams",
  "nav-diagnostics",
  "nav-ai-mentor",
  "nav-progress",
  "nav-messages",
  "nav-settings",
  "quick-theory",
  "quick-tasks",
  "quick-labs",
  "quick-3d-molecules",
  "quick-periodic-table",
  "quick-simulators",
  "quick-microscope",
  "quick-exams",
  "quick-ai-mentor",
  "status-search",
  "status-bell",
  "status-calendar",
  "status-profile-placeholder",
  "status-repeat",
  "status-lock",
  "status-close",
  "clean-ai-assistant-robot-dashboard",
  "clean-ai-assistant-bubble-dashboard",
  "clean-sidebar-license-flask-glow",
  "clean-chemistry-hero-flask",
  "clean-live-lesson-newton-cradle",
  "clean-popular-neutralization",
  "clean-popular-free-fall",
  "clean-popular-plant-cell",
  "clean-locked-anatomy-human",
];

const expectedFiles = [
  "apps/web/public/design-assets/shared/logo/allchemist-mark.svg",
  "apps/web/public/design-assets/shared/logo/allchemist-logo-lockup.svg",
  "apps/web/public/design-assets/shared/icons/search.svg",
  "apps/web/public/design-assets/shared/icons/bell.svg",
  "apps/web/public/design-assets/shared/icons/calendar.svg",
  "apps/web/public/design-assets/shared/icons/profile-placeholder.svg",
  "apps/web/public/design-assets/shared/icons/repeat.svg",
  "apps/web/public/design-assets/shared/icons/lock.svg",
  "apps/web/public/design-assets/shared/icons/close.svg",
  ...[
    "nav-home",
    "nav-courses",
    "nav-theory",
    "nav-tasks",
    "nav-labs",
    "nav-visualization",
    "nav-references",
    "nav-exams",
    "nav-diagnostics",
    "nav-ai-mentor",
    "nav-progress",
    "nav-messages",
    "nav-settings",
    "quick-theory",
    "quick-tasks",
    "quick-labs",
    "quick-3d-molecules",
    "quick-periodic-table",
    "quick-simulators",
    "quick-microscope",
    "quick-exams",
    "quick-ai-mentor",
    "search",
    "bell",
    "calendar",
    "profile-placeholder",
    "repeat",
    "lock",
    "close",
  ].map((name) => `apps/web/public/design-assets/student-dashboard/clean/icons/${name}.svg`),
  "apps/web/public/design-assets/student-dashboard/clean/assistant/assistant-robot-dashboard.svg",
  "apps/web/public/design-assets/student-dashboard/clean/assistant/assistant-bubble-dashboard.svg",
  "apps/web/public/design-assets/shared/decor/license-flask-glow.svg",
  "apps/web/public/design-assets/student-dashboard/clean/illustrations/chemistry-hero-flask.svg",
  "apps/web/public/design-assets/student-dashboard/clean/illustrations/live-lesson-newton-cradle.svg",
  "apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-neutralization.svg",
  "apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-free-fall.svg",
  "apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-plant-cell.svg",
  "apps/web/public/design-assets/student-dashboard/clean/illustrations/locked-anatomy-human.svg",
];

const temporaryIllustrationIds = [
  "continue-learning-chemistry-hero-art",
  "live-lesson-physics-newton-art",
  "popular-thumbnail-chemistry-neutralization",
  "popular-thumbnail-physics-free-fall",
  "popular-thumbnail-biology-plant-cell",
  "locked-feature-anatomy-visual",
  "ai-assistant-robot",
];

const replacedTemporaryAssetPaths = [
  "/design-assets/student-dashboard/illustrations/chemistry-hero-temporary.png",
  "/design-assets/student-dashboard/illustrations/live-lesson-newton-temporary.png",
  "/design-assets/student-dashboard/thumbnails/popular-chemistry-neutralization-temporary.png",
  "/design-assets/student-dashboard/thumbnails/popular-physics-free-fall-temporary.png",
  "/design-assets/student-dashboard/thumbnails/popular-biology-plant-cell-temporary.png",
  "/design-assets/student-dashboard/illustrations/locked-anatomy-temporary.png",
  "/design-assets/student-dashboard/assistant/robot-temporary.png",
];

function stripGoldenOverlay(css) {
  return css.replace(/\.student-golden-overlay\s*\{[\s\S]*?\n\}/g, "");
}

async function main() {
  const manifestPath = resolve(root, "apps/web/public/design-assets/student-dashboard/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const manifestIds = new Set(manifest.assets.map((asset) => asset.id));

  const missingFiles = expectedFiles.filter((file) => !existsSync(resolve(root, file)));
  const missingManifestAssets = requiredAssets.filter((id) => !manifestIds.has(id));
  const missingTemporaryDocs = temporaryIllustrationIds.filter((id) => {
    const asset = manifest.assets.find((entry) => entry.id === id);
    return !asset || !String(asset.status ?? "").includes("temporary") || !asset.finalizationNote;
  });

  const component = await readFile(resolve(root, "apps/web/components/student-dashboard-preview.tsx"), "utf8");
  const css = await readFile(resolve(root, "apps/web/app/globals.css"), "utf8");
  const cssWithoutOverlay = stripGoldenOverlay(css);
  const forbiddenScreenshotHits = [
    "approved-student-dashboard.png",
    "golden-approved-web-student-dashboard.png",
  ].filter((asset) => component.includes(asset) || cssWithoutOverlay.includes(asset));
  const replacedTemporaryUsage = replacedTemporaryAssetPaths.filter((asset) => component.includes(asset) || css.includes(asset));

  const result = {
    status: missingFiles.length === 0 && missingManifestAssets.length === 0 && missingTemporaryDocs.length === 0 && forbiddenScreenshotHits.length === 0 && replacedTemporaryUsage.length === 0 ? "PASS" : "FAIL",
    requiredAssetCount: requiredAssets.length,
    expectedFileCount: expectedFiles.length,
    missingFiles,
    missingManifestAssets,
    missingTemporaryDocs,
    forbiddenScreenshotHits,
    replacedTemporaryUsage,
  };

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exit(1);
}

await main();
