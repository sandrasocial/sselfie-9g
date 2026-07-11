# SELFIE-AI-PHOTOS-KIT-01 — Build The Top-Of-Funnel Paid Kit

## ✅ PRODUCTION CHECKOUT VERIFIED 2026-07-11 (Codex)

- Public page, checkout, access page, delivery email, and buyer nurture copy were reviewed against the current SSELFIE voice and No-Fake rules. Automated surface and nurture checks pass.
- The paid access page now delivers the visual source-selfie comparison and phone-to-prompt walkthrough promised by the sales and delivery copy, using existing approved source-selfie assets.
- The live Stripe product is active at $37 USD one-time. A production checkout smoke reached the correct embedded Stripe form with the correct product metadata and price; the unpaid QA session was expired immediately.
- No production buyer exists yet, so fulfillment was verified through the handler/tests rather than by altering customer data or making an artificial paid purchase.
- Implementation, voice QA, and production checkout readiness are complete.

Status: Complete; verified 2026-07-11
Priority: High  
Source: `docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md`

## Goal

Create the low-ticket paid offer that matches what the cold Instagram and ManyChat audience is already asking for:

> Turn one clear selfie into AI photos that still look like you.

This is the offer that should monetize viral selfie tutorials, AI transformation reels, and free prompt traffic more directly.

## Strategic Role

This is not the whole business.

It is the top-of-funnel buyer conversion product.

Its job:

- convert more of the 2 million monthly-view audience into buyers
- solve the immediate selfie-to-AI-photo problem
- create a cleaner bridge into Prompt Vault and SUITE
- reduce confusion around the older Starter Kit

## Required Decision Before Build

Sandra must confirm:

1. Final product name:
   - recommended: Selfie To AI Photos Kit
2. Price:
   - recommended: $27 or $37
3. Infrastructure:
   - required: create a separate product path
   - do not repackage the existing Starter Kit

## Decision Update — 2026-07-01

The existing `starter_kit` product remains the **Selfie Starter Kit** for the Free Selfie Guide / `KIT` keyword path.

Selfie To AI Photos Kit is a separate Prompt/AI funnel offer and should not use `/checkout/starter-kit`.

`KIT` traffic must keep going to the iPhone selfie product. AI-photo traffic belongs to the Free AI Prompts / `PROMPT` path.

## Buyer

She came from:

- selfie tutorials
- iPhone settings
- AI transformation reels
- car selfie / mirror selfie content
- ManyChat keyword SELFIE or PROMPT

She wants:

- a better source selfie
- AI photos that still look like her
- simple prompts
- clear examples
- no fake-looking results
- one small thing she can do today

## Deliverables

The Kit must include:

1. Source selfie checklist.
2. Good vs bad selfie examples.
3. Phone setup guide for creating the source selfie.
4. AI photo prompt starter pack.
5. Still-you fix prompts.
6. One simple 3-image AI shoot path:
   - profile image
   - reel cover
   - lifestyle image
7. Quick guide:
   - what to upload
   - what to write
   - what to fix
8. Bridge into Prompt Vault:
   - more visual worlds
9. Bridge into SUITE:
   - monthly creation with Maya

## Copy Direction

Use simple Sandra voice.

Core promise:

> Start with one clear selfie. Use it to create AI photos that still look like you.

Avoid:

- generic AI creator language
- "perfect"
- "flawless"
- "nobody will know"
- luxury fantasy as the only promise
- heavy course language

Use:

- still you
- one clear selfie
- AI photos that look like your best day
- source photo
- simple first shoot
- what to fix when it looks fake

## Pages / Surfaces To Audit

Before building, inspect:

- product definitions
- Starter Kit landing page
- Starter Kit checkout
- Starter Kit access page
- Starter Kit delivery emails
- AI Prompts access page
- ManyChat destination assumptions
- Prompt Vault buyer bridge
- SUITE trial bridge

## Preferred Implementation Path

### Product Path: New Product Route

Repackaging created too much funnel confusion because the existing Starter Kit has a real job.

Actions:

- create new product key
- create checkout route
- create access route
- create delivery email
- create tracking events
- keep Starter Kit untouched

## Tracking Requirements

Track:

- kit landing view
- kit checkout start
- kit checkout success
- kit access opened
- source checklist viewed/downloaded
- prompt copied
- fix prompt copied
- Prompt Vault upgrade click
- SUITE trial click

## Safety Rules

Do not:

- break existing Starter Kit access
- remove legacy fulfillment
- change Stripe product IDs without approval
- create new payment logic if the existing low-ticket path can be reused
- make Prompt Vault feel obsolete
- make SUITE feel like optional clutter

## Definition Of Done

This task is complete when Sandra has:

- final product name
- price
- dedicated product route
- deliverables
- page copy direction
- email copy direction
- access path
- tracking plan
- bridge into Prompt Vault and SUITE

Implementation status:

- product key: `selfie_ai_photos_kit`
- public route: `/selfie-to-ai-photos-kit`
- checkout route: `/checkout/selfie-to-ai-photos-kit`
- buyer access route: `/access/selfie-to-ai-photos-kit/[token]`
- access-token resolver: `/api/selfie-to-ai-photos-kit/access-token`
- delivery email: `lib/email/templates/selfie-ai-photos-kit-delivery.ts`
- webhook handler: `lib/payments/handlers/selfie-ai-photos-kit.ts`

Production setup:

- Stripe price confirmed: `price_1ToU3kEVJvME7vkwgeHSeGXc`.
- Vercel Production env confirmed: `STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT`.

Remaining launch steps:

- Claude/Sandra voice QA on public page, checkout copy, access page, and delivery email.
- Merge/deploy.
- Run a live checkout smoke before sending traffic.
