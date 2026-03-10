---
name: user-journey-scanner
description: Reconstruct SSELFIE's live paid-only journey from routes and API surfaces. Use for onboarding clarity, funnel audits, and drop-off diagnosis.
---

# User Journey Scanner

## Purpose
Map how a user actually moves through SSELFIE from entry to monetization.

Treat the paid ladder as canonical:
- `selfie-guide`
- `brand-strategy-pack`
- `membership`

Legacy `/freebie/*` routes are redirects, not primary acquisition steps.

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
