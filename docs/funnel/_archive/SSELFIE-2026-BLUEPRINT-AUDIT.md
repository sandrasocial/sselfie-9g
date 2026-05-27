# SSELFIE 2026 Blueprint Audit

Last updated: 2026-04-26

## Decision

Blueprint should be kept as the **Feed Planner / 30-Day Content Planner** system.

It should not be treated as a main public funnel entry right now. Its clean role is:

- **Studio tool:** a planning and feed-design implementation tool inside the weekly Studio workflow.
- **Masterclass support resource:** the practical planner that supports the Instagram feed design, content system, and 30-day implementation modules.
- **Existing buyer entitlement:** paid Blueprint buyers must keep access through the current `paid_blueprint` internals until a safe rename/migration exists.

## Why Not Delete It

Blueprint is wired through paid access, app behavior, fulfillment, emails, and admin reporting. Removing it casually would risk breaking existing buyers and Feed Planner functionality.

| Surface | Current Role | Decision | Notes |
| --- | --- | --- | --- |
| `/blueprint` | Public/free Blueprint landing | Reposition / support | Keep until the public route can be rewritten around Feed Planner or routed into Studio/Masterclass context. |
| `/paid-blueprint` | Feature-flagged paid landing | Support / hidden | Keep protected by feature flag. Do not market as a primary entry offer. |
| `/checkout/blueprint` | Paid checkout | Keep | Required for existing standalone purchases and support-offer experiments. |
| `/feed-planner` | App delivery surface | Keep | This is the actual product experience. |
| `paid_blueprint` product type | Internal entitlement key | Keep | Do not rename until fulfillment, webhooks, email, credits, and tests are migrated together. |
| Blueprint follow-up emails | Buyer activation | Keep / later rewrite | Useful if copy matches the Feed Planner / Content Planner positioning. |

## Current Wiring

- Public route: `app/blueprint/page.tsx`
- Feature-flagged paid route: `app/paid-blueprint/page.tsx`
- Checkout route: `app/checkout/blueprint/page.tsx`
- Product catalog: `lib/products.ts`
- Stripe fulfillment: `app/api/webhooks/stripe/route.ts`
- Credits: `lib/credits.ts`
- Feed Planner app: `app/feed-planner/page.tsx`
- Access control: `lib/feed-planner/access-control.ts`
- Studio shell: `components/sselfie/sselfie-app.tsx`
- Buyer emails: `lib/email/templates/paid-blueprint-delivery.tsx`
- Follow-up cron: `app/api/cron/blueprint-followup-sequence/route.ts`
- Cleanup inventory: `lib/funnel/cleanup-candidates.ts`

## Recommended Customer Journey

1. Buyer gets clear positioning first through Brand Strategy Pack or Masterclass.
2. Buyer opens Feed Planner / 30-Day Content Planner.
3. Buyer receives a practical 30-day content plan and feed direction.
4. Buyer uses Studio/Maya for ongoing visual execution.

## Product Language

Use customer-facing language:

- Feed Planner
- 30-Day Content Planner
- Content Implementation Planner

Keep technical/internal language:

- `paid_blueprint`
- Blueprint entitlement
- Blueprint follow-up sequence

## Cleanup Rule

Blueprint-related code is **high dependency risk** and should not be part of broad cleanup. Only clean it in a dedicated migration where checkout, fulfillment, access, email, cron, and tests are handled together.

## Next Safe Cleanup Slice

Do not delete Blueprint internals yet. The next safe cleanup work is:

1. Use `/admin/funnel-cleanup` to review 90-day traffic, checkout/revenue, dependency risk, and strategic fit.
2. Rewrite or hide public Blueprint marketing only after confirming current buyer and email links still land safely.
3. Keep `/checkout/blueprint`, `/feed-planner`, `paid_blueprint` fulfillment, credits, and follow-up emails intact.
4. Update customer-facing copy toward “Feed Planner” or “30-Day Content Planner” before any technical rename.
5. Treat any full `paid_blueprint` rename as its own migration, not a general cleanup task.

For general cleanup, the route can move forward only when all four signals are weak:

- no meaningful 90-day route traffic
- no 90-day checkout/revenue attribution
- low dependency risk
- weak 2026 funnel fit
