# SSELFIE Revenue Truth Implementation

Date: 2026-07-01

## What Changed

This pass makes Stripe live subscriptions the official source for active members and net MRR, while keeping `stripe_payments` as historical revenue only.

## Revenue Language Lock

- Payments = charge rows in `stripe_payments`.
- Customers = unique paying people.
- Members = active live Stripe subscriptions only.
- MRR = live Stripe subscription amount, net of discounts.
- Checkout behavior = `checkout_attribution`.
- Audience behavior = `analytics_events`.

## Files Changed

- `lib/revenue/single-source.ts`
  - Added net and gross MRR breakdowns by currency.
  - Keeps live Stripe subscription data as the member/MRR source.

- `lib/stripe/stripe-live-metrics.ts`
  - Converted the old helper into a compatibility wrapper around `getSingleSourceRevenueMetrics`.
  - Removed the old list-price/database MRR logic that could inflate member revenue.

- `lib/admin/revenue-truth-scorecard.ts`
  - Added the official daily scorecard source.
  - Combines live Stripe member truth, historical `stripe_payments`, checkout behavior, trial activation, Work With Me pipeline, and demand signals.
  - Uses `analytics_events.event_name`.

- `lib/admin/home-report.ts`
  - Wires the scorecard into the admin home report.
  - Exposes currency-aware MRR fields.

- `app/admin/page.tsx`
  - Shows net MRR by currency.
  - Labels historical revenue clearly as payment rows, not member count.
  - Adds the Daily Business Scorecard section.

- `lib/admin/growth-intelligence.ts`
  - Adds the revenue scorecard to growth intelligence.

- `lib/admin/daily-sandra-briefing.ts`
  - Adds a Revenue Truth block to the daily briefing email.
  - Prioritizes Suite trial activation and Work With Me follow-up leaks.

- `lib/brand-engine/applications.ts`
  - Adds testable Work With Me lead scoring.
  - Routes qualified Work With Me applicants toward a fit call.

- `app/api/inquiry/submit/route.ts`
  - Persists Work With Me applications into `brand_engine_applications`.
  - Adds status, score, tags, pipeline stage, expected value, routing path, and next action.
  - Changes confirmation copy away from passive payment-link language.

## Verification

- `pnpm exec vitest run tests/brand-engine-applications.test.ts tests/daily-sandra-briefing.test.ts tests/suite-trial-contract.test.ts`
  - Passed: 30 tests.

- `pnpm exec tsc --noEmit --pretty false`
  - Passed.

- `pnpm build`
  - Passed.
  - Existing warnings remain:
    - `baseline-browser-mapping` data is older than two months.
    - Next.js warns that the old `middleware` convention should move to `proxy`.
    - Edge runtime disables static generation for some pages.

- `node scripts/verify-repo-invariants.mjs`
  - Passed.

## Notes

- A direct local `tsx` smoke import of the scorecard is blocked by the `server-only` package outside the Next.js server runtime. The production build and targeted tests cover the runtime path.
- Existing email HTML lint warnings for hardcoded colors remain. They are not changed in this pass because this task was about revenue truth and pipeline tracking.

## Next Best Business Tasks

1. Use the new scorecard for every daily decision.
2. Fix Suite trial activation around first generation and download.
3. Work every Work With Me lead through the fit-call pipeline instead of sending passive payment links.
4. Add admin controls for updating Work With Me status: qualified, booked call, payment link sent, won, lost.
5. Review whether Selfie to Brand Shoot should remain a bonus/onboarding path until it has fresh proof.
