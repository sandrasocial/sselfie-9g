---
name: upgrade-readiness-check
description: Assess dependency upgrade risk before framework/library updates. Use to detect outdated packages, major-version jumps, and staged upgrade priorities.
---

# Upgrade Readiness Check

## Purpose
Make dependency upgrades predictable and low-risk.

## Run
1. `pnpm audit:upgrade-readiness`
2. Open latest `output/automation/upgrade-readiness-*.md`

## Output contract
- Core stack current vs latest
- High-risk and medium-risk upgrade groups
- Total outdated package count
- Suggested upgrade sequencing

## Rules
- Runtime packages first in isolated PRs.
- Tooling upgrades only after runtime stability.
