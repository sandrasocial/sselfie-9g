# TASK M-08 — Verify Stripe Price IDs for Brand Engine
Priority: URGENT · Do before Sandra sends any payment links
Estimated time: 15 minutes

## Objective
Verify that both Stripe price IDs for Brand Engine are correctly configured
in Vercel environment variables before Sandra sends live payment links to leads.

## Why this matters
If these env vars are missing or wrong, the checkout will throw an error
when Sandra tries to send a payment link from the admin dashboard.
She has warm leads waiting RIGHT NOW.

## What to check

1. Verify these two env vars exist in Vercel production:
   - STRIPE_BRAND_ENGINE_COHORT_PRICE_ID
   - STRIPE_BRAND_ENGINE_VIP_PRICE_ID

2. Confirm the prices in Stripe match:
   - Cohort = €2,497 (one-time payment)
   - VIP = €4,997 (one-time payment)

3. If price IDs exist but amounts are WRONG:
   - Create new Stripe prices with correct amounts
   - Update Vercel env vars
   - Do NOT delete old prices (Stripe best practice)

4. If price IDs are MISSING:
   - Create products + prices in Stripe dashboard
   - Cohort: €2,497 one-time, name "Brand Engine Cohort — March 2026"
   - VIP: €4,997 one-time, name "Brand Engine VIP — March 2026"
   - Add price IDs to Vercel env vars

5. Test the flow end-to-end:
   - Use the existing test lead in admin dashboard
   - Hit "Send Offer" and confirm checkout link generates without error
   - Do NOT complete the payment (just verify the link works)

## Files to reference
- lib/brand-engine/offer-checkout-config.ts
- lib/brand-engine/offer-checkout.ts
- app/api/admin/brand-engine-applications/send-offer/route.ts

## Out of scope
- Do NOT change checkout flow logic
- Do NOT touch other Stripe products or subscriptions
- Do NOT touch email templates

## Acceptance criteria
- [ ] Both env vars confirmed set in Vercel production
- [ ] Both Stripe prices match correct amounts
- [ ] Test offer send generates a valid checkout URL without error
- [ ] Report back with confirmation before Sandra sends live links

## Urgency
Sandra has warm leads waiting for payment links TODAY.
This is blocking revenue. Do this first.
