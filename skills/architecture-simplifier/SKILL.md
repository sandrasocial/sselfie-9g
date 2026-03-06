---
name: architecture-simplifier
description: Identify over-engineered or duplicated architecture hotspots. Use to prioritize safe simplification slices by file gravity, module family duplication, and area density.
---

# Architecture Simplifier

## Purpose
Find the smallest high-impact simplification opportunities.

## Run
1. `pnpm audit:architecture-simplifier`
2. Open latest `output/automation/architecture-simplifier-*.md`

## Output contract
- Large files and high-risk refactor targets
- Duplicate module families
- Dense areas likely suffering abstraction drift
- Minimal-change simplification recommendations

## Rules
- Prioritize low blast radius changes.
- Preserve canonical routes and behavior while simplifying internals.
