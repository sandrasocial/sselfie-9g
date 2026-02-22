# TASK: ACADEMY-02 — Checkout Flow + Stripe Webhook

**Priority:** CRITICAL — this is the revenue blocker
**Assigned to:** Codex
**Created:** February 20, 2026
**Depends on:** ACADEMY-01 complete ✅

---

## Context

Three Academy products are live in Stripe with real price IDs:
- What To Say — €17 — `price_1T2xljEVJvME7vkwFcaN1GEw`
- Show Up — €27 — `price_1T2xllEVJvME7vkwHC3r6GAI`
- Get Paid — €47 — `price_1T2xlmEVJvME7vkwkbgotHoB`

The access logic exists in `lib/academy-access.ts`.
The DB tables exist: `academy_course_purchases`, `user_tags`.
The products are defined in `lib/products.ts` as `ACADEMY_PRODUCTS`.

**What's missing:** A way for users to actually buy these products.

---

## What Needs To Be Built

### 1. Checkout API route
`/api/academy/checkout`
- Accepts `productId: "what_to_say" | "show_up" | "get_paid"`
- Creates a Stripe Checkout Session for the correct price
- `success_url` → `/academy/success?product={productId}`
- `cancel_url` → back to academy page
- Passes `userId` in metadata for webhook processing
- Uses `payment_mode` (not subscription)

### 2. Stripe Webhook handler
`/api/webhooks/stripe` (extend existing or create new endpoint)
- Handle `checkout.session.completed` event
- Extract `productId` from session metadata
- Write row to `academy_course_purchases`
- Add tag to `user_tags` (e.g. `bought_what_to_say`)
- Grant access via `academy-access.ts` logic
- Trigger upsell email (see upsell chain below)

### 3. Success page
`/academy/success`
- Shows purchase confirmation
- Shows what they just got access to
- Shows the upsell offer (next product in chain)
- Uses Sandra's brand voice (see `/docs/brand/VOICE_BIBLE.md`)
- Design: Scandinavian minimal (see MASTER_BRIEF.md for colors/fonts)

### 4. Academy landing/product pages (if not yet existing)
- One page per product showing: name, tagline, description, price, buy button
- Buy button → `/api/academy/checkout`
- Check if these pages exist already before building

---

## Upsell Chain (implement in post-purchase email)

what_to_say → upsell to show_up
show_up → upsell to get_paid
get_paid → upsell to membership (€97/month Creator Studio)
membership → Brand Engine VIP (discovery call)

Post-purchase email should be triggered from webhook.
Use Resend. Follow voice guide.

---

## ManyChat Integration Note

Each product has a `manychatKeyword`:
- `SAY` → What To Say
- `CONTENT` → Show Up
- `PAID` → Get Paid

These keywords are meant to trigger DM automations on Instagram → purchase flow.
This is the paid ads automation Sandra wants (ad → DM keyword → checkout link).
ACADEMY-02 only needs to build the checkout end. ManyChat wiring is ACADEMY-03.

---

## Validation Required

- [ ] Stripe test mode checkout works end to end
- [ ] Webhook fires and writes to `academy_course_purchases`
- [ ] User tag added correctly
- [ ] `academy-access.ts` returns correct access after purchase
- [ ] Success page renders with correct product name
- [ ] No TypeScript errors in new files (pre-existing repo errors are OK to ignore)

---

## Notes

- Stripe key in `.env.local` is `sk_live` — academy prices created in live mode
- Do not create new Stripe products or prices — use existing `STRIPE_PRICE_*` env vars
- Keep pages mobile-first (375px minimum)
- Write STATUS.md update when complete
