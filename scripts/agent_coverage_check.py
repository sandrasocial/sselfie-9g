#!/usr/bin/env python3
"""Verify that all manifest files have been reviewed in agent reports."""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "output" / "agents"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
REPORTS_DIR = OUTPUT_DIR / "reports"

FILES_REVIEWED_RE = re.compile(r"```json\s*(\[.*?\])\s*```", re.S)


def load_manifest_files() -> set[str]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {entry["path"] for entry in manifest.get("files", [])}


def extract_files_from_report(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    match = FILES_REVIEWED_RE.search(text)
    if not match:
        return []
    try:
        data = json.loads(match.group(1))
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        return []
    return []


def main() -> int:
    if not MANIFEST_PATH.exists():
        raise SystemExit(f"Missing manifest: {MANIFEST_PATH}")

    manifest_files = load_manifest_files()
    reviewed_files: set[str] = set()

    report_paths = list(REPORTS_DIR.rglob("*.md"))
    for report in report_paths:
        reviewed_files.update(extract_files_from_report(report))

    missing = sorted(manifest_files - reviewed_files)
    extra = sorted(reviewed_files - manifest_files)

    print(f"Reports scanned: {len(report_paths)}")
    print(f"Manifest files: {len(manifest_files)}")
    print(f"Reviewed files: {len(reviewed_files)}")

    if missing:
        print("\nMISSING FILES (not covered):")
        for path in missing:
            print(f"- {path}")
    else:
        print("\nAll manifest files are covered.")

    if extra:
        print("\nEXTRA FILES (not in manifest):")
        for path in extra:
            print(f"- {path}")

    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
