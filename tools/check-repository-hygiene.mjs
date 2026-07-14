import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";
import process from "node:process";

const git = (args, options = {}) =>
  execFileSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const root = git(["rev-parse", "--show-toplevel"], { cwd: process.cwd() }).trim();
const tracked = git(["ls-files", "-z"], { cwd: root })
  .split("\0")
  .filter(Boolean);

const detectors = [
  {
    class: "GENERATED_OUTPUT",
    pattern:
      /(^|\/)(node_modules|\.next|dist|build|coverage|\.cache|\.turbo|\.pytest_cache|\.expo|\.gradle|playwright-report|test-results|blob-report|artifacts)(\/|$)|\.tsbuildinfo$/i,
  },
  {
    class: "RUNTIME_STATE",
    pattern:
      /(^|\/)(backend\/data|backend\/data_host_backup)(\/|$)|^content_packs\/allchemist-apk-latest\.json$/i,
  },
  {
    class: "SECRET_FILENAME",
    pattern:
      /(^|\/)(\.env($|\.)|secrets?(\/|$)|\.npmrc$|\.pypirc$)|(^|\/)(credentials?|cookies?|tokens?)\.(json|txt|ya?ml)$|\.(pem|key|p12|pfx|keystore|jks)$/i,
  },
  {
    class: "DATABASE_OR_DUMP",
    pattern: /\.(db|sqlite|sqlite3|dump)$|(^|\/)synapse_schema\.sql$/i,
  },
  {
    class: "LOCAL_LOG_OR_TEMP",
    pattern: /\.log$|(^|\/)assistant_log\.md|\.(tmp|temp|orig)$/i,
  },
];

const violations = [];
for (const path of tracked) {
  for (const detector of detectors) {
    if (detector.pattern.test(path)) {
      violations.push({ class: detector.class, path });
    }
  }
}

const generatedDirectoryNames = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".pytest_cache",
  ".expo",
  ".gradle",
  "playwright-report",
  "test-results",
  "blob-report",
  "artifacts",
]);

const generatedDirectories = [];
const visit = (absolutePath) => {
  for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (entry.name === ".git") continue;
    const child = resolve(absolutePath, entry.name);
    const repositoryPath = relative(root, child).split(sep).join("/");
    if (generatedDirectoryNames.has(entry.name)) {
      generatedDirectories.push(repositoryPath);
      continue;
    }
    visit(child);
  }
};
visit(root);

const ignored = (path) => {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", "--", path], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    throw error;
  }
};

for (const path of generatedDirectories) {
  if (!ignored(path)) {
    violations.push({ class: "UNIGNORED_GENERATED_DIRECTORY", path });
  }
}

const requiredIgnoreProbes = [
  "node_modules/.alc-hygiene-probe",
  "apps/web/.next/.alc-hygiene-probe",
  "dist/.alc-hygiene-probe",
  "build/.alc-hygiene-probe",
  "coverage/.alc-hygiene-probe",
  ".cache/.alc-hygiene-probe",
  "playwright-report/.alc-hygiene-probe",
  "test-results/.alc-hygiene-probe",
  "backend/data/.alc-hygiene-probe",
  "backend/data_host_backup/.alc-hygiene-probe",
  "content_packs/allchemist-apk-latest.json",
  ".env.local",
  "local.sqlite3",
  "artifacts/.alc-hygiene-probe",
];

for (const path of requiredIgnoreProbes) {
  if (!ignored(path)) {
    violations.push({ class: "MISSING_IGNORE_RULE", path });
  }
}

const sourceMustRemainVisible = [
  "apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png",
  "backend/sql/schema.sql",
  "packages/types/src/index.ts",
];

for (const path of sourceMustRemainVisible) {
  if (ignored(path)) {
    violations.push({ class: "SOURCE_HIDDEN_BY_IGNORE", path });
  }
}

const classCounts = new Map();
for (const detector of detectors) classCounts.set(detector.class, 0);
for (const violation of violations) {
  classCounts.set(violation.class, (classCounts.get(violation.class) ?? 0) + 1);
}

console.log(`repository=${basename(root)}`);
console.log(`tracked_paths=${tracked.length}`);
console.log(`generated_directories_seen=${generatedDirectories.length}`);
for (const [detectorClass, count] of classCounts) {
  console.log(`detector=${detectorClass} violations=${count}`);
}

if (violations.length > 0) {
  for (const violation of violations.sort((a, b) =>
    `${a.class}:${a.path}`.localeCompare(`${b.class}:${b.path}`),
  )) {
    console.error(`status=FAIL detector=${violation.class} path=${violation.path}`);
  }
  console.error(`repository_hygiene=FAIL violations=${violations.length}`);
  process.exitCode = 1;
} else {
  console.log("repository_hygiene=PASS violations=0");
}
