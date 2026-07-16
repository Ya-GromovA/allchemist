#!/usr/bin/env node

const ORIGIN = "http://127.0.0.1:3011";
const EXPECTED_BUILD_ID = "foMZhxf6qk1kQrn7k-Y4I";
const ROUTES = [
  "/",
  "/dashboard/student",
  "/modules",
  "/modules/chemistry",
  "/modules/chemistry/lab/zinc-hcl",
  "/modules/physics",
  "/modules/biology",
  "/design-preview/student-dashboard",
  "/design-preview/platform-structure",
];

const assetPaths = new Set([
  "/_next/static/" + EXPECTED_BUILD_ID + "/_buildManifest.js",
]);
let serverErrorCount = 0;
let missingAssetCount = 0;
let failureCount = 0;

async function get(path) {
  const response = await fetch(ORIGIN + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status >= 500) {
    serverErrorCount += 1;
  }
  return response;
}

for (const route of ROUTES) {
  try {
    const response = await get(route);
    const body = await response.text();
    const ok = response.status === 200;
    console.log(
      "ROUTE " + route + " status=" + response.status + " result=" + (ok ? "PASS" : "FAIL"),
    );
    if (!ok) {
      failureCount += 1;
    }

    const matcher = /(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g;
    for (const match of body.matchAll(matcher)) {
      const parsed = new URL(match[1], ORIGIN);
      if (parsed.origin === ORIGIN && parsed.pathname.startsWith("/_next/")) {
        assetPaths.add(parsed.pathname + parsed.search);
      }
    }
  } catch (error) {
    failureCount += 1;
    console.error("ROUTE " + route + " result=FAIL error=" + error.name);
  }
}

let javascriptAssetCount = 0;
let cssAssetCount = 0;

for (const path of [...assetPaths].sort()) {
  try {
    const response = await get(path);
    const ok = response.status === 200;
    if (path.endsWith(".js")) {
      javascriptAssetCount += 1;
    }
    if (path.endsWith(".css")) {
      cssAssetCount += 1;
    }
    console.log(
      "ASSET " + path + " status=" + response.status + " result=" + (ok ? "PASS" : "FAIL"),
    );
    if (!ok) {
      missingAssetCount += 1;
      failureCount += 1;
    }
  } catch (error) {
    missingAssetCount += 1;
    failureCount += 1;
    console.error("ASSET " + path + " result=FAIL error=" + error.name);
  }
}

if (javascriptAssetCount === 0 || cssAssetCount === 0) {
  failureCount += 1;
  console.error("ASSET_CLASSES result=FAIL js=" + javascriptAssetCount + " css=" + cssAssetCount);
}

console.log("BUILD_ID expected=" + EXPECTED_BUILD_ID + " result=" + (missingAssetCount === 0 ? "PASS" : "FAIL"));
console.log("HTTP_500_COUNT=" + serverErrorCount);
console.log("MISSING_ASSET_COUNT=" + missingAssetCount);
console.log("RESULT=" + (failureCount === 0 && serverErrorCount === 0 ? "PASS" : "FAIL"));

if (failureCount !== 0 || serverErrorCount !== 0) {
  process.exitCode = 1;
}
