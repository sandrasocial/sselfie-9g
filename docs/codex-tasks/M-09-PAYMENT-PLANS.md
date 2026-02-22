# TASK M-09 — Payment Plans for Brand Engine
Priority: Medium · Do after M-08 Stripe verification is complete
Estimated time: 1-2 hours

## Objective
Add optional payment plan pricing to the Brand Engine admin dashboard.
Sandra offers payment plans ONLY when a lead hesitates or asks — not automatically.

## Business decisions (locked by Sandra 2026-02-18)
- Payment plans are offered manually, not shown by default
- Missed payment policy: access pauses after 7 days of failed payment
- Payment plan confirmation email must include: "Your access continues as long as payments are up to date."

## Payment plan structure

### Cohort — €2,497
- Full pay: €2,497 one-time (already exists)
- Plan: 2 x €1,299 (first payment now, second in 30 days)
- Total on plan: €2,598 (slight premium, standard practice)

### VIP — €4,997
- Full pay: €4,997 one-time (already exists)  
- Plan: 3 x €1,749 monthly
- Total on plan: €5,247 (slight premium, standard practice)

## What to build

### 1. Stripe setup
Create two new Stripe prices (do NOT touch existing full-pay prices):
- brand_engine_cohort_plan_2x: €1,299 recurring, interval=month, count=2
- brand_engine_vip_plan_3x: €1,749 recurring, interval=month, count=3

Add to Vercel env vars:
- STRIPE_BRAND_ENGINE_COHORT_PLAN_PRICE_ID
- STRIPE_BRAND_ENGINE_VIP_PLAN_PRICE_ID

### 2. Database
Add column to brand_engine_applications:
- payment_type VARCHAR(20) DEFAULT 'full' — values: 'full' or 'plan'

### 3. Admin dashboard
In the Send Offer flow, add a simple toggle:
- [ ] Full payment (default)
- [ ] Payment plan

When "payment plan" is selected, use the instalment price ID instead of full price ID.
Label should show: "2 x €1,299" or "3 x €1,749" clearly.

### 4. Email
When payment plan is selected, append this line to the offer email:
"Your access continues as long as payments are up to date."

### 5. Webhook handling
When a recurring payment fails (invoice.payment_failed event):
- After 7 days of failed status: set a flag on the application
  (add column: access_paused BOOLEAN DEFAULT FALSE)
- Sandra gets an admin alert email with the lead's name and what failed
- Do NOT automatically remove access — flag it for Sandra to action

## Files to reference
- lib/brand-engine/offer-checkout-config.ts (add new price IDs)
- lib/brand-engine/offer-checkout.ts (handle plan mode)
- app/api/admin/brand-engine-applications/send-offer/route.ts
- app/api/webhooks/stripe/route.ts (add failed payment handling)

## Out of scope
- Do NOT change the full-pay flow in any way
- Do NOT show payment plans on the public application form
- Do NOT build automatic access removal — flag only

## Acceptance criteria
- [ ] Admin dashboard shows payment type toggle on Send Offer
- [ ] Correct Stripe price used based on toggle selection
- [ ] Offer email includes access policy line when plan selected
- [ ] Failed payment webhook flags application and sends Sandra alert
- [ ] Full-pay flow unchanged and still working

## Do this AFTER
M-08 Stripe verification is confirmed complete.
