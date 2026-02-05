# Agent Review Workflow

This folder contains the manifest, chunks, assignments, and report template for full-repo analysis.

## Files
- `manifest.json`: Full file inventory with line counts.
- `chunks.json`: Chunked file lists to keep analysis within token limits.
- `tasks/*.json`: Per-agent assignments (all chunks by default).
- `REPORT_TEMPLATE.md`: Required report format.

## How To Run (Local)
1) Generate manifest
```
python3 scripts/agent_manifest.py
```

2) Create chunks and assignments
```
python3 scripts/agent_chunker.py
```

3) Run agents on their assigned chunks and save reports here:
```
output/agents/reports/<agent>/<chunk-id>.md
```

4) Verify full coverage
```
python3 scripts/agent_coverage_check.py
```

5) Optional: consolidate all reports
```
python3 scripts/agent_consolidate.py
```

## Coverage Rule
Every report must include `FILES_REVIEWED` as a JSON array of all files it inspected.
The coverage checker parses these arrays and ensures every file in the manifest is covered.

## Suggested Agent IDs
- ux-ui
- dev-architecture
- qa
- content
- voice-brand
- marketing
- email
- product
- prompt-engineer-maya
- image-video-pipeline
- admin-business-ops
- scaling-opportunities
- automations
