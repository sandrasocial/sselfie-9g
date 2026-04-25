# SSELFIE 2026 Offer Map

Last updated: 2026-04-25

This map assigns every major offer a job in the new funnel before any cleanup happens.

Status definitions:

- **Primary:** actively supports the new funnel and can be marketed.
- **Support:** useful inside the ecosystem, but should not be the main public CTA.
- **Archive Candidate:** keep for now, but hide from active campaigns until reviewed with revenue/usage data.

## Primary Offers

| Offer | Current Price | Role | Key Routes / Files | E2E Notes |
| --- | ---: | --- | --- | --- |
| Selfie Guide | $17 / free entry variant | Trust builder and first visible win | `app/selfie-guide/page.tsx`, `app/checkout/selfie-guide/page.tsx`, `app/selfie-guide/access/[token]/page.tsx`, `content-templates/selfie-guide-content-v3.md` | Must consistently promise one postable photo and a confidence-building first action. |
| Starter Kit | $37 | First paid implementation kit | `app/starter-kit/page.tsx`, `app/checkout/starter-kit/page.tsx`, `app/academy/access/starter-kit/page.tsx`, `app/access/starter-kit/[token]/page.tsx` | Should include Selfie Guide, presets/resources, and a 7-day content starter. |
| Brand Strategy Pack | $19 | Personalized clarity layer | `app/brand-strategy/page.tsx`, `app/checkout/brand-strategy-pack/page.tsx`, `app/brand-strategy/setup/[token]/page.tsx`, `app/strategy/[token]/page.tsx` | Strongest personalized deliverable; should be bundled into Masterclass and visible as Studio value. |
| Studio / Maya | $97/mo or annual | Core recurring implementation product | `app/checkout/membership/page.tsx`, `app/studio/page.tsx`, `app/maya/page.tsx`, `components/sselfie/maya-chat-screen.tsx` | Main destination for weekly photos, captions, planning, and implementation. |

## Support Offers

| Offer | Current Price | Role | Key Routes / Files | E2E Notes |
| --- | ---: | --- | --- | --- |
| Masterclass | $147 | Structured education layer | `app/masterclass/page.tsx`, `app/checkout/masterclass/page.tsx`, `lib/academy-entitlements.ts` | Should not carry income promise until a new income module exists. Add Brand Strategy Pack access by default. |
| Blueprint / Paid Blueprint | $47 | 30-day implementation workflow | `app/blueprint/page.tsx`, `app/checkout/blueprint/page.tsx`, `app/feed-planner/page.tsx`, `lib/feed-planner/access-control.ts` | Better as implementation after a clear offer/message, or as a lighter Starter Kit component. |
| Selfie Guide + Brand Strategy Bundle | $27 | Bundle / test SKU | `lib/products.ts`, `lib/academy-entitlements.ts`, `app/checkout/page.tsx` | Existing alias grants guide + strategy; should be reviewed against the new Starter Kit bundle direction. |
| Credit Packs | $9.99 / $45 / $85 | Usage expansion | `lib/products.ts`, `app/checkout/credits/page.tsx` | Support Studio/Maya usage, not a public funnel entry. |
| Starter Photoshoot / One-Time Session | $49 | Low-risk creation offer | `app/checkout/one-time/page.tsx`, `lib/products.ts` | Keep as support if it helps users get a first result. Avoid competing with Starter Kit. |

## Archive Candidates For Review

These should not be deleted yet. First check traffic, backlinks, email links, and redirects.

| Surface | Reason | Review Action |
| --- | --- | --- |
| Legacy freebie strategy routes | Old flow overlaps Brand Strategy Pack | Confirm redirects, email links, and any ManyChat paths before hiding/removing. |
| Legacy freebie selfie guide routes | Overlaps current `/selfie-guide` and token access | Confirm no active links before archive. |
| Brand Engine public/high-touch routes | Old offer language can confuse the new ladder | Redirect to Brand Strategy, Studio, or Private Offer if unused. |
| Prompt guide pages | May be useful, but not a primary funnel path | Keep only if they support Studio/Maya education. |
| Duplicate checkout/upgrade variants | Increases checkout complexity | Consolidate after smoke tests verify active routes. |
| Disabled or unreachable feed-generation routes | High maintenance risk | Inventory before deletion; keep only what Feed Planner actually uses. |

## Bundle Architecture

### Selfie Guide Plus

Purpose: help her create one photo she feels willing to post.

Included:

- Selfie Guide access
- first-photo checklist
- 7-day postable selfie challenge
- one caption/post prompt
- CTA to Starter Kit or Studio

### Starter Kit

Purpose: create the first baseline brand look and short content rhythm.

Included:

- Selfie Guide access
- presets/resources
- 7-day content starter or Blueprint-lite workflow
- simple “what to post this week” checklist
- CTA to Studio

### Masterclass

Purpose: teach income-ready visibility once the buyer has positioning.

Included:

- Brand Strategy Pack access
- existing masterclass courses
- new income/content-to-cash module
- implementation workbook
- CTA to Studio for ongoing execution

### Studio

Purpose: recurring implementation home.

Included:

- Maya generation workflow
- Studio dashboard / weekly next step
- access to key resources as member value
- selected Blueprint/Masterclass education
- upsell path to Private Offer only when relevant

## Product Source Of Truth

When implementation begins, keep these files aligned:

- `lib/products.ts`
- `lib/academy-entitlements.ts`
- `app/actions/landing-checkout.ts`
- `app/actions/stripe.ts`
- `app/api/webhooks/stripe/route.ts`
- `components/checkout/success-content.tsx`
- `lib/email/selfie-guide-email-sequence.ts`
- `lib/email/templates/*`

No product status should be changed in copy unless checkout, entitlement, fulfillment, email, and buyer access are updated in the same implementation pass.
