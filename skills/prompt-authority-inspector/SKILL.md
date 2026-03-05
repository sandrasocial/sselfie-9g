---
name: prompt-authority-inspector
description: Audit prompt governance and detect drift from the authority layer. Use to find shadow prompts, duplicate prompt patterns, and inconsistent model instructions.
---

# Prompt Authority Inspector

## Purpose
Keep prompt behavior deterministic by enforcing one authority path.

## Run
1. `pnpm audit:prompt-authority`
2. Open latest `output/automation/prompt-authority-check-*.md`

## Output contract
- Central authority files
- Prompt source counts
- Shadow prompt bypass candidates
- Duplicate prompt pattern clusters
- Consolidation recommendation

## Rules
- Do not rewrite prompts during scan.
- Route changes through canonical authority files only.
