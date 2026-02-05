#!/usr/bin/env python3
"""Run agent analyses over chunk assignments using OpenAI Responses API (stdlib only)."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Dict, List
from urllib import request

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "output" / "agents"
TASKS_DIR = OUTPUT_DIR / "tasks"
REPORTS_DIR = OUTPUT_DIR / "reports"
CHUNKS_PATH = OUTPUT_DIR / "chunks.json"
AGENT_CONFIG = OUTPUT_DIR / "agent_config.json"

def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(REPO_ROOT / ".env.local")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
MODEL = os.environ.get("AGENT_MODEL", "gpt-4.1-mini").strip()
MAX_OUTPUT_TOKENS = int(os.environ.get("AGENT_MAX_OUTPUT_TOKENS", "1200"))
REQUEST_PAUSE_SEC = float(os.environ.get("AGENT_PAUSE_SEC", "0.8"))

# Optional filters
ONLY_AGENT = os.environ.get("AGENT_ONLY", "").strip()
ONLY_CHUNK = os.environ.get("AGENT_CHUNK", "").strip()

SYSTEM_PROMPT = (
    "You are a specialized software analysis agent. "
    "Follow the report template exactly and include FILES_REVIEWED as a JSON array. "
    "Use only repo evidence and cite file paths and functions/components. "
    "If information is missing, say 'Not found in repo.'"
)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_files(file_list: List[str]) -> str:
    parts = []
    for rel_path in file_list:
        path = REPO_ROOT / rel_path
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            content = ""
        parts.append(f"\n===== FILE: {rel_path} =====\n{content}\n")
    return "\n".join(parts)


def build_prompt(agent_name: str, agent_desc: str, chunk_id: str, group: str, files: List[str], content_blob: str) -> str:
    return (
        f"Agent: {agent_name}\n"
        f"Specialty: {agent_desc}\n"
        f"Chunk ID: {chunk_id}\n"
        f"Group: {group}\n\n"
        "Use the following repo files to produce the report.\n"
        "Report format is REQUIRED.\n\n"
        "# Report Template\n"
        "Agent Report\n"
        "Agent: <name>\n"
        "Specialty: <specialty>\n"
        "Chunk ID: <chunk>\n"
        "Group: <group>\n"
        "Date: <date>\n\n"
        "Summary: 2-4 bullets\n"
        "Top Findings: 5-8 bullets with evidence\n"
        "Risks: 3-5 bullets\n"
        "Opportunities: 3-5 bullets\n"
        "Recommended Actions: 3-5 bullets with effort/impact\n"
        "Evidence vs Inference: bullets\n"
        "FILES_REVIEWED: JSON array of all files in this chunk\n\n"
        "FILES TO REVIEW (must be included in FILES_REVIEWED):\n"
        + "\n".join([f"- {f}" for f in files])
        + "\n\n"
        "FILE CONTENTS:\n"
        + content_blob
    )


def call_openai(prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    url = "https://api.openai.com/v1/responses"
    payload = {
        "model": MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }

    data = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {OPENAI_API_KEY}")
    req.add_header("Content-Type", "application/json")

    with request.urlopen(req, timeout=300) as resp:
        body = resp.read().decode("utf-8")
    result = json.loads(body)

    # Extract text from response
    output_texts = []
    for item in result.get("output", []):
        if item.get("type") == "message":
            for c in item.get("content", []):
                if c.get("type") == "output_text":
                    output_texts.append(c.get("text", ""))
    return "\n".join(output_texts).strip()


def ensure_files_reviewed_block(text: str, files: List[str]) -> str:
    if "FILES_REVIEWED" in text:
        return text
    block = "\n\n## FILES_REVIEWED\n```json\n" + json.dumps(files, indent=2) + "\n```\n"
    return text + block


def main() -> int:
    chunks_payload = load_json(CHUNKS_PATH)
    chunks: Dict[str, dict] = {c["id"]: c for c in chunks_payload.get("chunks", [])}
    agent_config = load_json(AGENT_CONFIG)
    agents = agent_config.get("agents", {})

    for task_path in sorted(TASKS_DIR.glob("*.json")):
        agent_name = task_path.stem
        if ONLY_AGENT and agent_name != ONLY_AGENT:
            continue
        if agent_name not in agents:
            continue

        assignment = load_json(task_path)
        assigned_chunks = assignment.get("assigned_chunks", [])
        for chunk_id in assigned_chunks:
            if ONLY_CHUNK and chunk_id != ONLY_CHUNK:
                continue
            chunk = chunks.get(chunk_id)
            if not chunk:
                continue

            files = chunk.get("files", [])
            group = chunk.get("group", "")
            content_blob = read_files(files)
            prompt = build_prompt(agent_name, agents[agent_name], chunk_id, group, files, content_blob)

            report_text = call_openai(prompt)
            report_text = ensure_files_reviewed_block(report_text, files)

            out_dir = REPORTS_DIR / agent_name
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / f"{chunk_id}.md"
            out_path.write_text(report_text, encoding="utf-8")
            print(f"Wrote {out_path}")

            time.sleep(REQUEST_PAUSE_SEC)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
