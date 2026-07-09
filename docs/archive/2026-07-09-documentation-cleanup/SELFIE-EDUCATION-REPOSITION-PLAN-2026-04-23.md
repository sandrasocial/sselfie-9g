# SSELFIE Selfie Education Reposition Plan

Created: 2026-04-23
Owner: Codex
Status: Superseded for front-door growth on 2026-05-26

## 2026-05-26 Update — Prompt Vault Pivot

This plan remains useful for the Selfie Guide, Starter Kit, Masterclass, Studio, and buyer-fulfillment infrastructure, but it is no longer the active front-door growth strategy.

Sandra reviewed the live audience data and decided to follow the stronger demand signal: people want AI photoshoot prompts for ChatGPT. The new low-ticket offer is the **AI Photo Prompt Vault** (`/prompt-vault`, `/checkout/prompt-vault`, `/access/prompt-vault/[token]`).

Do not use this document to justify pushing the Starter Kit as the primary upgrade from AI Prompts. Starter Kit can remain as a secondary support product for people who want better source selfies, presets, and editing help. The primary AI prompts upgrade is Prompt Vault.

## Executive Summary

SSELFIE will reposition from an AI-first studio subscription into a professional selfie education product suite led by Sandra's method, proof, and photography. The public funnel will shift to a four-tier ladder where the free Selfie Guide captures demand, the Starter Kit converts cold traffic fast, the Masterclass deepens trust and value, and Studio becomes the advanced AI layer for committed creators. The existing repo already contains the reusable building blocks we need: embedded Stripe checkout, Stripe webhook fulfillment, tokenized Selfie Guide delivery, Resend-based lifecycle email infrastructure, Academy entitlement handling, and Vimeo-ready lesson rendering. The work is therefore a focused repositioning and commerce expansion project, not a platform rewrite.

## Product Suite Definition

| Tier | Product | Price | Type | Role |
| --- | --- | ---: | --- | --- |
| 0 | Free Selfie Guide | Free | Email capture | Front-door lead magnet |
| 1 | Selfie Starter Kit | $37 | One-time | First purchase from cold traffic |
| 2 | Selfie Masterclass | $147 | One-time | Method depth + course offer |
| 3 | Studio | EUR 97/month | Subscription | Advanced AI and planning layer |
| 4 | 1:1 with Sandra | From $2,000 | Inquiry | Premium back-end |

Positioning rules:

- The homepage sells selfie education first, not Maya.
- Sandra is the visual and emotional front door.
- Maya is described as the AI layer inside Studio, not the entry product.
- The free guide remains active as the first opt-in and top-of-funnel hand raise.

## Source References

### Live repo files

- `app/page.tsx`
- `components/sselfie/landing-page-editorial.tsx`
- `components/freebie/selfie-guide-free-landing.tsx`
- `app/checkout/selfie-guide/page.tsx`
- `app/actions/landing-checkout.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/cron/nurture-sequence/route.ts`
- `lib/products.ts`
- `lib/freebie/selfie-guide-access.ts`
- `components/academy/video-player.tsx`
- `components/sselfie/academy-screen.tsx`

### Design system references

- `/Users/MD760HA/selfieschool-build/docs/DESIGN_SYSTEM.md`
- `/Users/MD760HA/selfieschool-build/docs/VOICE_GUIDE.md`
- `/Users/MD760HA/selfieschool-build/components/sections/Hero.tsx`
- `/Users/MD760HA/selfieschool-build/components/sections/Recognition.tsx`
- `/Users/MD760HA/selfieschool-build/components/sections/WhatsInside.tsx`
- `/Users/MD760HA/selfieschool-build/components/sections/Proof.tsx`
- `/Users/MD760HA/selfieschool-build/components/sections/FromSandra.tsx`
- `/Users/MD760HA/selfieschool-build/components/sections/FinalCTA.tsx`

### Voice references

- `docs/_archive/brand/VOICE_BIBLE.md`
- `/Users/MD760HA/selfieschool-build/docs/VOICE_GUIDE.md`

Note: `docs/brand/VOICE_BIBLE.md` does not currently exist in the repo and should be restored or recreated as part of this project.

## Final IA

### Public routes

- `/`
- `/selfie-guide`
- `/starter-kit`
- `/masterclass`
- `/join/studio`
- `/work-with-me`
- `/checkout/starter-kit`
- `/checkout/masterclass`
- `/access/starter-kit/[token]`

### Existing authenticated routes retained

- `/studio`
- `/academy`
- `/strategy/[token]`
- `/selfie-guide/access/[token]`

### Navigation

Unauthenticated nav:

- Starter Kit
- Masterclass
- Studio
- Work With Me
- Primary CTA: `Get the Free Guide`

Authenticated behavior:

- `app/page.tsx` continues redirecting authenticated users to `/studio`
- Public marketing nav is not shown inside the authenticated app shell

## Homepage Spec

### Goal

Turn the homepage from an AI showcase into a Sandra-led selfie education landing page with one clear path to buy and one clear path to opt in.

### Route and file ownership

