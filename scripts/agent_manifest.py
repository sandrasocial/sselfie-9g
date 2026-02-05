#!/usr/bin/env python3
"""Generate a manifest of code+doc files with size metrics."""
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "output" / "agents"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Extensions we consider code/docs
INCLUDE_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".md", ".mdx", ".txt",
    ".json", ".yml", ".yaml", ".toml",
    ".css", ".scss", ".html", ".svg",
    ".py", ".sql", ".prisma",
}

EXCLUDE_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "coverage",
    "output", "tmp", "playwright-report", "test-results",
}


def is_in_excluded_dir(path: Path) -> bool:
    parts = set(path.parts)
    return any(part in EXCLUDE_DIRS for part in parts)


def is_included_file(path: Path) -> bool:
    if path.name.startswith(".") and path.suffix not in INCLUDE_EXTS:
        return False
    if is_in_excluded_dir(path):
        return False
    if path.suffix in INCLUDE_EXTS:
        return True
    return False


def git_ls_files(repo_root: Path) -> list[Path]:
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
        files = [repo_root / line.strip() for line in result.stdout.splitlines() if line.strip()]
        return files
    except Exception:
        # Fallback to walking the filesystem
        all_files = []
        for root, _, filenames in os.walk(repo_root):
            for name in filenames:
                all_files.append(Path(root) / name)
        return all_files


def count_lines(path: Path) -> int:
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def file_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except Exception:
        return 0


def main() -> int:
    files = git_ls_files(REPO_ROOT)
    entries = []
    total_lines = 0
    total_bytes = 0

    # Optional: include line counts if explicitly requested
    include_lines = os.environ.get("AGENT_INCLUDE_LINES", "").lower() in {"1", "true", "yes"}

    for path in files:
        rel = path.relative_to(REPO_ROOT)
        if not is_included_file(rel):
            continue
        line_count = count_lines(path) if include_lines else None
        size_bytes = file_size(path)
        if line_count is not None:
            total_lines += line_count
        total_bytes += size_bytes
        entries.append({
            "path": str(rel),
            "lines": line_count,
            "bytes": size_bytes,
        })

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo_root": str(REPO_ROOT),
        "file_count": len(entries),
        "total_lines": total_lines if include_lines else None,
        "total_bytes": total_bytes,
        "files": entries,
    }

    out_path = OUTPUT_DIR / "manifest.json"
    out_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
