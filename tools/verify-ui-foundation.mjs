import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  ["Repository hygiene", "node", ["tools/check-repository-hygiene.mjs"]],
  ["Secret-pattern scan", "node", ["tools/check-secret-patterns.mjs"]],
  ["UTF-8/Cyrillic regression check", "node", ["tools/check-utf8-cyrillic.mjs"]],
  ["Typecheck design tokens", "npm", ["run", "typecheck:tokens"]],
  ["Typecheck UI package", "npm", ["run", "typecheck:ui"]],
  ["Typecheck AI assistant", "npm", ["run", "typecheck:ai-assistant"]],
  ["Typecheck apps/web", "npm", ["run", "typecheck:web"]],
  ["Diff whitespace check", "git", ["diff", "--check"]],
];

for (const [label, command, args] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\nUI foundation verification failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nUI foundation read-only verification passed.");
console.log("Unit/integration tests, builds, visual tests, snapshot generation, and deployment are intentionally excluded.");
