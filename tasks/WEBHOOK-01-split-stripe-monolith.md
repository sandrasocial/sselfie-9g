# WEBHOOK-01 — Split the Stripe webhook monolith (strangler extraction, zero rewrites)

*Spec by Claude (Cowork) 2026-06-10. Implementing agent: read this fully, then read
docs/DEEP_AUDIT_AND_CLEAN_PLAN_2026-06-10.md §5.1 and the funnel-truth memory below.*

## Why

`app/api/webhooks/stripe/route.ts` is 6,247 lines and handles EVERY payment for a live
business. It caused two incidents in June 2026: the "Unknown arguments" checkout outage
(June 3-5) and an unfulfilled $27 buyer (June 10, guest buyer hit a missing-user_id error
mid-branch). Its analytics calls fire in only some branches, so purchase events undercount
real sales by ~50% (verified against Stripe; see docs/funnel doctrine + admin dashboard,
which already reads stripe_payments instead).

## Structure (mapped 2026-06-10)

- `case "checkout.session.completed"` — lines ~793-5330 (!), containing sequential
  per-product blocks for: one_time_session, sselfie_studio_membership, credit_topup,
  paid_blueprint, brand_strategy_pack, starter_kit, masterclass, prompt_vault,
  selfie_to_brand_shoot_system, visibility_suite, selfie_guide, selfie_guide_bundle,
  academy_mini_product, transform_topup.
- `case "customer.subscription.created"` ~5330, `invoice.paid`/`payment_succeeded` ~5452,
  `customer.subscription.deleted` ~5988, `invoice.payment_failed` ~6037,
  `customer.subscription.updated` ~6146.

## The rules (non-negotiable)

1. **EXTRACT, never rewrite.** Move code blocks verbatim into modules. If a line looks ugly
   but works, it moves as-is. Improvements are SEPARATE commits after extraction is proven.
2. **One product per commit.** Each commit: extract one product's fulfillment into
   `lib/payments/handlers/<product>.ts`, route file calls it, build green, diff reviewed for
   accidental logic change. Never two products in one commit.
3. **Shared context object, not shared mutation.** Each handler receives
   `{ event, session, sql, customerEmail, userId, productType, metadata, isTestMode }` (define
   `lib/payments/types.ts`). Helpers used by multiple products (stripe_payments insert, Resend
   contact add, markRevenueEnginePurchase, token creation) move to `lib/payments/shared.ts`
   once, verbatim.
4. **The webhook entry stays the same route + same signature verification.** Only the body
   slims down to: verify → parse → dispatch by event type → per-product handler → ack.
5. **Order of extraction (most-recently-touched first, so the riskiest code gets eyes):**
   prompt_vault → starter_kit → selfie_to_brand_shoot_system → sselfie_studio_membership →
   credit_topup → paid_blueprint → brand_strategy_pack → masterclass → selfie_guide(+bundle)
   → academy_mini_product → visibility_suite → one_time_session → transform_topup →
   subscription lifecycle cases last.
6. **Tests before touching:** tests/ has Stripe-related tests — run them first for a baseline
   (`npx vitest run tests/ 2>&1 | tail`), and add a characterization test per extracted
   handler where feasible (construct a fake session object, assert the same DB writes are
   attempted — mock `sql`).
7. **After ALL extractions are merged and stable for a few days**, one behavior-change commit:
   fire `logAnalyticsEvent` for EVERY paid product from ONE place in the shared pipeline
   (event per product type, properties incl. session id + amount), fixing the ~50% undercount.
   This commit is small, isolated, and clearly labeled.
8. **Deploy gate:** Sandra merges each PR. After the first product ships, watch one real
   purchase fulfill end-to-end (stripe_payments row + delivery email + access) before
   continuing. The admin /admin/webhook-review page is the alarm if anything regresses.

## Done means

- route.ts under ~800 lines (verify + dispatch only)
- lib/payments/handlers/* one file per product, lib/payments/shared.ts for common steps
- all existing tests green + new characterization tests
- one follow-up commit adds the universal purchase analytics event
- CLAUDE.md dead-code map updated (also fix the stale entry claiming
  /api/maya/generate-feed is dead — it is LIVE, called by maya-chat-screen.tsx)

## Never trust analytics events for money

Purchase counts come from `stripe_payments` or the Stripe API only. This is doctrine
(docs/DEEP_AUDIT_AND_CLEAN_PLAN_2026-06-10.md §6.5).
