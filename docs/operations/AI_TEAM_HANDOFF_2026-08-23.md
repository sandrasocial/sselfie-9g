# AI Team Handoff — 2026-08-23

## Current priority
Stop optimizing SSELFIE from guesswork. Instrument the live customer journey first, then let measured behavior decide what Codex/Kodis should fix next.

## Production truth
- Active repo: `sandrasocial/sselfie-9g`
- Production: https://sselfie.ai
- Vercel project: `sselfie-9g`
- Existing `AGENTS.md` remains the engineering working contract.

## Business truth
SSELFIE has customers and working acquisition paths, but monetization and retention are too low relative to the audience. The business cannot spend the next months chasing speculative UI/feature work.

The immediate technical goal is not a new feature. It is observability and activation measurement.

## Required event contract
Instrument a minimal customer funnel into the current PostHog project:

1. `lead_created`
2. `product_viewed`
3. `checkout_started`
4. `purchase_completed`
5. `account_created`
6. `selfie_uploaded`
7. `first_edit_completed`
8. `first_ai_generation_started`
9. `first_ai_generation_completed`
10. `image_saved`
11. `paywall_viewed`
12. `subscription_started`
13. `subscription_cancelled`
14. `generation_failed`
15. `payment_failed`

Use existing system/autocapture events for page views, rage clicks, exceptions and session replay where possible rather than inventing duplicates.

## Activation definition to validate
A new user is provisionally considered activated when they:

`upload selfie → create/edit a result → save a result`

Do not hard-code this as business truth without checking the existing app flow. Implement the events so the hypothesis can be measured.

## Integration requirement
Resend already posts email engagement events to `/api/webhooks/resend`. Preserve that behavior. Add a safe analytics handoff so relevant email lifecycle events can be tied to the customer journey without exposing PII in analytics unnecessarily.

Stripe remains payment truth. Do not duplicate billing logic in PostHog; send analytics events/identifiers only.

## Engineering boundaries
- Do not redesign Maya as part of this task.
- Do not create new customer features.
- Do not change prices, entitlements, credits or offers.
- Do not change current email copy or lifecycle logic.
- Do not remove existing analytics/tracking.
- Protect live users.

## Definition of done
- Current PostHog project receives production SSELFIE pageview/session data.
- The funnel events above fire on the real live paths where applicable.
- A test account can be followed from entry through first saved result.
- Session replay and exception capture work on production with appropriate privacy controls.
- Tracking failures cannot break the customer flow.
- Documentation identifies event names, trigger locations and key non-PII properties.
- Tests/typecheck/build pass.
- Completion handoff reports what changed, what remains untracked, and the first funnel to inspect.

## Why this matters
Until this exists, UI work is largely opinion. Once it exists, engineering priorities should come from measured drop-off, failure frequency, customer feedback and revenue impact.