- Keep auth logic in `app/page.tsx`
- Replace `components/sselfie/landing-page-editorial.tsx` with a new public homepage shell
- Retire the old editorial AI landing after the new page is confirmed in production

### Section order

1. `PublicNav`
2. `PublicHero`
3. `PublicRecognition`
4. `PublicStarterKitInside`
5. `PublicProof`
6. `PublicFromSandra`
7. `PublicProductLadder`
8. `PublicEmailCapture`
9. `PublicFinalCTA`
10. `PublicFooter`

### Homepage copy

#### Hero

Eyebrow:

`SELFIE EDUCATION`

Headline:

`You already know how to take a photo.`
`You just don't know what to do after.`

Body:

`The free guide gets you started.`
`The Starter Kit gives you the presets, the method, and a result you can get today.`

Primary CTA:

`Get the Free Guide`

Secondary CTA:

`See the Starter Kit`

#### Recognition

Eyebrow:

`Sound familiar?`

Headline:

`You take the photo.`
`Then you delete it.`

Body:

`Not because you looked bad.`
`Because the light was off. Or the edit was. Or it stopped feeling like you.`

`That is not a confidence problem.`
`It is a system problem.`

#### Starter Kit section

Headline:

`Three things.`
`That's it.`

Items:

- `16 Lightroom Presets`
- `The Selfie Guide`
- `Your First Selfie Quick-Start`

#### Proof

Eyebrow:

`It works`

Caption:

`Same phone. Same face. Better light. Better edit.`

#### From Sandra

Headline:

`I almost didn't post the one that took off.`

Body:

`I used to spend too long editing one photo.`
`Then delete it anyway.`

`What changed wasn't my face.`
`It was the system behind the photo.`

#### Product ladder

Headline:

`Start with the right thing.`

Cards:

- `Free Guide`
- `Starter Kit`
- `Masterclass`
- `Studio`
- `1:1 with Sandra`

#### Free guide capture

Headline:

`Not ready to buy yet?`
`Start here.`

Body:

`The free Selfie Guide gives you the basics: light, angles, edits, and what to do first.`

CTA:

`Get the Free Guide`

#### Final CTA

Headline:

`Your photos are not the problem.`
`Your system is.`

CTA:

`Get the Starter Kit — $37`

## Product Landing Pages

### `/starter-kit`

Primary job: convert cold traffic.

Sections:

1. Public nav
2. Hero
3. Recognition
4. What is inside
5. Before/after proof
6. FAQ
7. Final CTA

Hero copy:

`Your photos will look like you took them on a good day.`
`Even when it wasn't.`

CTA:

`Get the Starter Kit — $37`

### `/masterclass`

Primary job: sell the full method after Starter Kit interest.

Sections:

1. Public nav
2. Hero
3. Module overview
4. Sandra note
5. Who it is for
6. FAQ
7. Final CTA

Hero copy:

`You've got the presets.`
`Now learn the full method.`

Modules:

- Light
- Pose
- Edit
- Post
- Repeat

CTA:

`Enroll — $147`

### `/join/studio`

Primary job: reframe Studio as the advanced layer.

Hero copy:

`The AI that already knows your brand.`
`And gets smarter every time you use it.`

Body:

`Maya, image generation, Feed Planner, and Academy for creators who already know the look they want.`

CTA:

`Join Studio — €97/mo`

### `/work-with-me`

Primary job: capture high-intent premium inquiries.

Hero copy:

`Two or three people at a time.`
`That's all.`

CTA:

`Send an inquiry`

Form fields:

- Name
- Email
- Instagram handle
- What's not working right now?
- What do you want in the next 6 months?

## Commerce and Delivery Plan

### Stripe products to create

- `Selfie Starter Kit`
  - one-time
  - env var: `STRIPE_PRICE_STARTER_KIT`
- `Selfie Masterclass`
  - one-time
  - env var: `STRIPE_PRICE_MASTERCLASS`

### Existing checkout infrastructure to reuse

- `app/actions/landing-checkout.ts`
- `app/checkout/page.tsx`
- `app/checkout/selfie-guide/page.tsx`
- `app/checkout/membership/page.tsx`

### New routes

- `app/checkout/starter-kit/page.tsx`
- `app/checkout/masterclass/page.tsx`

### Delivery

#### Free guide

Keep existing flow:

- capture via `/api/freebie/subscribe`
- access via `/selfie-guide/access/[token]`

#### Starter Kit

Use tokenized access page:

- `app/access/starter-kit/[token]/page.tsx`

Contents:

- signed preset download links from Vercel Blob
- link into the existing Selfie Guide access flow
- inline quick-start guide

#### Masterclass

Reuse Academy and Vimeo-ready playback:

- entitlement pattern from Academy mini-product purchases
- lesson playback via `components/academy/video-player.tsx`

Recommended implementation:

- unlock Masterclass as an Academy-owned course/product
- use Academy purchase/ownership plumbing for durable access
- optional bridge page for post-purchase onboarding if needed

## Webhook + Lifecycle Changes

### Update product registry

Modify `lib/products.ts` to add:

- `starter_kit`
- `masterclass`

### Update guest checkout action

