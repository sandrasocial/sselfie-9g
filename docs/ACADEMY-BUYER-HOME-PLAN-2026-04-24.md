# SSELFIE Buyer Home + Academy Plan
*Date: 2026-04-24*

## Executive Verdict

SSELFIE's public funnel is now much closer to the right commercial shape than the post-purchase product experience. The app already has a strong Academy library foundation, real Vimeo lesson data, lesson companion content, and account creation for paid buyers. The real gap is orchestration: the paid ladder is not mapped cleanly into Academy entitlements, the buyer home does not guide people to their next step, and Starter Kit still lives mostly outside the app.

The correct product decision is:

1. **Keep the Free Selfie Guide low-friction and email-first**
2. **Make every paid product account-first**
3. **Make `/academy` the buyer home for education products**
4. **Keep `/studio` as the core working surface for active Studio members**
5. **Use one clear "next step" recommendation, not a marketplace grid**

This is the lowest-risk path that improves retention, upgrades, and product clarity without breaking existing membership users.

---

## Verified Truth

### Academy content is live

Read-only verification against the current app database confirms:

- `academy_courses` exists
- `academy_lessons` exists
- `user_lesson_notes` exists
- `Branded by SSELFIE` is published with `14` real lessons
- `SSELFIE EDITING MASTERCLASS` is published with `6` real lessons
- all `20` lessons have Vimeo URLs
- all `20` lessons have non-null `content` JSON for takeaways, action steps, and reflection

Important note:

- `academy_courses.total_lessons` is stale for at least one course, but the new library UI uses actual lesson rows, so this is a metadata cleanup item, not the blocker.

### Paid buyers already get accounts

The Stripe webhook already creates a Supabase auth user + Neon user for guest/public paid checkouts when no `user_id` is present, and marks `password_setup_complete = false`. This already happens for:

- `starter_kit`
- `masterclass`
- `brand_strategy_pack`
- Studio membership

So the platform is already technically capable of account-first delivery.

### The biggest product mismatch is entitlement mapping

Current commercial product IDs:

- `starter_kit`
- `masterclass`

Current Academy course product IDs:

- `branded_by_sselfie`
- `editing_masterclass`

Current Academy catalog defaults do **not** include:

- `starter_kit`
- `masterclass`

That means a payment can succeed and an entitlement can be written, while the library still has nothing matching that product ID to visibly unlock.

### Current post-purchase experience is fragmented

- Free Guide: token-first and coherent
- Starter Kit: token-first access page plus optional password setup
- Masterclass: account exists, email points to `/academy`, but no clean product-to-course mapping
- Studio: real app experience, but intentionally gated on the public side
- Academy library: only shows what is already unlocked; it does not sell the next step

---

## Product Decisions (Locked)

These decisions are now the source of truth for this funnel.

### 1. Free Guide stays token-first

Do **not** force account creation for the free guide.

Why:

- It is the coldest-touch entry point
- the current flow is already working cleanly
- adding auth friction at this stage would lower lead conversion

What changes:

- the guide experience should add a strong but optional **"Claim your SSELFIE library"** moment
- this claim CTA should appear after the first meaningful value moment, not before

### 2. Every paid product becomes account-first

This includes:

- Starter Kit
- Masterclass
- Brand Strategy Pack
- Studio

Rule:

- token links remain as recovery/fallback access
- the primary post-purchase CTA becomes **Open My Library** or **Open SSELFIE**

### 3. `/academy` becomes the buyer home for education products

`/academy` is no longer just a course wall. It becomes:

- the home for Free Guide claimers
- the home for Starter Kit buyers
- the home for Masterclass buyers
- the course + resource hub for Studio members

### 4. `/studio` remains the work surface for active Studio members

Do **not** redirect all authenticated users away from `/studio` immediately.

Safer rule:

- education-only users land in `/academy`
- Studio members can still enter `/studio`
- `/academy` should contain a strong Maya/Studio launcher for members

This avoids breaking muscle memory for current paid Studio users.

### 5. Maya should be visible but not fully interactive for non-Studio buyers

Recommendation:

- show Maya as a **locked capability card**, not as a fake live chat shell
- give it one sentence of benefit and one CTA
- do not render a disabled chat composer

Why:

- it preserves desire
- it avoids frustration
- it keeps the distinction between education and AI support clear

### 6. Locked products should be visible in the library

But only as a **single recommended next step** plus a small locked catalog row, not a giant store grid.

Rule:

- one prominent next step
- other locked items secondary

### 7. Masterclass should map to the real Academy courses users already paid for

Recommendation:

- commercial product `masterclass` should unlock:
  - `branded_by_sselfie`
  - `editing_masterclass`

In the user experience, these should be grouped under one owned umbrella:

- **Selfie Masterclass**
  - Core Method
  - Editing Lab

This matches the existing DB truth and avoids creating duplicate commercial/course concepts.

