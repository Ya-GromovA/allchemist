import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { TextDecoder } from "node:util";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files", "-z", "--", "*.md", "*.json", "*.mjs", "*.js", "*.ts", "*.tsx", "*.yml", "*.yaml"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const decoder = new TextDecoder("utf-8", { fatal: true });
const violations = [];
const inheritedReplacementBaseline = new Map([
  ["tools/playwright-approved-ui-smoke.mjs", 1],
]);
for (const file of files) {
  try {
    const text = decoder.decode(readFileSync(`${root}/${file}`));
    const replacements = [...text].filter((character) => character === "\uFFFD").length;
    const baseline = inheritedReplacementBaseline.get(file) ?? 0;
    if (replacements !== baseline) violations.push(`${file}: replacement characters=${replacements}, expected baseline=${baseline}`);
  } catch { violations.push(`${file}: invalid UTF-8`); }
}
if (violations.length) {
  console.error(violations.join("\n"));
  console.error(`utf8_cyrillic=FAIL violations=${violations.length}`);
  process.exit(1);
}
console.log(`utf8_cyrillic=PASS text_files=${files.length} inherited_replacement_baseline=1`);
