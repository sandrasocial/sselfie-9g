# PRESETS-ORDER-BUMP-01 — "Upgrade to the full set" order bump at single-collection checkout

**Owner:** Codex (checkout logic). Design/copy: Claude (approved below).
**Priority:** Fast-follow after launch. Does NOT block the presets launch — ship within a day or two of go-live.
**Status:** SPEC READY 2026-06-17. Sandra approved the structure (chose "upgrade to full set +$20" over a $9.99 single add-on).

## The offer (decided)
At the **single-collection** checkout (`tier=single`), show ONE order-bump option that upgrades the buyer to the full bundle:

> **Make it the full set** · Add every collection (all current + every future drop) for **$20 more**. You'd pay $19 for one; get all 6+ for $39 total.

- Single = $19 (`STRIPE_PRICE_PRESETS_SINGLE` = price_1TjHLMEVJvME7vkwntxJY3Ys)
- Bundle = $39 (`STRIPE_PRICE_PRESETS_BUNDLE` = price_1TjHLNEVJvME7vkwpWAGv6G6)
- The bump's effective delta is +$20 (19 → 39). It is NOT a separate SKU — it converts the order into a bundle order.

## How to build it (Stripe-native, no third-party tool)
Stripe added `optional_items` to Checkout Sessions (March 2025, available on our 2026-01-28.clover API). BUT `optional_items` adds a line item; it does not *replace* the single with the bundle, and we do not want the buyer charged $19 + $39. So **do not use optional_items for this bump.** Instead:

**Recommended approach — a toggle on our own checkout UI that swaps the price before session creation.** The presets checkout page (`app/checkout/presets/page.tsx`) already controls tier. Add a checkbox in the single-tier view: "➕ Make it the full set (+$20)". When checked, the client sends `tier=bundle` (instead of `single`) into the existing session-creation path. No new Stripe price, no new line-item math — it simply creates a bundle session ($39) and the buyer gets the full library + future drops via the existing bundle fulfillment.

- Checked state must clearly show the new total ($39) and what changes ("all 6 collections + every future drop, yours forever").
- Unchecked = the single ($19) for the chosen collection, unchanged.
- Preserve the chosen `collection` slug in state so an *unchecked* purchase still fulfills that one collection; a *checked* purchase ignores the single collection and grants the bundle.
- Keep UTM/attribution: tag the upgraded session so we can measure bump take-rate, e.g. add `checkout_source=order_bump_to_bundle` / a `bump_taken=true` flag in metadata. Money truth still = stripe_payments; the flag is for behavior only.

## Copy (approved — Sandra's voice, no em-dashes, no banned words)
- Bump label: **Make it the full set**
- Bump body: "Get every collection, not just this one. All 6, plus every new drop, yours forever. Add them all for $20 more."
- Checked confirmation line: "Nice. You're getting the whole library · $39 total."

## Acceptance
1. Single-tier checkout shows the bump checkbox with the chosen collection still named.
2. Unchecked → $19 session for that collection (current behavior, unchanged).
3. Checked → $39 bundle session; buyer receives full-library access on completion.
4. No double-charge, no orphan line items; totals shown match what Stripe charges.
5. Bump take-rate is queryable from session metadata (behavior data only, not money).
6. Mobile layout: the bump sits directly above the pay button, one tap, no scroll surprise.

## Measure after launch
Target opt-in 20%+ (creator order-bump benchmark). Report take-rate + AOV lift from stripe_payments once ~20 single-eligible checkouts have run.
