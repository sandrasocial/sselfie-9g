---
name: markdown-repo-curator
description: Organize and safely delete markdown files in the repo. Use for markdown inventory, duplicate detection, low-reference candidates, and manifest-driven delete/move operations.
---

# Markdown Repo Curator

## Purpose
Keep markdown docs clean and searchable without deleting important product memory.

## Commands
1. Inventory and recommendations:
`pnpm audit:markdown-hygiene`
2. Apply approved delete/move manifest:
`pnpm audit:markdown-hygiene:apply -- --manifest <path-to-manifest>`

## Workflow
1. Run scan and open latest `output/automation/markdown-hygiene-*.md`.
2. Review duplicate basenames and low-reference candidates.
3. Build a manifest with explicit operations:
`DELETE relative/path/file.md`
`MOVE relative/path/from.md -> docs/archive/path/to.md`
4. Run apply command.
5. Re-run scan to confirm cleanup.

## Guardrails
- Do not delete `README.md`, `CLAUDE.md`, or `AGENTS.md`.
- Default to moving historical docs into `docs/archive/` before deleting.
- Never run apply without a reviewed manifest.
