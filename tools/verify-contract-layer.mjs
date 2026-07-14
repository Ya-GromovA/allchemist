import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const commands = [
  ["Typecheck packages/types", "mobile/node_modules/.bin/tsc", ["-p", "packages/types/tsconfig.json", "--pretty", "false"]],
  ["Typecheck packages/api-client", "mobile/node_modules/.bin/tsc", ["-p", "packages/api-client/tsconfig.json", "--pretty", "false"]],
  ["Run api-client runtime tests", "npm", ["--prefix", "packages/api-client", "test"]],
  [
    "Check changed contract files for whitespace errors",
    "git",
    [
      "diff",
      "--check",
      "--",
      "AGENTS.md",
      "docs/quality",
      "docs/contracts",
      "packages/types",
      "packages/api-client",
      "tools/verify-contract-layer.mjs",
    ],
  ],
];

for (const [label, command, args] of commands) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\nVerification failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nContract layer verification passed.");
