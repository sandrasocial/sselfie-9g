#!/usr/bin/env python3
"""Chunk manifest into reviewable batches and create agent assignment scaffolding."""
from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "output" / "agents"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
CHUNKS_PATH = OUTPUT_DIR / "chunks.json"
ASSIGNMENTS_DIR = OUTPUT_DIR / "tasks"
ASSIGNMENTS_DIR.mkdir(parents=True, exist_ok=True)

# Adjust to tune chunk size (bytes). Keep conservative to fit model context.
TARGET_BYTES_PER_CHUNK = 200_000

AGENTS = [
    "ux-ui",
    "dev-architecture",
    "qa",
    "content",
    "voice-brand",
    "marketing",
    "email",
    "product",
    "prompt-engineer-maya",
    "image-video-pipeline",
    "admin-business-ops",
    "scaling-opportunities",
    "automations",
]


def top_level_group(path: str) -> str:
    parts = Path(path).parts
    return parts[0] if parts else "root"


def main() -> int:
    if not MANIFEST_PATH.exists():
        raise SystemExit(f"Missing manifest: {MANIFEST_PATH}")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    files = manifest.get("files", [])

    # Group by top-level directory
    grouped: dict[str, list[dict]] = {}
    for entry in files:
        group = top_level_group(entry["path"])
        grouped.setdefault(group, []).append(entry)

    chunks = []
    chunk_id = 1

    for group_name, group_files in sorted(grouped.items()):
        current = []
        current_lines = 0
        for entry in group_files:
            entry_size = entry.get("bytes", 0)
            if current_lines + entry_size > TARGET_BYTES_PER_CHUNK and current:
                chunks.append({
                    "id": f"chunk-{chunk_id:03d}",
                    "group": group_name,
                    "byte_count": current_lines,
                    "files": [e["path"] for e in current],
                })
                chunk_id += 1
                current = []
                current_lines = 0
            current.append(entry)
            current_lines += entry_size

        if current:
            chunks.append({
                "id": f"chunk-{chunk_id:03d}",
                "group": group_name,
                "byte_count": current_lines,
                "files": [e["path"] for e in current],
            })
            chunk_id += 1

    chunks_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target_bytes_per_chunk": TARGET_BYTES_PER_CHUNK,
        "chunk_count": len(chunks),
        "chunks": chunks,
    }

    CHUNKS_PATH.write_text(json.dumps(chunks_payload, indent=2), encoding="utf-8")

    # Create per-agent assignment files (each agent gets all chunks by default)
    for agent in AGENTS:
        assignment = {
            "agent": agent,
            "assigned_chunks": [c["id"] for c in chunks],
        }
        (ASSIGNMENTS_DIR / f"{agent}.json").write_text(
            json.dumps(assignment, indent=2), encoding="utf-8"
        )

    print(f"Wrote {CHUNKS_PATH} and {len(AGENTS)} assignment files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
