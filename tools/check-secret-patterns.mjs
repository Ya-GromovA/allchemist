import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const patterns = [
  ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GITHUB_TOKEN", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["AWS_ACCESS_KEY", /\bAKIA[0-9A-Z]{16}\b/],
  ["OPENAI_KEY", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
];
const violations = [];
for (const file of files) {
  let text;
  try { text = readFileSync(`${root}/${file}`, "utf8"); } catch { continue; }
  for (const [kind, pattern] of patterns) if (pattern.test(text)) violations.push(`${kind}\t${file}`);
}
if (violations.length) {
  console.error(violations.join("\n"));
  console.error(`secret_pattern_scan=FAIL violations=${violations.length}`);
  process.exit(1);
}
console.log(`secret_pattern_scan=PASS tracked_files=${files.length}`);