### 8. Starter Kit should gain a real home inside Academy

Recommendation:

- keep `/access/starter-kit/[token]` as fallback
- add Starter Kit into the Academy registry as a direct-private resource/product
- create an authenticated Academy destination for Starter Kit assets

That destination should include:

- quick-start
- preset download
- guide access
- one clear next step into Masterclass

---

## UX Principles Driving the Plan

The target experience should follow these principles:

- **Clear welcome + next step**. Strong onboarding starts with a welcome message and a clear CTA for what to do first. citeturn0search0
- **Progress should be visible immediately**. Learner dashboards work best when they show progress and help users understand where they are in the journey. citeturn0search1turn0search3turn0search12
- **Guide people forward instead of making them decide everything themselves**. Adaptive learning paths and milestone unlocking improve forward motion and reduce overwhelm. citeturn0search2turn0search5turn1search2
- **Recognition beats recall**. Users should see what they own, what is next, and what is locked without having to remember how the product ladder works. citeturn0search12turn1search1
- **A single recommended next offer outperforms a noisy catalog**. Personalized recommendations and “where to go next” prompts are a core engagement pattern in strong learning platforms. citeturn0search1turn0search11

---

## Target Information Architecture

## Public Funnel

- `/` — education-first homepage
- `/selfie-guide` — free guide capture
- `/starter-kit` — paid impulse offer
- `/masterclass` — full method offer
- `/join/studio` — advanced membership offer
- `/work-with-me` — premium inquiry

## Authenticated Buyer Home

- `/academy` — buyer home and library
- `/academy/courses/[courseId]` — course overview
- `/academy/courses/[courseId]/lessons/[lessonId]` — lesson viewer
- `/academy/access/selfie-guide` — authenticated bridge
- `/academy/access/starter-kit` — new authenticated Starter Kit home
- `/academy/access/brand-strategy` — authenticated bridge

## Studio Work Surface

- `/studio` — active member workspace

---

## The Target `/academy` Experience

## Hero

Top block:

- Welcome back, [Name]
- one sentence based on ownership state
- progress snapshot
- one primary CTA

Examples:

- Starter Kit buyer:
  - `Your Starter Kit is ready. Start with the quick win and open the guide when you want the fuller method.`
- Masterclass buyer:
  - `Your Masterclass is unlocked. Pick up where you left off.`
- Studio member:
  - `Your library and tools are ready. Continue your lesson or open Maya.`

## Section 1: Continue Your Content

Show only owned items here.

Order:

1. last active lesson/product
2. other owned products

Cards show:

- title
- owned state
- progress
- duration or asset type
- single CTA: `Start` / `Continue` / `Open`

## Section 2: Your Next Step

Exactly one recommendation.

Rules:

- Free Guide user → Starter Kit
- Starter Kit buyer → Masterclass
- Masterclass buyer → Studio
- Studio member → 1:1 or a current advanced path

Card contents:

- one-line reason why this is the right next step
- price or access note
- one CTA

## Section 3: Your Tools

Only show tools relevant to owned state.

Examples:

- Starter Kit buyer:
  - Preset Vault
  - Selfie Guide
  - Quick Start
- Masterclass buyer:
  - Selfie Masterclass
  - Editing Lab
  - Downloads
- Studio member:
  - Maya
  - Feed Planner
  - Gallery
  - Academy

## Section 4: Locked Inside SSELFIE

This is small, secondary, and visible.

Show:

- one or two locked items max
- short reason
- price/availability
- CTA

Special handling:

- Studio should say `Private onboarding` or `Join Studio` based on current ops policy
- 1:1 should say `Inquiry only`

## Maya Block

Behavior by tier:

- Free Guide: hidden
- Starter Kit: visible locked card
- Masterclass: visible locked card
- Studio: active launcher card

Copy pattern:

- `Maya is the AI layer inside Studio. When you're ready for faster execution, she's here.`

---

## Product Mapping Model

### Free Guide

- Commercial entry: free email capture
- Primary delivery: token access
- Secondary product home: optional library claim

### Starter Kit

- Commercial product id: `starter_kit`
- Academy registry entry needed: `starter_kit`
- Delivery kind: `direct_private`
- Access target: `starter-kit`
- Auth destination: `/academy/access/starter-kit`
- Fallback destination: `/access/starter-kit/[token]`

### Masterclass

- Commercial product id: `masterclass`
- Academy mapping aliases:
  - `masterclass` → `branded_by_sselfie`
  - `masterclass` → `editing_masterclass`

Recommended implementation:

- keep commercial product id `masterclass`
- add product alias resolution in Academy entitlement logic
- display grouped UI label: `Selfie Masterclass`

### Studio

- Commercial product id: `sselfie_studio_membership`
- Buyer home card in Academy
- active work surface in `/studio`

---

## Immediate Engineering Fixes

These are the first things that need changing before any visual polish sprint.

