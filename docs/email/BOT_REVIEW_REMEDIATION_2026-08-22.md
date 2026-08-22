# Email bot-review remediation · 2026-08-22

This batch addresses review findings raised after PRs #77–#82 and aligns email ascension with the newer product architecture.

## Functional fixes

- Resend global Contact properties are read from the provider's `{ type, value }` response shape before lifecycle merge.
- Existing customer/member stage and first acquisition path are preserved.
- Encrypted `checkout_email` handoffs are decoded by all current revenue-email checkout routes.
- Subscriber win-back rechecks recent purchase and current membership access immediately before applying sunset suppression.
- High-intent recovery selects the newest product click first, then applies the 18-hour delay.
- Historical lifecycle backfill failures use retry backoff so permanent failures cannot starve later contacts.
- Membership-status sync missing contacts use retry backoff so missing Resend records cannot monopolize the hourly batch.
- Stale recipient-name and membership-sync tests are corrected.

## Product-strategy change

The automated low-ticket -> Studio app bridge is retired.

Aligned journey:

`FREE RESULT -> LOW-TICKET RESULT -> SSELFIE / SKOOL IMPLEMENTATION -> STUDIO APP`

The retired cron remains an authenticated no-op until a replacement Skool/community bridge has one canonical paid offer URL and entitlement source of truth.

Studio/app should be offered later when creation capacity, speed, personalization, or scale is the real bottleneck; it should not be the automatic Day 10/14 upsell after a $37 transaction.

## Editorial drafts

The three current Resend drafts remain strategically valid:

- TAKE / window-light email: keep, no offer.
- Sandra Note / TAKE -> EDIT -> EXPAND -> USE: keep, no platform sale.
- EDIT / before-the-preset email: keep, soft Selfie Starter CTA.

No broad broadcast is sent or scheduled by this remediation.
