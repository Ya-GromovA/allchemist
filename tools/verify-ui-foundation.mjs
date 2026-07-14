import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["Contract layer verification", "node", ["tools/verify-contract-layer.mjs"]],
  ["Typecheck design tokens", "npm", ["run", "typecheck:tokens"]],
  ["Typecheck UI package", "npm", ["run", "typecheck:ui"]],
  ["Typecheck apps/web", "npm", ["run", "typecheck:web"]],
  ["Typecheck apps/admin", "npm", ["run", "typecheck:admin"]],
  ["Build apps/web", "npm", ["run", "build:web"]],
  ["Build apps/admin", "npm", ["run", "build:admin"]],
  ["Playwright UI smoke", "node", ["tools/ui-foundation-smoke.mjs"]],
  ["Capture UI snapshots", "node", ["tools/capture-ui-snapshots.mjs"]],
  ["Diff whitespace check", "git", ["diff", "--check", "--", "AGENTS.md", "apps", "packages/ui", "packages/design-tokens", "docs/quality", "docs/architecture/frontend-foundation.md", "tools/verify-ui-foundation.mjs", "tools/ui-foundation-smoke.mjs", "tools/capture-ui-snapshots.mjs", "docs/design/implementation-reports", "docs/architecture/student-dashboard-preview.md", "docs/quality/ui-snapshots.md", "artifacts/ui-snapshots", "package.json", "package-lock.json"]],
];

for (const [label, command, args] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\nUI foundation verification failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nUI foundation verification passed.");
