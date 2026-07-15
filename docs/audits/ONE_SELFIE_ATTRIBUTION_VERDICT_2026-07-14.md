# One Selfie email-to-landing attribution verdict

Date: 2026-07-14

Status: investigation complete; production fix held until the attended event closes.

## What the numbers mean

The original "99 clicks versus 23-24 visits" comparison mixed provider activity with confirmed
page use.

- Resend stored 88 offer-link click webhook rows for the opening broadcast.
- Those rows collapse to 49 distinct click actions from 44 recipient messages after duplicate
  webhook deliveries are removed.
- SSELFIE recorded 26 client-side landing events from 24 unique browser identities with the exact
  opening-email attribution.
- The landing URL returned HTTP 200 directly. `utm_source=email`, `utm_medium=launch`,
  `utm_campaign=one_selfie_visibility_48h`, and `utm_content=open` all survived intact.
- No shared-IP burst explained the difference. Resend exposed the click relay as Amazon CloudFront,
  which is not the customer's browser user agent and cannot reliably identify a human click.

## Verdict

The confirmed landing denominator for the opening email is 24 unique browser visitors, not 99.
Resend click totals are useful as provider engagement signals but cannot be treated as landing-page
visits. The remaining provider clicks did not produce a confirmed client render; possible causes
include security inspection, prefetching, closing before JavaScript completed, or client-side
tracking prevention. The available historical evidence cannot separate those causes exactly.

## Fix

Keep `offer_landing_view` as the confirmed browser-render event. Add a separate
`offer_landing_request` event from the server-rendered offer page with request user agent,
prefetch/crawler classification, and the same UTM values. Future funnel reports can compare:

1. Resend distinct recipient clicks.
2. SSELFIE server requests, with suspected automation labeled.
3. SSELFIE confirmed browser views.

Do not add provider clicks and browser views together, and do not use either source for revenue.
Revenue remains Stripe or qualifying `stripe_payments` truth.
