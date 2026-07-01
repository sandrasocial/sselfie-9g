# Selfie To AI Photos Kit — Claude Copy QA Handoff

Date: 2026-07-01
Branch: `codex/selfie-ai-kit-visibility-sprint`
Implementation commit: `c7f15efb`

## Status

The dedicated Selfie To AI Photos Kit path is built and wired.

Production env is configured:

- Stripe product: `prod_Uo6GAQ9o9wEWeN`
- Stripe price: `price_1ToU3kEVJvME7vkwgeHSeGXc`
- Vercel Production env: `STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT`

This is ready for Claude/Sandra copy QA before merge/deploy.

## What Claude Should Review

Review outward-facing copy only. The product structure, product key, Stripe price, analytics events, webhook fulfillment, and Starter Kit separation should stay unchanged unless Sandra explicitly asks for a rebuild.

Surfaces:

- Public page: `/selfie-to-ai-photos-kit`
- Checkout entry page: `/checkout/selfie-to-ai-photos-kit`
- Embedded checkout copy: `app/checkout/page.tsx`
- Success page copy: `components/checkout/success-content.tsx`
- Buyer access page: `/access/selfie-to-ai-photos-kit/[token]`
- Delivery email: `lib/email/templates/selfie-ai-photos-kit-delivery.ts`

## Locked Product Separation

Do not merge this with the old Starter Kit.

- `starter_kit`, `/starter-kit`, `/checkout/starter-kit`, `/access/starter-kit/[token]`, and `KIT` remain the iPhone Selfie Starter Kit path.
- `selfie_ai_photos_kit`, `/selfie-to-ai-photos-kit`, `/checkout/selfie-to-ai-photos-kit`, and `/access/selfie-to-ai-photos-kit/[token]` are the AI-photo path.
- `KIT` traffic stays on the iPhone/selfie product.
- `PROMPT` and AI-photo traffic can bridge into the AI Photos Kit.

## Copy Goal

Make the offer feel like Sandra is saying:

> Start with one clear selfie. Use it to create AI photos that still look like you.

The buyer should instantly understand:

- this is a small first step
- it helps her choose/upload a better source selfie
- it gives her starter prompts and fix prompts
- the output is a simple 3-image AI photo path
- it is not trying to make her look fake

## Voice Guardrails

Use the current source of truth:

`docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`

Keep:

- simple
- warm
- direct
- human
- everyday words
- short paragraphs
- AI as the tool
- the woman as the point
- recognizable, still-you language

Avoid:

- generic AI-tool copy
- corporate personal-brand language
- "perfect"
- "flawless"
- "nobody will know"
- "fake photoshoot"
- luxury fantasy as the whole promise
- making Prompt Vault feel obsolete
- making SUITE feel like clutter

## Technical Boundaries

Do not change:

- `selfie_ai_photos_kit`
- `STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT`
- `price_1ToU3kEVJvME7vkwgeHSeGXc`
- product routing
- webhook/payment logic
- token fulfillment logic
- analytics event names
- access recovery behavior
- existing Starter Kit routes or keyword assumptions

## Verification Already Run

- `pnpm exec tsc --noEmit --pretty false`
- `node scripts/verify-repo-invariants.mjs`
- targeted ESLint on the new AI Kit implementation files
- `pnpm build`

## Remaining Before Traffic

- Claude/Sandra copy QA.
- Merge/deploy to production.
- Run a live checkout smoke.
- Confirm delivery email/access token after the live smoke.
