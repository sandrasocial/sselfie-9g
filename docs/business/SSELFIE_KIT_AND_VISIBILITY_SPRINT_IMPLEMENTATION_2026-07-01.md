# SSELFIE Kit + Visibility Sprint Implementation

Date: 2026-07-01
Branch: `codex/selfie-ai-kit-visibility-sprint`

## Summary

This pass created the first implementation layer for the new revenue path:

- Cold attention -> Selfie To AI Photos Kit
- Warm trust -> Visibility To Paid Sprint
- Paid activation -> SUITE

The work reuses existing, safer infrastructure instead of creating new payment products:

- Selfie To AI Photos Kit uses the existing `starter_kit` product, checkout, token access, and email sequence.
- Visibility To Paid Sprint uses the existing Work With Me page and inquiry form.

Claude can now review the outward-facing voice and tighten the copy without needing structural changes first.

## What Changed

### Selfie To AI Photos Kit

- Added `/selfie-to-ai-photos-kit` as a clean public route.
- Reframed the existing Starter Kit around:
  - one clear source selfie
  - AI photo starter prompts
  - still-you fix prompts
  - a 3-image starter shoot path
  - presets, captions, and a 7-day content starter
- Kept `/starter-kit` live as an existing route.
- Kept the existing `/checkout/starter-kit` checkout route and `starter_kit` product id.
- Updated Starter Kit checkout, success, access, and lifecycle email copy to match the new Kit positioning.
- Removed the visible Selfie to Brand Shoot credit bridge from Starter Kit access and replaced it with:
  - Prompt Vault as the next prompt library step
  - SUITE as the monthly creation system step

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

The Kit still uses the existing `starter_kit` infrastructure and price.

Visibility To Paid still uses the existing inquiry flow and does not create an automatic checkout/payment step.

## Verification

Passed:

- `node scripts/verify-repo-invariants.mjs`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint app/checkout/starter-kit/page.tsx lib/content-engine/brief-generator.ts components/admin/content-brief-client.tsx app/admin/content-brief/page.tsx --max-warnings=0`
- `pnpm build`

Build completed successfully and includes:

- `/selfie-to-ai-photos-kit`
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

- Final voice pass on the new Kit page copy.
- Final voice pass on the Visibility To Paid page and application copy.
- Final decision on whether `/starter-kit` remains visible as an alias or eventually redirects to `/selfie-to-ai-photos-kit`.
- Final decision on whether the old email template filenames containing `masterclass` should be renamed in a separate compatibility-safe cleanup.

