# SUITE Revenue Foundation

Status: APPROVED FOR LOCAL IMPLEMENTATION by Sandra on 2026-07-17. Customer-facing copy remains
draft-only until Sandra approves the exact built pages. No deploy, send, price change, or customer
contact is authorized by this spec.

## Objective

Repair the measurable public path into the active EUR 97/month SSELFIE SUITE without creating a new
offer, tier, discount, product, funnel, or admin surface.

The build must let Sandra answer, with first-party evidence:

1. How many SUITE page visits happened?
2. How many visitors clicked a SUITE checkout CTA?
3. How many reached a checkout session and payment form?
4. How many became active paid members?

It must also make the homepage, SUITE page, and payment moment explain one simple recurring job:

> Start with one selfie. Create photos, know what to say, and plan what goes out next with Maya.

This is a working offer contract, not permission to promise income or guaranteed results.

## Revenue and customer contract

- Engine: SSELFIE SUITE, the active recurring software product.
- Best-supported buyer: a woman building a personal brand or small business who needs to keep
  creating and showing up online.
- Excluded buyer: someone who only wants one headshot, a done-for-you social media manager, or an
  income guarantee.
- Price: EUR 97/month for new standard-price customers.
- Existing customer prices, discounts, access, credits, billing, and entitlements stay unchanged.
- Included monthly generation: 200 credits. A standard image uses one credit; some higher-cost
  formats use more. Do not call every credit one photo in public pricing copy.
- Cancellation: from the member account, cancel anytime.
- Fulfillment: access immediately after successful payment through the existing Stripe lifecycle.
- No trial redesign, annual-plan promotion, email sequence, ManyChat change, pricing test, or app
  creative-behavior change is included.

## Evidence behind this build

Verified aggregate snapshot from 2026-07-17:

- 59 membership checkout sessions in the previous 30 days.
- 3 new Stripe-verified paid members in the previous 30 days; all 3 remained active at the snapshot.
- The mapped active-member cohort showed real recent generation and download behavior.
- The current SUITE landing page does not emit a dedicated page-view or landing CTA event.
- The current page expands into a five-card product bundle before returning to the recurring job.
- Existing quotes support realistic likeness and adjustment quality, but not income or business
  results.

These facts support repairing offer communication and measurement. They do not prove a guaranteed
conversion lift.

## Design brief

### 1. Feature summary

This is the public path for a warm woman who has seen Sandra's selfie or AI-photo teaching and is
considering ongoing help. She may be interested but unsure whether SUITE is another generator,
another course library, or more work. The page must let her understand the weekly job quickly and
see how Maya, Create, Calendar, and the learning library belong together.

### 2. Primary user action

Understand the real workflow, decide whether it fits, then choose the EUR 97/month checkout.

### 3. Design direction

- Calm, editorial, visual-first, phone-first.
- Light luxury without precious or corporate language.
- Images and a truthful product walkthrough carry proof.
- Cool monochrome SSELFIE palette and existing approved typography only.
- The memorable idea is one continuous line: one selfie -> Maya's direction -> usable content ->
  next post planned.

### 4. Layout strategy

- Homepage: one clear cold first step and one clear warm SUITE path. Secondary products become quiet
  links rather than four equal decisions.
- SUITE hero: immediate finished job, monthly price, one primary CTA, one jump to the walkthrough.
- Early page: show the real workflow before the feature inventory.
- Middle page: three outcome-led chapters—create, say, plan—rather than a large app-feature grid.
- Qualification: name who SUITE is and is not for before price.
- Price: exact monthly terms, 200 credits, access, cancellation, and what remains hers.
- FAQ: answer first-use, likeness, prompts, credits, cancellation, and ownership plainly.

### 5. Key states

- Default desktop and mobile page.
- Reduced-motion visitor: no blocking intro or required animation.
- CTA navigation with source and placement preserved.
- Analytics failure: navigation still works.
- Checkout loading, missing-session error, email capture, and embedded Stripe form.
- Admin scorecard with zero observations as a valid state.

### 6. Interaction model

- Page view records once on mount.
- Primary checkout links record placement without delaying navigation.
- Walkthrough is readable without interaction; anchor navigation jumps to it.
- FAQ buttons expose semantic expanded state and keyboard focus.
- Mobile CTAs meet the 44px touch-target minimum.

### 7. Content requirements

- Short paragraphs and everyday words.
- One human outcome per section.
- AI supports the woman; it is never the hero.
- Use only traceable customer quotes already present in the current page.
- Do not claim results, time savings, income, or identity fidelity as guaranteed.
- Do not say the product contains a trained model; the live app uses reference-selfie generation.

### 8. Implementation references

- `docs/SSELFIE_DESIGN_SYSTEM.md`
- `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`
- `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`
- `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`
- `.impeccable.md`

