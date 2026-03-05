---
name: integration-health-check
description: Validate external integration readiness across Stripe, Supabase, Replicate, Redis, Resend, Neon, and Blob. Use before releases and when debugging environment drift.
---

# Integration Health Check

## Purpose
Run a pre-flight check for external dependencies and required wiring.

## Run
1. `pnpm audit:integration-health`
2. Open latest `output/automation/integration-health-*.md`

## Output contract
- Per integration: dependency, env state, required file surface
- Cross-cutting route/middleware duplication signals
- Release risk markers

## Rules
- Read-only checks only.
- Report missing env/paths before attempting functional tests.
