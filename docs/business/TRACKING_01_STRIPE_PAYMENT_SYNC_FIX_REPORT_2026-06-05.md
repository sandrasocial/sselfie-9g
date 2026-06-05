# TRACKING-01 Stripe Payment Sync Fix Report

Date: 2026-06-05  
Branch: `codex/tracking-01-stripe-payment-sync`  
Base commit: `c8edb4da`

## Executive Summary

TRACKING-01 fixes the Stripe to database revenue recording gap for paid Checkout sessions where no `user_id` can be resolved.

Before this patch, guest payments could hit a hard webhook failure (`400`) before writing to `stripe_payments`. That meant live Stripe sales could succeed while Neon revenue reporting stayed incomplete.

After this patch, the webhook records the payment in `stripe_payments` first, with `user_id = NULL` if needed. User-bound fulfillment, entitlements, access, credits, and delivery emails still require the existing user/account flow.

## What Changed

### 1. Guest-safe revenue recording

File: `app/api/webhooks/stripe/route.ts`

- Added `recordCheckoutSessionRevenue`.
- Upserts into `stripe_payments` using:
  - `stripe_payment_id = payment_intent id` when available, otherwise Checkout Session id.
  - `stripe_customer_id = Stripe customer id` when available, otherwise email/session fallback.
  - `user_id = resolved user id` or `NULL`.
  - `metadata.recorded_without_user_id` for admin/debug visibility.
- Uses `ON CONFLICT (stripe_payment_id)` so Stripe retries and duplicate webhook events remain idempotent.
- If a user is resolved later in the webhook, the same row is enriched with `user_id`.

### 2. Missing user no longer marks payment webhook failed

File: `app/api/webhooks/stripe/route.ts`

- Removed the old hard failure behavior for missing `user_id`.
- If revenue is recorded but no user exists, the webhook now:
  - flags the event for admin review,
  - marks the Stripe event processed,
  - returns `200`,
  - does not grant access or entitlements.

This keeps revenue honest without accidentally unlocking products.

### 3. Selfie to Brand Shoot source recognized

File: `app/api/webhooks/stripe/route.ts`

- Added `selfie_to_brand_shoot_paid` to the public paid checkout source list so the $197 route is not treated like an unknown guest source.

### 4. 90-day backfill hardening

File: `scripts/backfill/backfill-stripe-payments-recent.ts`

- Default backfill window changed from 30 days to 90 days.
- Backfill now stores payment intents and charges even when Stripe has no customer object, using stable fallback customer ids.
- Backfill skips charges that already have a payment intent so one-time payments are not double-counted by both the payment-intent and charge loops.
- Backfill upsert now enriches existing rows with:
  - `user_id` when resolvable,
  - latest amount/currency,
  - merged metadata.
- Stripe API version aligned with the repo Stripe client.

Safe dry-run command:

```bash
DRY_RUN=true DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
```

Live backfill command:

```bash
DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
```

Note: The clean worktree did not contain `.env.local`, so the live backfill was not run from this branch.

### 5. Admin drift monitor

File: `app/api/admin/stripe/payment-drift/route.ts`

- Added an admin-only endpoint:

```text
/api/admin/stripe/payment-drift
```

It compares live Stripe successful live-mode charges with `stripe_payments` for 7-day and 30-day windows.

It reports:

- Stripe charge count and amount.
- Database payment count and amount.
- Missing-user payment rows.
- Count and amount drift.
- Severity: `ok`, `watch`, or `critical`.

## Files Changed

- `app/api/webhooks/stripe/route.ts`
- `app/api/admin/stripe/payment-drift/route.ts`
- `scripts/backfill/backfill-stripe-payments-recent.ts`
- `tests/stripe-payment-recording.test.ts`
- `docs/business/TRACKING_01_STRIPE_PAYMENT_SYNC_FIX_REPORT_2026-06-05.md`

## What Did Not Change

- Checkout session creation logic was not changed.
- Stripe product IDs were not changed.
- Entitlement logic was not changed.
- Access-token logic was not changed.
- Customer permissions were not changed.
- Credit granting logic was not changed.
- Email send paths were not changed.
- Vault, Starter Kit, Selfie to Brand Shoot, Studio, Maya, Feed Planner, Blueprint, Academy, Selfie Guide, and Masterclass access were not changed.

## Test Results

Passed:

```bash
pnpm exec vitest run tests/stripe-payment-recording.test.ts
```

This test proves a paid Prompt Vault checkout with:

- no `user_id`,
- no matching user,
- unexpected source,

still inserts into `stripe_payments`, does not call `markEventFailed`, and returns HTTP 200.

Passed with warnings only:

```bash
pnpm exec eslint app/api/webhooks/stripe/route.ts app/api/admin/stripe/payment-drift/route.ts scripts/backfill/backfill-stripe-payments-recent.ts tests/stripe-payment-recording.test.ts --max-warnings 99999
```

Result: 0 errors, 349 warnings. Warnings are the existing style pattern in the large webhook/backfill files (`any`, console usage, legacy hardcoded colors).

Full repo typecheck:

```bash
pnpm exec tsc --noEmit --pretty false
```

Failed from existing unrelated repo-wide TypeScript issues. The visible failures are in areas such as admin academy, AI prompts subscribe, feed planner, Maya, onboarding, gallery, email transactional sender, and legacy prompt authority. No full-repo typecheck failure was identified in the new admin drift endpoint or webhook payment-recording patch.

Existing academy webhook regression:

```bash
pnpm exec vitest run tests/webhook-academy-purchase.test.ts
```

One assertion fails on stale expected email copy (`Open your Visibility To Paid Path`) versus current template copy (`Open your Visibility path`). This appears unrelated to TRACKING-01. The test also confirms the academy branch still reaches entitlement/email behavior.

## Launch/Revenue Verification Steps

1. Deploy this branch through the normal `main` merge flow.
2. Run the 90-day backfill in an environment with `STRIPE_SECRET_KEY` and `DATABASE_URL`:

```bash
DRY_RUN=true DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
DAYS=90 pnpm exec tsx scripts/backfill/backfill-stripe-payments-recent.ts
```

3. Open the admin drift endpoint while logged in as admin:

```text
https://www.sselfie.ai/api/admin/stripe/payment-drift
```

4. Compare 7-day and 30-day drift after backfill.
5. Pull the revenue report again after the backfill to reconcile Stripe vs Neon.

## Known Risks

- The new drift endpoint compares live Stripe charges against DB payment rows. It is an alarm, not a perfect accounting ledger, because some DB rows use payment intent/session ids while Stripe charge ids may differ.
- Missing-user revenue rows intentionally do not grant access. Those events are flagged for review so Sandra/support can resolve buyer access safely.
- The webhook file remains large and noisy. This patch avoids refactoring it to keep blast radius low.

## Verdict

TRACKING-01 is ready for review and merge.

Confidence: 0.88

The core leak is closed: paid guest checkouts can now be recorded even when user resolution fails, while access/entitlements remain protected.
