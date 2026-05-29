#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Allchemist APK metadata for CDN/Object Storage publication readiness.")
    parser.add_argument("--metadata", default="/root/synapse/content_packs/allchemist-apk-latest.json")
    parser.add_argument("--cdn-base-url", default="", help="Optional CDN base URL expected to host apkFile.")
    args = parser.parse_args()

    metadata_path = Path(args.metadata)
    data = json.loads(metadata_path.read_text(encoding="utf-8"))
    required = ["versionName", "versionCode", "apkFile", "sha256", "size"]
    missing = [key for key in required if not data.get(key)]
    if missing:
        raise SystemExit("missing metadata keys: " + ", ".join(missing))

    apk_path = metadata_path.parent / str(data["apkFile"])
    if not apk_path.exists() or not apk_path.is_file():
        raise SystemExit(f"APK artifact missing: {apk_path}")
    actual_size = apk_path.stat().st_size
    expected_size = int(data["size"])
    if actual_size != expected_size:
        raise SystemExit(f"APK size mismatch: {actual_size} != {expected_size}")

    cdn_base = args.cdn_base_url.strip().rstrip("/")
    report = {
        "ok": True,
        "metadata": str(metadata_path),
        "apkFile": data["apkFile"],
        "versionName": data["versionName"],
        "versionCode": data["versionCode"],
        "size": expected_size,
        "sha256": data["sha256"],
        "localDownloadUrl": "/api/v1/content/downloads/apk/latest",
        "cdnDownloadUrl": f"{cdn_base}/{data['apkFile']}" if cdn_base else None,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
