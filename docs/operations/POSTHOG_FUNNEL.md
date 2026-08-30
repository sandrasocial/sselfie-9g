# PostHog activation funnel

PostHog is a secondary, fail-open product-behavior sink. The existing Neon `analytics_events` table remains the internal event ledger and source of truth. Revenue truth remains Stripe. This integration does not change customer flows, billing, entitlements, or lifecycle email behavior.

## Runtime configuration

Set these values in the intended Vercel environment only after review:

- `POSTHOG_PROJECT_KEY` and `NEXT_PUBLIC_POSTHOG_KEY`: the EU project token.
- `POSTHOG_HOST` and `NEXT_PUBLIC_POSTHOG_HOST`: `https://eu.i.posthog.com`.

With no project key, both server and browser capture are disabled. Provider lifecycle work is registered before request handlers can return; each event is then written to Neon first and delivered to PostHog after the response. Provider delivery times out after 750 ms and never blocks the product flow. A failed Neon write does not create a provider-only event.

## Privacy contract

The server adapter sends only mapped event names, stable internal or anonymous identifiers, pathnames without query strings, and a small allowlist of primitive business properties. UTM and event-source values must match static operational allowlists. Revenue observations normalize the existing `product_type` and numeric `value` fields to `product` and `revenue_value`. The adapter drops customer-authored text, prompts, captions, images, URLs, email/name/phone fields, tokens, IP metadata, user agents, referrers, nested objects, and arrays.

Browser capture masks all text, inputs, and element attributes. Session replay canvas, fonts, console logs, request bodies, and request headers are disabled. The browser identifies with the same privacy-safe `user:<Neon ID>` or `anon:<cookie ID>` used by server capture. Every browser event payload, including pageviews, autocapture, exceptions, and replay metadata, replaces access and claim token segments with `[token]`; manual pageviews also omit query strings. Do not relax these controls without a privacy review.

## First activation funnel

Create the funnel in PostHog from these canonical events:

1. `sselfie_reference_added`
2. `sselfie_generation_completed` or `sselfie_edit_used`
3. `sselfie_result_saved`

Use the event property `source_event` to inspect which existing application action contributed to a canonical step. The adapter deliberately ignores all application events that are not in its static mapping.

## Verification after approval

1. Add the four environment variables to a preview environment first.
2. Open a preview with a test account and complete one reference-add, generation/edit, and save path.
3. Confirm those canonical events appear in PostHog with no PII, authored content, image data, query strings, request bodies, or request headers.
4. Confirm the same events remain present in Neon.
5. Only then promote the reviewed environment configuration through the normal deployment approval path.
