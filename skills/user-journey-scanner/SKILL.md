---
name: user-journey-scanner
description: Reconstruct the real in-app user journey from routes and API surfaces. Use for onboarding clarity, funnel audits, and drop-off diagnosis.
---

# User Journey Scanner

## Purpose
Map how a user actually moves through SSELFIE from entry to monetization.

## Run
1. `pnpm audit:journey`
2. Open latest `output/automation/journey-scan-*.md`

## Output contract
- Canonical journey path
- Critical route presence/missing list
- Product surface route inventory
- Monetization/billing API surface
- Maya/tool execution API surface
- Friction flags

## Rules
- Keep this scan route-based and behavior-focused.
- Escalate missing critical routes before UX polish.
