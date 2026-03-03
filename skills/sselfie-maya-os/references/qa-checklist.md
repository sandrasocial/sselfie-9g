# QA Checklist (Frontend + Funnel)

## Build and contract checks
- Run `pnpm type-check`.
- Run `pnpm build`.
- Run targeted analytics/funnel tests for changed contracts.

## Manual funnel smoke
1. Open `/` and verify CTA visibility and click path.
2. Run freebie flow: `/freebie/brand-strategy` -> `/strategy/[token]`.
3. Verify auth continuity through `/auth/login` or `/auth/sign-up`.
4. Complete checkout path and verify success lands in `/studio`.
5. Open app shell and verify first-action path is visible.

## Analytics smoke
- Verify emitted event names are in `lib/analytics/event-contract.ts`.
- Verify `/api/analytics/event` does not reject active events.
- Verify purchase events are logged from server-side webhook flow.

## Legacy route smoke
- `/blueprint/paid?...` should redirect to `/feed-planner?...`.
- Paid blueprint follow-up emails should point to canonical destination.

## Fail conditions (block merge)
- Broken redirect target in checkout/post-purchase flow.
- Event-name drift or unsupported analytics events in active UI.
- Writes to obsolete funnel table model for active journey.
- New alias route introduced without canonical mapping.
