import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const visualReportPath = resolve(root, "artifacts/ui-snapshots/web/student-dashboard-parity-report.json");
const layoutReportPath = resolve(root, "artifacts/ui-snapshots/web/student-dashboard-layout-report.json");
const zoneReportPath = resolve(root, "artifacts/ui-snapshots/web/student-dashboard-zone-parity-report.json");
const zipPath = resolve(root, "artifacts/ui-snapshots/student-dashboard-asset-parity-pass.zip");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function createZip() {
  const files = [
    ["apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png", "golden-approved-web-student-dashboard.png"],
    ["artifacts/ui-snapshots/web/student-dashboard-desktop-parity-1672x941.png", "student-dashboard-desktop-parity-1672x941.png"],
    ["artifacts/ui-snapshots/web/student-dashboard-overlay-check.png", "student-dashboard-overlay-check.png"],
    ["artifacts/ui-snapshots/web/student-dashboard-side-by-side.png", "student-dashboard-side-by-side.png"],
    ["artifacts/ui-snapshots/web/student-dashboard-visual-diff.png", "student-dashboard-visual-diff.png"],
    ["artifacts/ui-snapshots/web/student-dashboard-parity-report.json", "student-dashboard-parity-report.json"],
    ["artifacts/ui-snapshots/web/student-dashboard-layout-report.json", "student-dashboard-layout-report.json"],
    ["artifacts/ui-snapshots/web/student-dashboard-zone-parity-report.json", "student-dashboard-zone-parity-report.json"],
    ["docs/design/implementation-reports/student-dashboard-visual-parity.md", "student-dashboard-visual-parity.md"],
    ["docs/design/implementation-reports/student-dashboard-layout-contract.md", "student-dashboard-layout-contract.md"],
    ["docs/design/implementation-reports/student-dashboard-zone-parity.md", "student-dashboard-zone-parity.md"],
    ["docs/design/screen-contracts/student-dashboard.screen-contract.md", "student-dashboard.screen-contract.md"],
    ["docs/design/screen-contracts/student-dashboard.layout-contract.json", "student-dashboard.layout-contract.json"],
    ["docs/design/assets/student-dashboard-assets.md", "student-dashboard-assets.md"],
    ["docs/design/assets/student-dashboard-zone-crops.md", "student-dashboard-zone-crops.md"],
    ["docs/design/component-maps/student-dashboard-components.md", "student-dashboard-components.md"],
  ];
  const script = [
    "from pathlib import Path",
    "from zipfile import ZipFile, ZIP_DEFLATED",
    `root = Path(${JSON.stringify(root)})`,
    `zip_path = Path(${JSON.stringify(zipPath)})`,
    "zip_path.parent.mkdir(parents=True, exist_ok=True)",
    `files = ${JSON.stringify(files)}`,
    "with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zf:",
    "    for src, arcname in files:",
    "        path = root / src",
    "        if path.exists():",
    "            zf.write(path, arcname)",
    "    zones_dir = root / 'apps/web/public/design-preview/student-dashboard/zones'",
    "    if zones_dir.exists():",
    "        for path in sorted(zones_dir.glob('*.png')):",
    "            zf.write(path, 'zones/' + path.name)",
  ].join("\n");
  run("python3", ["-c", script]);
}

run("node", ["tools/extract-student-dashboard-zones.mjs"]);
run("node", ["tools/capture-ui-snapshots.mjs"]);
run("node", ["tools/check-visual-parity.mjs"]);
run("node", ["tools/check-layout-contract.mjs"]);
run("node", ["tools/check-student-dashboard-zone-parity.mjs"]);

const visual = JSON.parse(await readFile(visualReportPath, "utf8"));
const layout = JSON.parse(await readFile(layoutReportPath, "utf8"));
const zone = JSON.parse(await readFile(zoneReportPath, "utf8"));
const result = visual.result === "PASS" && layout.result === "PASS" ? "PASS" : "FAIL";

createZip();

console.log("");
console.log("Student dashboard quality summary");
console.log(`- Visual parity: ${visual.result}`);
console.log(`- Layout contract: ${layout.result}`);
console.log(`- Zone parity report: ${zone.result}`);
console.log(`- Final result: ${result}`);
console.log(`- Zip: ${zipPath}`);