### Fix 1: Map Masterclass to real Academy content

Problem:

- webhook grants `masterclass`
- Academy content is keyed as `branded_by_sselfie` and `editing_masterclass`

Required change:

- add alias resolution so `masterclass` unlocks both Academy course ids

### Fix 2: Add Starter Kit to Academy registry

Problem:

- Starter Kit creates an entitlement but is not represented in Academy catalog defaults

Required change:

- add `starter_kit` as an Academy direct-private product
- add `/academy/access/starter-kit`

### Fix 3: Replace raw delivery emails with real templates

Problem:

- Starter Kit and Masterclass both send inline HTML from the webhook

Required change:

- wire the webhook to the dedicated Day 0 templates
- make the primary CTA the app/library destination

### Fix 4: Change paid post-purchase CTA from “here is your link” to “open your library”

Problem:

- email delivery currently fragments users across token routes

Required change:

- paid emails should prioritize:
  - open your library
  - set password if needed
  - fallback token link

### Fix 5: Rework `/academy` to show owned + next step + locked desire

Problem:

- current library only shows owned courses and a dead-end empty state

Required change:

- show owned products
- one next-step block
- locked product visibility
- Maya state card

---

## Route Changes

### Keep

- `/selfie-guide/access/[token]`
- `/access/starter-kit/[token]`
- `/academy/courses/[courseId]`
- `/academy/courses/[courseId]/lessons/[lessonId]`
- `/studio`

### Add

- `/academy/access/starter-kit`
- optional `/academy/claim` or modal-driven account-claim flow for Free Guide users

### Reduce or Retire Over Time

- legacy `/academy/products/[productId]` as the primary mini-product surface
- `/academy/success` as a core journey dependency

These can remain during migration, but they should not be the primary buyer path.

---

## Recommended Build Order

## Phase 1 — Revenue Integrity

Goal: make sure paying buyers always land in the correct owned experience.

Build:

1. Masterclass entitlement alias mapping
2. Starter Kit Academy registry entry
3. `/academy/access/starter-kit`
4. template-driven Starter Kit and Masterclass delivery emails
5. paid post-purchase CTA changes

Success criteria:

- Masterclass buyer pays and sees owned content in `/academy`
- Starter Kit buyer pays and sees a library/home entry point
- no regression for existing Studio members

## Phase 2 — Buyer Home Redesign

Goal: turn Academy into a true buyer home.

Build:

1. `/academy` hero redesign
2. owned products section
3. next-step recommendation block
4. locked product row
5. Maya locked/active card

Success criteria:

- education-only users understand what they own and what to do next in under 5 seconds
- Studio members can still launch their working tools quickly

## Phase 3 — Free Guide to Library Claim

Goal: convert free guide readers into app-known users without hurting lead capture.

Build:

1. guide claim CTA
2. lightweight password/account claim flow
3. claimed guide appears in library

Success criteria:

- free users can remain token-based
- engaged users can move into the app without repurchasing or re-entering data

## Phase 4 — Studio Upsell Layer

Goal: make the move from education to AI feel natural.

Build:

1. Maya teaser card in Academy
2. Studio locked card with private onboarding CTA
3. upsell logic based on ownership and progress

---

## Existing Studio Member Safety Rules

These guardrails should be treated as non-negotiable.

1. Do **not** replace `/studio` as the primary route for active members without a separate rollout.
2. Do **not** break existing membership onboarding or payment flows.
3. Do **not** remove token routes until authenticated replacements are fully live and validated.
4. Do **not** make Starter Kit or Masterclass depend solely on one fragile route; every paid product needs a fallback.
5. Do **not** turn Academy into a cluttered store. It should feel like a home, not a sales floor.

---

## Files Likely To Change

### Product logic

- `lib/academy-entitlements.ts`
- `lib/products.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/actions/landing-checkout.ts`

### Authenticated buyer experience

- `app/academy/page.tsx`
- `app/academy/_lib/course-library.ts`
- `app/academy/access/selfie-guide/page.tsx`
- `app/academy/access/starter-kit/page.tsx` (new)
- `components/sselfie/public-marketing.tsx` (only if CTA wording changes)

### Email

- `lib/email/templates/starter-kit-day0-delivery.ts`
- `lib/email/templates/masterclass-day0-delivery.ts`

### Data / registry

- new migration for Academy product registry additions + aliases
- optional cleanup migration for stale `academy_courses.total_lessons`

---

## Final Product Position

SSELFIE should feel like this:

- the **Free Guide** gives a fast, low-friction entry
- the **Starter Kit** gives the first real result
- the **Masterclass** gives the full method in a structured library
- **Studio** becomes the execution engine once the user's identity is clear

That means the app should not behave like a collection of separate products. It should behave like one personal brand environment with increasing depth.

That is the product shape that gives Sandra both:

- low-friction conversion at the front
- a believable high-value ladder inside the product

