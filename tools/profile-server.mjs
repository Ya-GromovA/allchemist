#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { cpus, freemem, loadavg, platform, release, totalmem } from "node:os";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
  if (result.error) return { ok: false, output: result.error.message };
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return { ok: result.status === 0, output };
}

function firstLine(value) {
  return (value || "").split("\n").find(Boolean) || "unknown";
}

function lastLine(value) {
  const lines = (value || "").split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.at(-1) || "unknown";
}

function readMaybe(path) {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

function bytesToGiB(value) {
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

function parseMeminfo() {
  const raw = readMaybe("/proc/meminfo");
  const result = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^:]+):\s+(\d+)\s+kB$/);
    if (match) result[match[1]] = Number(match[2]) * 1024;
  }
  return result;
}

function uniqueCpuModels() {
  const raw = readMaybe("/proc/cpuinfo");
  const models = new Set();
  for (const line of raw.split("\n")) {
    const match = line.match(/^model name\s+:\s+(.+)$/);
    if (match) models.add(match[1]);
  }
  return [...models];
}

function diskSmoke() {
  const file = join("/tmp", `allchemist-profile-${process.pid}.bin`);
  const write = run("dd", ["if=/dev/zero", `of=${file}`, "bs=1M", "count=64", "conv=fsync"], { timeout: 30000 });
  const read = run("dd", [`if=${file}`, "of=/dev/null", "bs=1M"], { timeout: 30000 });
  try {
    if (existsSync(file)) rmSync(file);
  } catch {
    // Best-effort cleanup; the file is small and in /tmp.
  }
  return { write, read };
}

function commandVersion(command, args = ["--version"]) {
  return firstLine(run(command, args).output);
}

const cpuList = cpus();
const meminfo = parseMeminfo();
const dfRoot = run("df", ["-hT", "/"]);
const dfTmp = run("df", ["-hT", "/tmp"]);
const lsblk = run("lsblk", ["-o", "NAME,TYPE,SIZE,FSTYPE,MOUNTPOINTS"]);
const osRelease = readMaybe("/etc/os-release");
const prettyOs = osRelease.match(/^PRETTY_NAME="?(.*?)"?$/m)?.[1] || `${platform()} ${release()}`;
const uptime = run("uptime");
const docker = run("systemd-detect-virt", ["--container"]);
const vm = run("systemd-detect-virt", ["--vm"]);
const cgroup = firstLine(readMaybe("/proc/1/cgroup"));
const nvidia = run("nvidia-smi", ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader"]);
const disk = diskSmoke();

let npmVersion = "unknown";
try {
  npmVersion = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
} catch {
  npmVersion = "unknown";
}

const report = [
  "# Allchemist Server Profile",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## CPU",
  "",
  `- Model: ${uniqueCpuModels().join("; ") || cpuList[0]?.model || "unknown"}`,
  `- Logical threads: ${cpuList.length}`,
  `- Load average: ${loadavg().map((value) => value.toFixed(2)).join(", ")}`,
  `- Uptime: ${uptime.output || "unknown"}`,
  "",
  "## RAM",
  "",
  `- Total: ${bytesToGiB(totalmem())}`,
  `- Available: ${bytesToGiB(meminfo.MemAvailable ?? freemem())}`,
  `- Free: ${bytesToGiB(freemem())}`,
  `- Swap total: ${bytesToGiB(meminfo.SwapTotal ?? 0)}`,
  `- Swap free: ${bytesToGiB(meminfo.SwapFree ?? 0)}`,
  "",
  "## Disk",
  "",
  "```",
  dfRoot.output || "df / unavailable",
  "",
  dfTmp.output || "df /tmp unavailable",
  "",
  lsblk.output || "lsblk unavailable",
  "```",
  "",
  "## Disk Smoke",
  "",
  `- Write 64 MiB: ${disk.write.ok ? "ok" : "failed"}${disk.write.output ? ` - ${lastLine(disk.write.output)}` : ""}`,
  `- Read 64 MiB: ${disk.read.ok ? "ok" : "failed"}${disk.read.output ? ` - ${lastLine(disk.read.output)}` : ""}`,
  "",
  "## Runtime",
  "",
  `- OS: ${prettyOs}`,
  `- Kernel: ${release()}`,
  `- Node: ${commandVersion("node")}`,
  `- npm: ${npmVersion}`,
  `- Python: ${commandVersion("python3")}`,
  "",
  "## GPU / Virtualization",
  "",
  `- GPU: ${nvidia.ok ? nvidia.output : "not detected or nvidia-smi unavailable"}`,
  `- Container: ${docker.ok ? docker.output : "not detected"}`,
  `- VM: ${vm.ok ? vm.output : "not detected"}`,
  `- cgroup: ${cgroup || "unknown"}`,
  "",
].join("\n");

console.log(report);
