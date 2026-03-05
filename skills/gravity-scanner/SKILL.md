---
name: gravity-scanner
description: Detect high-gravity files and dependency hubs. Use to find the nervous system of the app before refactors, audits, or incident response.
---

# Gravity Scanner

## Purpose
Map dependency gravity so agents touch core hubs intentionally.

## Run
1. `pnpm audit:gravity`
2. Open latest `output/automation/gravity-scan-*.md`

## Output contract
- High-gravity files (imports, imported-by, lines, score)
- Hub-centered dependency map
- Candidate nervous-system modules for protected handling

## Rules
- Treat top hubs as protected files.
- Do not refactor top hubs without tests and rollback plan.
