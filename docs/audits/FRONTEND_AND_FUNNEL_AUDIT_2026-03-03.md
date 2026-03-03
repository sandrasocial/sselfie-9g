# Frontend + Funnel Audit (Merge Readiness)

Date: 2026-03-03
Branch audited: `codex/arch-stability-completion-2026-03-03`

## Snapshot

- App pages (`app/**/page.tsx`): 54
- API routes (`app/api/**/route.ts`): 453
- Current in-app shell: 5 tabs (`maya`, `gallery`, `feed-planner`, `academy`, `account`)

## Executive verdict

Current status: **Merge-ready for frontend/funnel stabilization scope**.

Reason: previously identified P0/P1 frontend-funnel blockers are now addressed on this branch (see "Findings" and "What is left before merge").

## Canonical funnel map (current)

1. Acquisition:
- `/` (`app/page.tsx` + `components/sselfie/landing-page-new.tsx`)
- Tracks `landing_view`, `pricing_view`, `checkout_start`

2. Lead capture:
- `/freebie/brand-strategy` -> `POST /api/freebie/brand-strategy`
- Writes `freebie_brand_strategies`, generates strategy, sends freebie email, redirects to `/strategy/[token]`

3. Freebie delivery + upsell:
- `/strategy/[token]`
- Upsells to `https://sselfie.ai/auth/sign-up?checkout=studio_membership` and `/checkout/blueprint`

4. Auth:
- `/auth/login` and `/auth/sign-up`
- Redirects into `/studio` or checkout path (membership param handled)

5. Checkout:
- `/checkout/membership`, `/checkout/blueprint`, `/checkout/one-time`, `/checkout/credits` -> `/checkout?client_secret=...`
- Completion -> `/checkout/success`

6. In-app activation:
- `/studio` renders `components/sselfie/sselfie-app.tsx`
- `/maya` and `/feed-planner` also mount `SselfieApp`

## Screen-by-screen audit

| Surface | Owner file(s) | What works | Risk / gap |
|---|---|---|---|
| Landing (`/`) | `app/page.tsx`, `components/sselfie/landing-page-new.tsx` | Checkout starts + top-funnel analytics fire; paid blueprint CTA now follows feature-flag API | No current P0/P1 blocker |
| Freebie form (`/freebie/brand-strategy`) | `app/freebie/brand-strategy/page.tsx` | New freebie flow posts to canonical API and redirects to token page | No analytics event emitted for form submit/view/success |
| Freebie result (`/strategy/[token]`) | `app/strategy/[token]/page.tsx` | Reads canonical `freebie_brand_strategies` and renders strategy pack | Upsell links route into mixed legacy/canonical paths (`/checkout/blueprint` and auth query param flow) |
| Auth (`/auth/login`, `/auth/sign-up`) | `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx` | Login honors sanitized `returnTo`; sign-up handles membership checkout param | Login -> "Sign up" link still drops `returnTo` (P2 UX continuity cleanup) |
| Auth callback | `app/auth/callback/route.ts` | Session exchange + user sync works; legacy `blueprint_subscribers` side-effect removed from general signup | Always redirects `/studio` by design (current canonical activation destination) |
| Checkout core | `app/checkout/page.tsx`, `app/actions/landing-checkout.ts` | Embedded checkout and success redirect path work; purchase analytics path uses server-safe event logging | No current P0/P1 blocker |
| Checkout success | `components/checkout/success-content.tsx` | Handles paid blueprint polling and product-specific post-purchase states | Complex state branches; no explicit purchase analytics call from success UI |
| App shell (`/studio`) | `app/studio/page.tsx`, `components/sselfie/sselfie-app.tsx` | Canonical tab shell, onboarding and activation flows in place | High complexity; still substantial auth/entitlement branching in UI layer |
| Feed planner wrapper (`/feed-planner`) | `app/feed-planner/page.tsx`, `app/feed-planner/feed-planner-client.tsx` | Activation flow and onboarding gating are integrated; quick-start events are in analytics allowlist | No current P0/P1 blocker |
| Legacy blueprint paid page (`/blueprint/paid`) | `app/blueprint/paid/page.tsx` | Route is now a minimal redirect shim to `/feed-planner` with query forwarding | Legacy path retained for backward compatibility only |
| Checkout upgrade (`/checkout-upgrade`) | `app/checkout-upgrade/page.tsx` | Stripe checkout surface exists | Completion now routes to `/studio?upgraded=true` (valid destination) |