### 9. Open questions held outside this build

- A recorded screen-and-voice video needs Sandra's final recording and approval. This build may
  create a truthful in-page visual walkthrough and a recording script, but must not invent a video.
- Annual membership needs a separate customer-protection audit of credit refill timing before it is
  promoted as a monthly-credit plan.
- Learn personalization is a separate product build. This page may describe the current library,
  not future personalized behavior.

Sandra approved end-to-end local implementation after the design direction and commercial plan were
presented in the current conversation.

## Implementation scope

### A. Measurement

- Add `studio_membership_page_view`.
- Add `studio_membership_page_cta_click` with `placement`, `source`, and destination properties.
- Record one page view when `/join/studio` mounts.
- Track hero, pricing, and closing checkout CTAs.
- Preserve every existing checkout attribution source.
- Analytics remains best-effort and never blocks checkout navigation.

### B. Homepage

- Clarify the hero in one immediate sentence.
- Keep Free AI Prompts as the cold primary route.
- Keep SUITE as the warm secondary route.
- Replace the four equal offer cards with one cold first-step feature, one warm ongoing-system
  feature, and quiet text links to the Starter Kit and Masterclass.
- Do not route public traffic to private, dormant, closed, or legacy offers.

### C. SUITE page

- Rewrite the hero around the recurring finished job.
- Add a truthful visual walkthrough of the current Maya-first flow.
- Replace broad feature grids with create / say / plan outcomes.
- Keep the current verified likeness quotes.
- Add fit and non-fit language.
- State price, credits, cancellation, and access plainly.
- Rewrite the FAQ without unsupported comparison or guarantee language.
- Preserve the current public navigation and footer.

### D. Checkout trust

- Keep direct Stripe checkout and the email-capture safety path unchanged.
- Improve membership-specific embedded checkout copy and confidence points.
- Keep EUR currency truth.
- Do not show annual savings or promote annual billing in this build.

### E. SEO

- Add a page-specific canonical for `/join/studio`.
- Add page-specific Open Graph and Twitter metadata.
- Add accurate, no-rating, no-guarantee SoftwareApplication structured data on the SUITE page.
- Keep checkout routes excluded from crawling.
- Do not create speculative keyword pages.

### F. Existing admin home

- Add a `membershipFunnel30d` block to the existing revenue truth scorecard.
- Source page and CTA events from `analytics_events`.
- Source checkout starts from `checkout_attribution`.
- Source paid members from the live Stripe subscription single source.
- Replace the closed One Selfie event card block on `/admin` with the current SUITE journey. Do not
  add a new admin page or navigation item.

## Acceptance tests

1. Both new event names are allowed by the analytics contract.
2. `/join/studio` records a page view and tracks all three checkout CTA placements.
3. CTA tracking cannot block navigation.
4. Source attribution survives `/join/studio` -> `/checkout/membership`.
5. The homepage contains one dominant free path and one warm SUITE path, not four equal offer cards.
6. SUITE copy includes Maya, photos, words/captions, planning, EUR 97/month, 200 credits, and
   cancel-anytime truth.
7. SUITE copy does not include income promises, fake urgency, three tiers, or feature splitting.
8. Membership checkout shows membership-specific confidence points and EUR terms.
9. `/join/studio` has its own canonical, social metadata, and accurate structured data.
10. Admin SUITE journey renders page views, CTA clicks, checkout starts, payment forms, and new paid
    members from correctly labelled sources.
11. Existing checkout, payment, entitlement, trial, and member tests stay green.
12. Mobile and desktop visual QA passes with 44px controls, visible focus, no horizontal overflow,
    and reduced-motion support.

## Voice release gate for the implementation draft

Channel: public customer page and product/checkout UX.

- Sandra recognition: target 2/2 — plain, direct, woman-to-woman.
- Reader specificity: target 2/2 — woman building and posting around a real business.
- Human rhythm: target 2/2 — mixed short and longer lines, no tidy sales-template cadence.
- Commercial clarity: target 2/2 — EUR 97/month, credits, access, cancellation stated plainly.
- Truth and trust: target 2/2 — current product only, verified quotes, no invented outcomes.

Minimum before the branch is handed back: 9/10 with no zero. Sandra still approves the exact page
before publication.

## Verification

Run, in order:

1. Targeted Vitest for the new contract and affected checkout/admin tests.
2. Targeted ESLint for changed TS/TSX files.
3. `pnpm type-check:ci`.
4. `pnpm verify:repo`.
5. `pnpm exec vitest run` if the localized gate is green.
6. `git diff --check`.
7. Local browser QA at phone and desktop widths.

## Commit

Use: `feat: build measurable SUITE revenue foundation`
