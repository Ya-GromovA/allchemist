#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve(process.cwd(), "docs/design/approved-references.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function readPngDimensions(filePath) {
  const buffer = readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("File is not a readable PNG: invalid PNG signature");
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") {
    throw new Error("File is not a readable PNG: missing IHDR chunk");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const results = manifest.references.map((reference) => {
  const absolutePath = resolve(process.cwd(), reference.expectedPath);

  try {
    const stat = statSync(absolutePath);
    if (!stat.isFile()) {
      return {
        ...reference,
        actualStatus: "MISSING",
        error: "Path exists but is not a file",
      };
    }

    const dimensions = readPngDimensions(absolutePath);
    return {
      ...reference,
      actualStatus: "PRESENT",
      actualDimensions: dimensions,
      error: null,
    };
  } catch (error) {
    return {
      ...reference,
      actualStatus: "MISSING",
      actualDimensions: null,
      error: error && error.code === "ENOENT" ? "File not found" : String(error?.message ?? error),
    };
  }
});

console.log("Approved UI references check");
console.log(`Manifest: ${manifestPath}`);
console.log("");

for (const result of results) {
  const dimensionText = result.actualDimensions ? `${result.actualDimensions.width}x${result.actualDimensions.height}` : "n/a";
  const criticalText = result.critical ? "critical" : "non-critical";
  const errorText = result.error ? ` (${result.error})` : "";
  console.log(`${result.actualStatus.padEnd(7)} ${result.id.padEnd(20)} ${dimensionText.padEnd(12)} ${criticalText} ${result.expectedPath}${errorText}`);
}

const missing = results.filter((result) => result.actualStatus !== "PRESENT");
const missingCritical = missing.filter((result) => result.critical);

console.log("");
console.log(`Summary: ${results.length - missing.length}/${results.length} present, ${missing.length} missing.`);

if (missingCritical.length > 0) {
  console.error("");
  console.error("Missing critical approved references:");
  for (const result of missingCritical) {
    console.error(`- ${result.id}: ${result.expectedPath}`);
  }
  process.exit(1);
}

console.log("All critical approved references are present.");