Modify `app/actions/landing-checkout.ts` to resolve:

- `STRIPE_PRICE_STARTER_KIT`
- `STRIPE_PRICE_MASTERCLASS`

### Update checkout UI copy

Modify `app/checkout/page.tsx` to add product copy for:

- `starter_kit`
- `masterclass`

### Update Stripe webhook

Modify `app/api/webhooks/stripe/route.ts` to support:

- token generation and fulfillment for Starter Kit
- Masterclass purchase entitlement creation
- segment/tag updates
- delivery emails
- nurture sequence enrollment

## Email Sequence Plan

### Keep

- Free Selfie Guide nurture remains live
- Studio welcome remains live

### Change

The current Day 14 Selfie Guide upsell still points to Brand Strategy Pack. Replace that bridge so the ladder becomes:

- Free Guide -> Starter Kit
- Starter Kit -> Masterclass
- Masterclass -> 1:1 or Studio depending the message

### New Starter Kit sequence

- Day 0: delivery
- Day 1: quick win
- Day 3: Sandra story
- Day 5: proof/result
- Day 7: soft Masterclass intro
- Day 10: what is in the Masterclass
- Day 14: direct Masterclass offer

### New Masterclass sequence

- Day 0: delivery
- Day 2: check-in
- Day 5: deepen
- Day 7: soft 1:1 intro
- Day 10: direct inquiry invite

### New template files

- `lib/email/starter-kit-email-sequence.ts`
- `lib/email/masterclass-email-sequence.ts`
- 12 new templates in `lib/email/templates/`

## ManyChat Routing

Phase 1:

- `SELFIE` -> `/selfie-guide`

Phase 2:

- `KIT` -> `/starter-kit`
- `MASTERCLASS` -> `/masterclass`

Phase 3:

- `STUDIO` -> `/join/studio`
- `WORK` -> `/work-with-me`

## Design System Adoption

Add public stone tokens to `app/globals.css`:

- `--stone-50`
- `--stone-100`
- `--stone-200`
- `--stone-400`
- `--stone-800`
- `--stone-950`

Rules:

- Public marketing pages use stone palette
- Authenticated Studio keeps dark system
- No GSAP intro, Lenis, WebGL grain, or AI-first visual language on public pages
- No raw hex values inside new public sections
- Sandra photography only

## File Plan

### Create

- `docs/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`
- `app/starter-kit/page.tsx`
- `app/masterclass/page.tsx`
- `app/join/studio/page.tsx`
- `app/work-with-me/page.tsx`
- `app/checkout/starter-kit/page.tsx`
- `app/checkout/masterclass/page.tsx`
- `app/access/starter-kit/[token]/page.tsx`
- `app/api/inquiry/submit/route.ts`
- `components/sselfie/landing-page-education.tsx`
- `components/sselfie/public-nav.tsx`
- `components/sselfie/public-hero.tsx`
- `components/sselfie/public-recognition.tsx`
- `components/sselfie/public-starter-kit-inside.tsx`
- `components/sselfie/public-proof.tsx`
- `components/sselfie/public-from-sandra.tsx`
- `components/sselfie/public-product-ladder.tsx`
- `components/sselfie/public-email-capture.tsx`
- `components/sselfie/public-final-cta.tsx`
- `components/sselfie/public-footer.tsx`
- `components/sselfie/starter-kit-landing.tsx`
- `components/sselfie/masterclass-landing.tsx`
- `components/sselfie/studio-landing.tsx`
- `components/sselfie/work-with-me-landing.tsx`
- `lib/email/starter-kit-email-sequence.ts`
- `lib/email/masterclass-email-sequence.ts`
- new Starter Kit and Masterclass email templates

### Modify

- `app/page.tsx`
- `app/globals.css`
- `lib/products.ts`
- `app/actions/landing-checkout.ts`
- `app/checkout/page.tsx`
- `app/api/webhooks/stripe/route.ts`
- `app/api/cron/nurture-sequence/route.ts`
- `lib/email/selfie-guide-email-sequence.ts`
- `lib/email/templates/selfie-guide-day14-maya-bridge.ts`
- `CLAUDE.md`
- `docs/CODEX_CONTEXT.md`

### Retire after launch verification

- `components/sselfie/landing-page-editorial.tsx`

## Implementation Phases

### Phase 1

Design system + homepage + free guide positioning + Starter Kit purchase path

### Phase 2

Masterclass purchase path + Academy entitlement and delivery

### Phase 3

Studio reposition page + 1:1 inquiry page + lifecycle cleanup

### Phase 4

Documentation update, link audit, asset audit, and retire AI-first public landing

## Documentation Requirements

Update at the end of implementation:

- `CLAUDE.md`
- `docs/CODEX_CONTEXT.md`
- any new product or ops notes related to pricing, URLs, ManyChat routing, and fulfillment

## Open Inputs Still Needed From Sandra

- Final hero image selection
- Starter Kit preset files for Blob delivery
- Masterclass video IDs
- Masterclass workbook files
- 1:1 inquiry destination email and response expectation if different from `hello@sselfie.ai`