## Funnel telemetry audit

### Event contract integrity

Contract source: `lib/analytics/event-contract.ts`
Ingestion enforcement: `lib/analytics/events.ts`

Current status:
- Quick-start events are included in the allowlist.
- Emitted quick-start events match the contract.
- Regression coverage exists in `tests/analytics-event-contract.test.ts`.

### Purchase attribution integrity

Current status:
- Webhook purchase flows use server-safe `logAnalyticsEvent(...)`.
- Route-level guard exists in `tests/webhook-purchase-analytics-path.test.ts`.
- No browser-only purchase tracker call path remains in webhook context.

### Legacy engagement endpoints

Current status:
- `app/api/freebie/track-engagement/route.ts` writes to canonical `freebie_brand_strategies`-aligned model.
- Guard exists in `tests/freebie-engagement-route-model.test.ts`.
- Endpoint is no longer writing the legacy `freebie_subscribers` model.

## Findings

### P0 (block merge)

1. Analytics allowlist drift breaks quick-start tracking.
- Status: ✅ Resolved
- Evidence: quick-start events are present in `ALLOWED_ANALYTICS_EVENTS` and covered by `tests/analytics-event-contract.test.ts`.

2. Purchase analytics path is browser-only but called from webhook server context.
- Status: ✅ Resolved
- Evidence: webhook path uses server-safe `logAnalyticsEvent` and is covered by `tests/webhook-purchase-analytics-path.test.ts`.

3. Legacy freebie engagement endpoint writes obsolete table model.
- Status: ✅ Resolved
- Evidence: route writes canonical freebie strategy model and is covered by `tests/freebie-engagement-route-model.test.ts`.

### P1 (should fix in Phase 4 before merge)

1. Broken redirect target in checkout upgrade flow (`/dashboard` missing).
- Status: ✅ Resolved in commit `52c7e782`
- File: `app/checkout-upgrade/page.tsx`

2. Legacy blueprint paid page still carries dead logic while acting only as redirect shim.
- Status: ✅ Resolved in commit `52c7e782`
- File: `app/blueprint/paid/page.tsx`
- Guard test: `tests/legacy-paid-blueprint-redirect.test.ts`

3. Paid blueprint feature flag API exists but landing CTA state is not wired.
- Status: ✅ Resolved in commit `52c7e782`
- Files: `components/sselfie/landing-page-new.tsx`, `app/api/feature-flags/paid-blueprint/route.ts`

4. Auth callback still mutates legacy `blueprint_subscribers` path for general signup flow.
- Status: ✅ Resolved in commit `52c7e782`
- File: `app/auth/callback/route.ts`

5. Legacy paid blueprint follow-up emails deep-link through deprecated route.
- Status: ✅ Resolved in commit `0dd5a28a`
- Files: `lib/email/templates/paid-blueprint-*.tsx`
- Guard test: `tests/paid-blueprint-email-link-canonical.test.ts`

### P2 (post-merge hardening)

1. Auth boilerplate duplication is still high:
- `supabase.auth.getUser()` usages in API routes: ~195
- `withAuth(...)` usages: 10

2. Route wrappers (`/studio`, `/maya`, `/feed-planner`) all mount `SselfieApp` with overlapping boot logic.

## What is left before merge

1. Run manual funnel smoke before merge:
- landing -> checkout start -> checkout success -> studio open
- paid blueprint email link -> feed planner open
2. Keep Phase 4 medium-scope workstreams for follow-up PRs (non-blocking for this merge):
- 4A feed planner v1/v2 library consolidation
- 4E broader `withAuth` rollout across high-traffic API routes
3. Validation status:
- `pnpm type-check` ✅
- `pnpm build` ✅
- targeted analytics/funnel regression tests ✅

## Phase 4 link

See `docs/phases/PHASE4_ARCHITECTURE_STABILIZATION_PLAN_2026-03-03.md` for execution order and acceptance criteria tied to this audit.
