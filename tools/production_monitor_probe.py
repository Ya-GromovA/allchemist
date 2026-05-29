#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.request
from typing import Any


def _fetch_json(url: str, timeout: int) -> tuple[dict[str, Any], float]:
    started = time.perf_counter()
    with urllib.request.urlopen(url, timeout=timeout) as response:
        raw = response.read()
        elapsed = time.perf_counter() - started
        if response.status != 200:
            raise RuntimeError(f"{url} returned HTTP {response.status}")
        return json.loads(raw.decode("utf-8")), elapsed


def _head(url: str, timeout: int) -> tuple[dict[str, str], float]:
    req = urllib.request.Request(url, method="HEAD")
    started = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as response:
        elapsed = time.perf_counter() - started
        if response.status != 200:
            raise RuntimeError(f"{url} returned HTTP {response.status}")
        return {k.lower(): v for k, v in response.headers.items()}, elapsed


def _build_report(api_base: str, timeout: int, max_latency_ms: int) -> dict[str, Any]:
    health, health_latency = _fetch_json(f"{api_base}/health", timeout)
    metadata, metadata_latency = _fetch_json(f"{api_base}/content/downloads/apk/latest/metadata", timeout)
    apk_headers, apk_latency = _head(f"{api_base}/content/downloads/apk/latest", timeout)

    checks = []
    checks.append({"name": "health_status", "ok": health.get("status") == "ok", "value": health.get("status")})
    checks.append({"name": "health_latency", "ok": health_latency * 1000 <= max_latency_ms, "valueMs": round(health_latency * 1000, 2)})
    for key in ("versionName", "versionCode", "fileName", "sizeBytes", "sha256"):
        checks.append({"name": f"apk_metadata_{key}", "ok": bool(metadata.get(key)), "value": metadata.get(key)})
    expected_size = str(metadata.get("sizeBytes") or "")
    actual_size = apk_headers.get("content-length", "")
    checks.append({"name": "apk_head_size", "ok": bool(expected_size) and actual_size == expected_size, "value": actual_size})
    checks.append({"name": "apk_head_latency", "ok": apk_latency * 1000 <= max_latency_ms, "valueMs": round(apk_latency * 1000, 2)})

    ok = all(item["ok"] for item in checks)
    return {
        "ok": ok,
        "apiBase": api_base,
        "checkedAtUnix": int(time.time()),
        "health": health,
        "apk": metadata,
        "checks": checks,
    }


def _print_prometheus(report: dict[str, Any]) -> None:
    print(f"allchemist_monitor_ok {1 if report['ok'] else 0}")
    for item in report["checks"]:
        name = str(item["name"]).replace("-", "_")
        print(f"allchemist_check_ok{{check=\"{name}\"}} {1 if item['ok'] else 0}")
        if "valueMs" in item:
            print(f"allchemist_check_latency_ms{{check=\"{name}\"}} {item['valueMs']}")
    apk = report.get("apk", {})
    if apk.get("versionCode"):
        print(f"allchemist_apk_version_code {int(apk['versionCode'])}")
    if apk.get("sizeBytes"):
        print(f"allchemist_apk_size_bytes {int(apk['sizeBytes'])}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Allchemist production monitor probe for health and latest APK endpoints.")
    parser.add_argument("--api-base", default="https://api.allchemist.ru/api/v1")
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--max-latency-ms", type=int, default=2500)
    parser.add_argument("--format", choices=("json", "prometheus"), default="json")
    args = parser.parse_args()

    report = _build_report(args.api_base.rstrip("/"), args.timeout, args.max_latency_ms)
    if args.format == "prometheus":
        _print_prometheus(report)
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
