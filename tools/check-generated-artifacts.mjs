import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
const generated = tracked.filter((p) => /(^|\/)(\.next|node_modules|dist|build|coverage|artifacts)(\/|$)|\.tsbuildinfo$/i.test(p));
if (generated.length) {
  console.error(generated.join("\n"));
  console.error("generated_artifacts=FAIL tracked generated output found");
  process.exit(1);
}
if (process.env.REQUIRE_WEB_BUILD === "1") {
  const required = ["apps/web/.next/BUILD_ID", "apps/web/.next/standalone/apps/web/server.js"];
  const missing = required.filter((p) => !existsSync(resolve(root, p)));
  if (missing.length) {
    console.error(`generated_artifacts=FAIL missing=${missing.join(",")}`);
    process.exit(1);
  }
}
console.log(`generated_artifacts=PASS tracked_paths=${tracked.length} build_required=${process.env.REQUIRE_WEB_BUILD === "1"}`);
