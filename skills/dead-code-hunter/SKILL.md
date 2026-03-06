---
name: dead-code-hunter
description: Find likely dead code and repo bloat. Use to detect orphan routes, unused dependencies, duplicate exported utilities, stale artifacts, and unused exports.
---

# Dead Code Hunter

## Purpose
Identify high-confidence cleanup candidates before stabilization or merge.

## Run
1. `pnpm audit:dead-code`
2. Open latest `output/automation/dead-code-scan-*.md`

## Output contract
- Potentially orphaned API routes
- Potentially unused dependencies
- Duplicate exported symbols
- `ts-prune` unused export sample
- Stale artifact file list (`.bak`, `.old`, `.disabled`, `.removed`)

## Rules
- Treat findings as candidates; confirm usage before deletion.
- Never delete webhook/cron endpoints without verification.
