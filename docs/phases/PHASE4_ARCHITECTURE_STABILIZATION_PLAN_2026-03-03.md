# Phase 4 — Architecture Stabilization Plan (2026-03-03)

## Status checkpoint

Phase 3 is complete on this branch:
- `fb0e06fe` — Phase 3A hygiene cleanup
- `b6ba8770` — Phase 3B DB/stripe/alex consolidation
- `76cf911b` — Phase 3C prompt seam + `withAuth` pilot

Phase 4 is now the remaining stabilization pass before feature work and merge.

## What Phase 4 is

Phase 4 is the "funnel + frontend + feed consolidation" phase.
It is focused on cleaning the remaining medium-risk architecture drift that still affects stability and conversion observability.

## Goals

1. One canonical feed planner engine (retire v1/v2 split).
2. One canonical public-to-paid funnel (remove/retire legacy aliases and dead redirects).
3. Trustworthy funnel telemetry (all emitted events accepted and attributable).
4. Reduced API auth duplication (expand beyond the 10-route `withAuth` pilot).
5. Remove legacy blueprint/freebie surfaces that look active but are no longer the product path.

## In scope

- Feed planner library/API consolidation.
- Frontend and route cleanup for funnel clarity.
- Analytics event contract alignment and purchase attribution hardening.
- Legacy blueprint/freebie endpoint deprecation.
- `withAuth` rollout across high-traffic authenticated API routes.

## Out of scope

- New UX redesign.
- Pricing/product packaging changes.
- Maya prompt behavior changes.
- New DB schema for non-funnel features.

## Workstreams

### 4A) Feed planner unification

Target:
- Merge `lib/feed-planner/` and `lib/feed-planner-v2/` into one canonical feed domain.
- Keep API behavior stable while reducing duplicate logic paths.

Acceptance:
- Single feed planner library ownership.
- No route importing both v1 and v2 logic.
- Feed planner happy-path smoke test green (create feed, generate, save/update).

### 4B) Funnel route canonicalization

Target:
- Establish one canonical route per funnel step (entry, signup, checkout, success, activation).
- Remove or hard-deprecate legacy routes that immediately redirect or hold stale logic.

Acceptance:
- Documented canonical map from `/` and `/freebie/brand-strategy` to `/studio` activation.
- No broken or dead redirects.
- Legacy path behavior covered by explicit redirect tests.

### 4C) Analytics integrity

Target:
- Ensure all client-emitted analytics events are accepted by `ALLOWED_ANALYTICS_EVENTS`.
- Ensure purchase events are recorded in server-safe manner (no client-only tracking from webhook context).

Acceptance:
- Zero rejected event names in analytics ingestion logs.
- Purchase funnel metrics match checkout/webhook reality within expected tolerance.
- Event contract and emitted events are in sync and documented.

### 4D) Legacy blueprint/freebie retirement

Target:
- Retire old freebie/selfie-guide and obsolete blueprint engagement surfaces that still target legacy tables/paths.

Acceptance:
- No active frontend funnel calling legacy freebie tables.
- Old endpoints either removed or explicitly marked legacy/internal with guardrails.
- Paid blueprint legacy email links migrated to canonical routes.

### 4E) Auth wrapper rollout

Target:
- Expand `withAuth()` beyond pilot routes to reduce repeated auth blocks and inconsistent auth handling.

Acceptance:
- Significant reduction in raw `supabase.auth.getUser()` route boilerplate.
- No auth regressions in feed, images, maya-chat, milestones, and checkout-adjacent API routes.

## Proposed execution order

1. Analytics integrity (4C) and broken funnel edges (4B) first.
2. Legacy route/endpoint retirement (4D).
3. Feed planner unification (4A).
4. `withAuth` expansion (4E) with incremental gates.

## Merge gate for Phase 4 complete

- Frontend + funnel audit findings labeled `P0` are closed.
- Canonical funnel map is documented and implemented.
- Analytics contract drift resolved (no rejected events).
- No dead redirect targets in checkout/post-purchase flows.
- Feed planner behavior verified after consolidation.
