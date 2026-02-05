#!/usr/bin/env python3
"""Consolidate all agent reports into a single markdown file with section headers."""
from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "output" / "agents"
REPORTS_DIR = OUTPUT_DIR / "reports"
OUT_FILE = OUTPUT_DIR / "consolidated-report.md"


def main() -> int:
    report_paths = sorted(REPORTS_DIR.rglob("*.md"))
    lines = []
    lines.append("# Consolidated Agent Report")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    lines.append("")

    for path in report_paths:
        rel = path.relative_to(OUTPUT_DIR)
        lines.append(f"## {rel}")
        lines.append("")
        lines.append(path.read_text(encoding="utf-8", errors="ignore"))
        lines.append("")

    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
