---
name: sselfie-maya-os
description: Canonical Maya-first operating model for SSELFIE user journey, screen behavior, and scaling decisions. Use when planning, implementing, auditing, or QAing funnel routes, checkout flows, onboarding, in-app UI behavior, analytics events, or architecture priorities so every agent stays aligned to the same end-to-end product path.
---

# SSELFIE Maya OS

## Quick start
1. Read [references/user-journey.md](references/user-journey.md).
2. Read one additional reference based on task type.
3. Use [references/screen-map.md](references/screen-map.md) for UI/screen behavior tasks.
4. Use [references/scaling-playbook.md](references/scaling-playbook.md) for scale/architecture tasks.
5. Use [references/qa-checklist.md](references/qa-checklist.md) for validation/release tasks.
6. Produce output with: stage, user intent, surface/tool, data reads/writes, analytics events, and success metric.

## Non-negotiables
- Treat Maya as the product shell, not a side assistant.
- Prefer conversation-first interactions over navigation-first interactions.
- Keep one canonical funnel path per step; avoid alias route growth.
- Treat paid entry routes as canonical. Legacy `/freebie/*` routes are redirects only.
- Keep analytics event names inside the allowlist contract.
- Keep changes low-blast-radius and verifiable with tests/build.

## Workflow
1. Classify request into one journey stage from `references/user-journey.md`.
2. Map to canonical route/surface from `references/screen-map.md`.
3. Verify telemetry and data-model alignment before proposing implementation.
4. Choose smallest safe change that preserves canonical path.
5. Validate with checks in `references/qa-checklist.md`.

## Output contract for agents
- Always name the exact route(s) affected.
- Always name the exact API/event contracts affected.
- Always separate current-state code behavior, target behavior, and temporary migration shim behavior.
- Always include explicit merge risk: `low`, `medium`, or `high`.

## Escalate before coding when
- A change introduces a new canonical route for an existing step.
- A change adds a new analytics event name.
- A change writes to legacy tables in active funnels.
- A change bypasses Maya-first interaction model for core flows.
