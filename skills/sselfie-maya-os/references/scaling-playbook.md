# Scaling Playbook (Maya-first)

## Goal
Scale SSELFIE by increasing output quality and activation reliability without increasing user complexity.

## Priority stack

### 1) Tool dispatcher (highest)
- Build a registry that maps intent -> tool invocation.
- Required outputs: tool id, parameters, UI renderer payload, follow-up prompt context.
- Minimum first tools:
- `show_gallery`
- `save_to_gallery`
- `generate_image`
- `show_upload_zone`

### 2) Inline renderer
- Render structured tool outputs inside chat.
- Required block types:
- action buttons
- upload zone
- image preview/grid
- profile/context card
- generation progress state

### 3) Cross-session memory
- Store persistent user profile and preferences in canonical profile model.
- Feed memory back into every Maya response and tool call defaults.

### 4) Funnel telemetry integrity
- Enforce analytics contract before release.
- Keep purchase tracking server-safe.
- Block merge on event-name drift.

### 5) API consistency and reliability
- Continue `withAuth` rollout for high-traffic authenticated routes.
- Consolidate parallel feed planner implementations to one canonical library.

## Release gates per iteration
- `pnpm type-check`
- `pnpm build`
- targeted regression tests for changed contracts
- manual smoke for impacted journey stage

## What not to optimize first
- Cosmetic redesign without activation impact.
- Broad rewrites that do not improve canonical flow or telemetry trust.
- New route aliases for old behavior.
