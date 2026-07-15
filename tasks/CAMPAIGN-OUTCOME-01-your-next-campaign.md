# CAMPAIGN-OUTCOME-01 — "Your Next Campaign" pay-per-outcome product

Status: REVISION REQUIRED 2026-07-14. The held commit
`3566f9026994b55484c7163598e3292f35d67993` proves the payment, intake, QA, delivery, and repeat
infrastructure, but its three-post deliverable is superseded by this v3 spec. Do not ship that
commit unchanged. Build the revision on the held `codex/campaign-outcome-held` branch. **Do not
merge or deploy anything before 2026-07-15 18:05 CEST** (One Selfie event close). Launch only after
Sandra approves the complete product and all outward-facing copy.

Contract (binding, read first): `docs/business/ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md` (v3).
Evidence base: `docs/audits/SSELFIE_TRUTH_INVESTIGATION_2026-07-14.md`. Brand law:
`docs/brand/SSELFIE_BRAND_CONSTITUTION.md` (Sandra Test + Creative Bar on all copy; copy ships as
DRAFT for Sandra).

## The product

**$97 once. DRAFT promise:** "Give Maya one selfie and what you're promoting. Get a complete
campaign ready to post within 48 hours."

Buyer provides: one selfie · what she sells · what she is promoting · who it is for · optional
website/Instagram/sample caption. Delivery within **48 hours**:

- 6 identity-safe brand photos: 3 primary campaign images + 3 alternates.
- 3 feed posts: attention / trust / offer, each with image, hook, caption, and CTA.
- 1 finished 7-slide 4:5 carousel.
- 2 finished 5-frame 9:16 Story sequences: warm-up/trust + direct offer.
- 1 one-page 5-day publishing plan.

Every asset serves ONE promotion. Still-you guarantee: it looks like her or the affected visual is
redone once. No unlimited revisions.

## Build scope (reuse, don't invent)

1. **Landing page** `/campaign` — pattern: `components/one-selfie/one-selfie-landing.tsx` (light
   editorial, design system tokens). Callout: "for women who already sell something and need to
   promote it." No countdown (evergreen test offer, capped founding batch messaging TBD by Sandra).
2. **Checkout** `/checkout/campaign` — reuse the one-selfie/starter-kit checkout pattern + webhook
   handler in `lib/payments/handlers/` (new module, never inline in the route). `stripe_payments.
   product_type='campaign_outcome'`. Attribution: `checkout_attribution` with
   `cta_keyword='CAMPAIGN'` support.
3. **Intake** — post-purchase page + delivery email ask: selfie upload (reuse the bundle/kit
   account-setup upload path) + what she sells + what she is promoting + who it is for + one
   optional URL or sample-caption field. Persist per order. Guest-safe (claim-token pattern like
   other products). The complete intake must take under five minutes.
4. **Fulfillment pipeline** — a `campaign_orders` flow that drives the EXISTING Maya/Shoot Studio
   generation machinery: choose one campaign world, generate the six-photo mini shoot, compose the
   attention/trust/offer captions, generate one seven-slide carousel through the existing carousel
   plan/render path, generate two five-frame Story sequences through the existing story-sequence
   path, and assemble the five-day plan. Output lands in an **admin QA queue** where Sandra can
   approve or regenerate the affected asset. The founding batch is human-QA'd; the design must let
   QA become sampled later rather than a permanent fulfillment job.
5. **Delivery** — buyer page (access-token pattern like `/access/starter-kit/[token]`) + delivery
   email via `lib/email/templates/stone-email.ts` renderPersonalNote. Downloadables + copy-ready
   captions + ordered Story/carousel files + "publish in this order". Support single-asset and
   download-all actions. Record delivery + asset download events in `analytics_events`.
6. **Repeat + measurement hooks** — on the buyer page and in a Day-7 email: ONE next action:
   "Create my next campaign · $97" (same checkout, `utm_content=repeat`). Day-7 email also asks
   "did you post it?" (one-click yes/no → analytics_events). NO subscription offer anywhere (v2
   contract: pull before push). Instrument every gate: landing view, checkout start, purchase,
   inputs completed, generated, delivered, downloaded, published-confirm, repeat purchase — named
   `campaign_*` events so the gates in the contract are queryable verbatim.
7. **Checkout recovery** — implement the product-specific three-touch cadence in
   `tasks/RECOVERY-CADENCE-01-three-touch.md`. It may reuse the proven Prompt Vault recovery
   architecture. No recovery email sends before Sandra approves its exact copy.
8. **Kill switch** env `CAMPAIGN_OUTCOME_DISABLED` honored by page + checkout.

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
- Dry-run proof in PR: a test-mode order flowing intake → 6 photos + 3 posts + carousel + 2 Story
  sequences + plan → QA queue → delivery page.
- Every deliverable is visibly tied to the same promotion; no generic filler or second topic.
- The test records asset-level download events and one campaign-level publish confirmation.
- All copy marked DRAFT pending Sandra approval; nothing customer-facing goes live until she says.
