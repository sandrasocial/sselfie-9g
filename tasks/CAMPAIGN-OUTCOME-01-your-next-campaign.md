# CAMPAIGN-OUTCOME-01 — "Your Next Campaign" pay-per-outcome product

Status: READY for Codex 2026-07-14 evening. Build on a `codex/` branch NOW; **do not merge or
deploy anything before 2026-07-15 18:05 CEST** (One Selfie event close). Target: smoke-testable
Thursday 2026-07-16, launch after Sandra approves copy.

Contract (binding, read first): `docs/business/ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md` (v2).
Evidence base: `docs/audits/SSELFIE_TRUTH_INVESTIGATION_2026-07-14.md`. Brand law:
`docs/brand/SSELFIE_BRAND_CONSTITUTION.md` (Sandra Test + Creative Bar on all copy; copy ships as
DRAFT for Sandra).

## The product

**$97 once.** "Give Maya one selfie and what you're promoting. Leave with a campaign ready to
post — without learning AI or looking fake."

Buyer provides: one selfie · what she sells · what she's promoting right now (· optionally where
she plans to post). Delivery within **48 hours**: THREE coordinated posts (attention / trust /
offer), each with its finished visual (still-you), its words in her voice, its CTA, and the
publishing order. Plus the still-you guarantee: it looks like her or we redo it.

## Build scope (reuse, don't invent)

1. **Landing page** `/campaign` — pattern: `components/one-selfie/one-selfie-landing.tsx` (light
   editorial, design system tokens). Callout: "for women who already sell something and need to
   promote it." No countdown (evergreen test offer, capped founding batch messaging TBD by Sandra).
2. **Checkout** `/checkout/campaign` — reuse the one-selfie/starter-kit checkout pattern + webhook
   handler in `lib/payments/handlers/` (new module, never inline in the route). `stripe_payments.
   product_type='campaign_outcome'`. Attribution: `checkout_attribution` with
   `cta_keyword='CAMPAIGN'` support.
3. **Intake** — post-purchase page + delivery email ask: selfie upload (reuse the bundle/kit
   account-setup upload path) + two text fields (what she sells / what she's promoting). Persist
   per order. Guest-safe (claim-token pattern like other products).
4. **Fulfillment pipeline** — a `campaign_orders` flow that drives the EXISTING Maya/Shoot Studio
   generation machinery: pick visual direction from her selfie, generate the three visuals,
   compose the three captions+CTAs from her two answers. Output lands in an **admin QA queue**
   (pattern: `/admin/work-with-me` pipeline UI) where Sandra approves/regenerates per order
   (founding batch is human-QA'd; design so QA can later be sampled, not mandatory).
5. **Delivery** — buyer page (access-token pattern like `/access/starter-kit/[token]`) + delivery
   email via `lib/email/templates/stone-email.ts` renderPersonalNote. Downloadables + copy-ready
   captions + "publish in this order". Record delivery + download events in `analytics_events`.
6. **Repeat + measurement hooks** — on the buyer page and in a Day-7 email: ONE next action:
   "Create my next campaign · $97" (same checkout, `utm_content=repeat`). Day-7 email also asks
   "did you post it?" (one-click yes/no → analytics_events). NO subscription offer anywhere (v2
   contract: pull before push). Instrument every gate: landing view, checkout start, purchase,
   inputs completed, generated, delivered, downloaded, published-confirm, repeat purchase — named
   `campaign_*` events so the gates in the contract are queryable verbatim.
7. **Kill switch** env `CAMPAIGN_OUTCOME_DISABLED` honored by page + checkout.

## Explicitly OUT of scope (do not build)

Credits pack, SUITE repositioning, Monthly Drop, pricing-page changes, community, ads tooling,
any change to the live one-selfie event surfaces, any autonomous sending. ManyChat CAMPAIGN
keyword is Sandra-attended setup (document the target URL for her:
`/campaign?source=instagram&utm_source=instagram&utm_medium=manychat&utm_campaign=campaign_outcome_test&cta_keyword=CAMPAIGN`).

## Acceptance

- Full test suite green (repo rule: full-suite verify before merge).
- `pnpm check:voice` green on all new copy; no em-dashes; no face-comparison phrasing (likeness
  locks use "exact facial features from the reference").
- Money paths reviewed against Stripe truth (use the stripe-credit-reviewer agent).
- Dry-run proof in PR: a test-mode order flowing intake → generation → QA queue → delivery page.
- All copy marked DRAFT pending Sandra approval; nothing customer-facing goes live until she says.
