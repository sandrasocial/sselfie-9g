# SSELFIE Kit + Visibility Sprint Implementation

Date: 2026-07-01
Branch: `codex/selfie-ai-kit-visibility-sprint`

## Summary

This pass created the first implementation layer for the new revenue path:

- Cold attention -> Selfie To AI Photos Kit
- Warm trust -> Visibility To Paid Sprint
- Paid activation -> SUITE

Correction added after Sandra review:

- The existing `starter_kit` product must remain the iPhone Selfie Starter Kit.
- Selfie To AI Photos Kit is a separate Prompt/AI funnel product and must not use `/checkout/starter-kit`.
- Visibility To Paid Sprint uses the existing Work With Me page and inquiry form.

Claude can now review the outward-facing voice and tighten the copy without needing structural changes first.

## What Changed

### Selfie To AI Photos Kit

- Added `/selfie-to-ai-photos-kit` as a safe placeholder route.
- The route redirects into `/ai-prompts` with Prompt funnel attribution until a dedicated AI Photos Kit product/checkout path is approved.
- The existing Starter Kit is not the AI Photos Kit.
- `/starter-kit`, `/checkout/starter-kit`, `/access/starter-kit/[token]`, and `starter_kit` remain the iPhone Selfie Starter Kit path.

### Selfie Starter Kit

- Preserved the existing iPhone selfie product role:
  - better phone selfies
  - presets
  - source photo guidance
  - posing
  - captions
  - 7-day content starter
- `KIT` traffic should continue to point here, not to AI Photos Kit.

### Visibility To Paid Sprint

- Added `/visibility-to-paid` as a clean public route.
- Reframed `/work-with-me` into a private Visibility To Paid Sprint page.
- Updated the Work With Me application form language around:
  - what feels unclear online
  - what the buyer wants people to understand, trust, or buy from her
  - what skill, service, offer, story, or idea she already has
  - whether she is open to a private EUR 2,000 sprint if it is the right fit
- Updated inquiry confirmation/admin email copy to match the Sprint.
- Preserved the existing inquiry storage and scoring logic.

### Admin Weekly Brief

- Preserved Claude's funnel-stage work:
  - cold
  - warm
  - activation
- Kept the admin brief split into three tracks:
  - cold attention gets the Kit
  - warm trust gets Visibility To Paid
  - paid activation gets SUITE
- Added the clean handoff paths into Carousel Kit and Story Sequences.
- Tightened the TypeScript typing in the Anthropic brief generator.

## Files Changed

- `app/selfie-to-ai-photos-kit/page.tsx`
- `app/visibility-to-paid/page.tsx`
- `app/starter-kit/page.tsx`
- `app/work-with-me/page.tsx`
- `app/checkout/starter-kit/page.tsx`
- `app/access/starter-kit/[token]/page.tsx`
- `app/api/inquiry/submit/route.ts`
- `app/admin/content-brief/page.tsx`
- `components/sselfie/public-marketing.tsx`
- `components/checkout/success-content.tsx`
- `components/admin/content-brief-client.tsx`
- `lib/products.ts`
- `lib/content-engine/brief-generator.ts`
- `lib/email/templates/starter-kit-day0-delivery.ts`
- `lib/email/templates/starter-kit-day1-quick-win.ts`
- `lib/email/templates/starter-kit-day3-story.ts`
- `lib/email/templates/starter-kit-day5-proof.ts`
- `lib/email/templates/starter-kit-day7-soft-masterclass.ts`
- `lib/email/templates/starter-kit-day10-masterclass-breakdown.ts`
- `lib/email/templates/starter-kit-day14-masterclass-offer.ts`

## Payment, Access, And Product Logic

No new Stripe product was created.

No Stripe product id was changed.

No entitlement logic was changed.

No checkout fulfillment logic was changed.

The existing Selfie Starter Kit still uses the existing `starter_kit` infrastructure and price.

Selfie To AI Photos Kit does not have a live checkout yet.

Visibility To Paid still uses the existing inquiry flow and does not create an automatic checkout/payment step.

## Verification

Passed:

- `node scripts/verify-repo-invariants.mjs`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint app/checkout/starter-kit/page.tsx lib/content-engine/brief-generator.ts components/admin/content-brief-client.tsx app/admin/content-brief/page.tsx --max-warnings=0`
- `pnpm build`

Build completed successfully and includes:

- `/selfie-to-ai-photos-kit` redirects to `/ai-prompts` for now
- `/visibility-to-paid`
- `/starter-kit`
- `/work-with-me`
- `/checkout/starter-kit`
- `/access/starter-kit/[token]`

## Known Warnings

The production build still prints existing project warnings:

- stale `baseline-browser-mapping` package data
- deprecated Next.js `middleware` convention warning
- edge runtime static generation warning

A wider lint pass on all touched public/email files still surfaces existing style warnings, mostly:

- hardcoded color values in older public/email UI
- existing `console` calls in checkout success UI
- existing image/component warnings in the large public marketing component

Those were not expanded in this pass because the priority was revenue-path structure without broad refactors.

## Needs Claude / Sandra Review

- Dedicated Selfie To AI Photos Kit product decision:
  - product key
  - price
  - checkout path
  - access/delivery path
- Final voice pass on the Selfie Starter Kit page copy.
- Final voice pass on the Visibility To Paid page and application copy.
- Do not redirect `/starter-kit` to `/selfie-to-ai-photos-kit`.
- Final decision on whether the old email template filenames containing `masterclass` should be renamed in a separate compatibility-safe cleanup.
