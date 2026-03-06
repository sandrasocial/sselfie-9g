---
name: repo-cartographer
description: Map the live architecture before any refactor. Use for whole-repo orientation, route counts, integration inventory, DB surface mapping, and baseline system snapshots.
---

# Repo Cartographer

## Purpose
Produce a current architecture map so every agent starts from shared system reality.

## Run
1. `pnpm audit:repo-map`
2. Open latest `output/automation/repo-map-*.md`

## Output contract
- Frontend map (App Router, components, major folders)
- Backend map (API routes, cron routes, lib modules)
- External services and env state
- Database table count (if DB access is available)
- Auth and AI pipeline surface summary

## Rules
- Read-only audit only.
- No code edits based on this scan alone.
