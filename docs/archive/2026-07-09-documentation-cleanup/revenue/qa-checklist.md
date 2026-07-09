# SSELFIE Revenue QA Checklist
*Last updated: 2026-05-13*

> Run this checklist before any launch, after any webhook changes, and monthly as a spot-check.
> Use a fresh Stripe test mode checkout for each scenario.

---

## Starter Kit — Full End-to-End

### Pre-purchase
- [ ] `/starter-kit` marketing page loads correctly
- [ ] Price shows $37 USD
- [ ] "Presets" is mentioned visibly on the page
- [ ] Checkout CTA leads to `/checkout/starter-kit`

### Checkout
- [ ] Stripe Embedded Checkout loads at `/checkout?product_type=starter_kit&client_secret=...`
- [ ] Email field is required — cannot complete without email
- [ ] Payment succeeds with Stripe test card `4242 4242 4242 4242`

### Success page (`/checkout/success?type=starter_kit&session_id=...`)
- [ ] "Selfie Starter Kit" shows in ORDER DETAILS panel
- [ ] "Included" list shows: Lightroom preset download, Selfie Guide access, Quick-start checklist, 7-day content starter
- [ ] Helper text mentions presets
- [ ] Primary CTA: "Open your Starter Kit"
- [ ] Secondary CTA: "Need help? Email support"

### Webhook + entitlement
- [ ] Webhook fires and processes `starter_kit` product type
- [ ] `user_entitlements` row created with `product_id = 'starter_kit'`
- [ ] `subscriptions` row created with `product_type = 'starter_kit'`
- [ ] `freebie_subscribers` row created or updated with `access_token` set
- [ ] `guide_access_email_sent = TRUE` set after delivery email sent

### Delivery email
- [ ] Email arrives at buyer's address within 2 minutes
- [ ] Subject: "your starter kit is here — presets inside"
- [ ] FIRST button: "Download Your Presets" (prominent, solid button)
- [ ] Preset button link is valid (returns 200, downloads a .zip)
- [ ] Second button: "Set Your Password" (if new account) OR "Open Your Starter Kit"
- [ ] Fallback access URL is present at bottom
- [ ] support@sselfie.ai contact path visible

### Preset download
- [ ] Preset ZIP downloads when clicking the email button
- [ ] ZIP contains Lightroom presets (.xmp or .lrtemplate files)
- [ ] Install instructions are clear (or linked to a how-to)

### Access via email link
- [ ] Clicking "Open Your Starter Kit" leads to `/access/starter-kit/[token]`
- [ ] Page loads without requiring login (token-based, no auth)
- [ ] Preset download button visible above the fold
- [ ] Selfie Guide link works
- [ ] Quick-start checklist visible

### Access via authenticated app
- [ ] User sets password via the password setup link in email
- [ ] After login, `/academy/access/starter-kit` redirects to `/access/starter-kit/[token]`
- [ ] No redirect to the Editing Masterclass course (regression test)

### Access recovery
- [ ] User visits `/access` and enters their purchase email
- [ ] Page shows "Check your inbox" after submit (regardless of whether email found)
- [ ] Recovery email arrives with access links
- [ ] Recovery attempt logged in `email_logs` with type `access_recovery_attempt`

### Webhook idempotency
- [ ] Replay the same `checkout.session.completed` event in Stripe test dashboard
- [ ] Second replay does NOT create duplicate `user_entitlements` row
- [ ] Second replay does NOT send a second delivery email

### Missing customer edge case
- [ ] If `customer: null` on the session, webhook still processes the payment
- [ ] Payment is stored in `stripe_payments` with available data
- [ ] No silent failure — at minimum, a console error log with session ID

---

## Selfie Guide — End-to-End

### Purchase
- [ ] `/selfie-guide` landing page shows $17 price, no mention of presets
- [ ] Checkout completes successfully
- [ ] Delivery email arrives: "Your First Visible Post Guide is ready"
- [ ] Email does NOT mention presets (presets are Starter Kit exclusive)
- [ ] Access link leads to `/selfie-guide/access/[token]`

### Access
- [ ] Token-based access works without login
- [ ] Guide content loads correctly
- [ ] 7-day challenge visible
- [ ] Upsell to Starter Kit (not preset bundle — presets are Starter Kit)

---

## Masterclass — End-to-End

- [ ] `/masterclass` page loads with $147 price
- [ ] Checkout completes
- [ ] Delivery email arrives: "start with your strategy"
- [ ] Email links to Brand Strategy setup
- [ ] `/academy/access/masterclass` requires login and grants access
- [ ] After setup, `/academy/access/brand-strategy` accessible
- [ ] Lifecycle emails (day2, day5, day7, day10, day14) are queued

---

## SSELFIE Studio — End-to-End

- [ ] `/join/studio` or `/checkout/membership` leads to membership checkout
- [ ] Subscription created in Stripe
- [ ] `subscriptions` row created in DB with `status = 'active'`
- [ ] Welcome email arrives (onboarding-day-0)
- [ ] `/studio` accessible after signup
- [ ] After cancellation, access is downgraded (not immediately cut off mid-period)

---

## What To Say / Show Up / Get Paid

- [ ] Each product has an active Stripe price ID (the `price_1TRsh*` series, NOT the deactivated `price_1T2xl*` series)
- [ ] Checkout completes for each
- [ ] Entitlement created for the correct `product_id`
- [ ] Academy access page loads for each
- [ ] TODO: dedicated delivery email for each (currently using generic)

---

## Access Recovery (`/access`)

- [ ] Page loads without login required
- [ ] Submitting an email that has purchases → "Check your inbox"
- [ ] Submitting an unknown email → same "Check your inbox" (no enumeration)
- [ ] Recovery email contains correct access links
- [ ] Logs written to `email_logs`
- [ ] Invalid email (no @) → client-side validation prevents submit

---

## Admin / Support Spot-Check

- [ ] For `sutterkr@gmail.com` (Kristin Hull case): admin can find purchase in DB
- [ ] Access token exists in `freebie_subscribers`
- [ ] Token-based URL `/access/starter-kit/[token]` works directly
- [ ] Admin can resend by triggering the delivery email function manually

---

## Regression Tests (run after every webhook change)

- [ ] `starter_kit` still grants entitlement
- [ ] `selfie_guide` still creates token and sends email
- [ ] `sselfie_studio_membership` still grants Studio access
- [ ] `paid_blueprint` still grants feed planner access
- [ ] `brand_strategy_pack` still creates setup token and redirects
- [ ] Deactivated price IDs (`price_1T2xl*`) are NOT accepted by any active checkout

---

## Definition of Done

A product is "done" when:
1. Checkout completes without errors
2. Delivery email arrives within 5 minutes
3. Customer can access their purchase without contacting support
4. Webhook replay is idempotent
5. Access recovery (`/access`) sends correct links
6. Product appears in `docs/revenue/product-map.md`
