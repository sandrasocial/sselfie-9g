# Codex Implementation Tasks — Research Sprint Feb 2026

**Generated:** 2026-02-25
**Source:** 6 parallel research subagents × feature docs + funnel/support/friction digests
**Principle:** Each task is self-contained. Read the matching feature doc before starting. No broad refactors. Preserve credit invariants and paid flows.

---

## Context (State Summary Template)

```
Context: Post-research sprint. 6 feature docs now have §7 and §8 filled from digest evidence.
Last actions: Subagents read funnel-digest-*, support-digest-*, revenue/subscription audits → wrote
  value/pain/opportunities into docs/features/maya.md, feed-planner.md, gallery.md, academy.md,
  profile.md, admin.md.
Files touched: docs/features/*.md (research only; no code changes)
Outstanding issues:
  - 0% first-output activation (547 users, 0 bonus credit spend, 17 paying members)
  - Feed Planner wizard drop-off (1 continue click total in 3 days)
  - Academy mini-products not connected to in-app journey
  - 80 unresolved credit_transaction stripe_payment_id missing (historical)
  - 1 past_due subscription, 24 canceled (no automated win-back)
Next steps: Codex implements tasks below in priority order.
```

---

## Priority 1 — ACTIVATION (Highest Impact)

### TASK A-01: Maya First-Generation Guided Path

**Feature doc:** `docs/features/maya.md`
**Problem:** 0% of new users generate a single image despite receiving 2 free credits. The current flow drops users into Maya's full interface with no guided action.
**Evidence:** funnel-digest Feb 22–25: 0/14, 0/20, 0/21 first-output activation.

**What to build:**
- In `components/sselfie/maya/welcome-first-generation-flow.tsx`: add a "Your first photo in 3 steps" modal/banner that fires for new users with 0 generations and unused bonus credits
- Step 1: "Choose a style from our top picks" (pre-populated Prompts tab suggestions)
- Step 2: "Pick Classic (your trained model) or Pro (upload a selfie)" — simplified toggle with explanations
- Step 3: One tap → generate → show result with Photoshoot button prominently
- Gate: show only when `credit_transactions.transaction_type = 'bonus'` exists AND no `image` type transaction yet for user
- Track: add analytics event `first_generation_guided_start` and `first_generation_guided_complete`

**Pre-built research — read before implementing:**
- `docs/in-app-funnel/01-journey-map-2026-02-25.md` §Stage 1 (Free user flow, gaps, suggested surface)
- `docs/in-app-funnel/02-content-copy-2026-02-25.md` §Section 2 (Maya system-context prompt rules)
- `docs/in-app-funnel/03-designs-wireframes-2026-02-25.md` §Wireframe 4 (Maya 3-step guided flow, mobile 375px)

**Files:**
- `components/sselfie/maya/welcome-first-generation-flow.tsx`
- `components/sselfie/maya/maya-prompts-tab.tsx` (pre-populate with top prompts)
- `app/api/user/credits/route.ts` (check bonus-only, no image spend)

**Constraints:** No changes to credit costs or generation logic. Pure UI/UX flow addition.

---

### TASK A-02: Feed Planner — Wizard Drop-off Fix

**Feature doc:** `docs/features/feed-planner.md`
**Problem:** 1 "Continue" click to first generation across 3 days of new signups. The unified onboarding wizard is too complex.
**Evidence:** funnel-digest: 1 activation continue click on Feb 22, 0 on Feb 23/25. 13 paid blueprint users not generating.

**What to build:**
- In `components/onboarding/unified-onboarding-wizard.tsx`: reduce wizard to max 3 steps (Goal → Style → "Your feed is ready")
- Replace current "activation checklist and Continue CTA" with a large, prominent "Create my first feed →" button
- For paid blueprint users: skip onboarding wizard entirely if goal/style not set; instead show an inline "Set up in 30 seconds" card within FeedViewScreen
- Add progress indicator per wizard step (so users know how far they are)
- Track: `wizard_step_X_complete` and `wizard_abandoned_at_step_X` events

**Files:**
- `components/onboarding/unified-onboarding-wizard.tsx`
- `app/feed-planner/feed-planner-client.tsx` (wizard gate logic)
- `components/feed-planner/feed-view-screen.tsx` (CTA placement)

**Constraints:** Preserve `showWizard` / `showWelcomeWizard` gates. No changes to generation API.

---

## Priority 2 — RETENTION & VALUE (Members / Paying Users)

### TASK B-01: Gallery Empty State + First-Generation CTA

**Feature doc:** `docs/features/gallery.md`
**Problem:** Gallery is empty for 0%-activation users. Empty state shows "Go to Maya" but is low-contrast and easy to miss.
**Evidence:** revenue-audit: 8421 image transactions across 119 users (used by paying members); 0% new user activation = most Galleries are empty.

**What to build:**
- In `components/sselfie/gallery-screen.tsx`: redesign empty state for Photos tab
  - Large headline: "Your AI photos will live here"
  - Sub: "Create your first photo with Maya in under 60 seconds"
  - CTA button: "Create with Maya →" (navigates to Maya tab, fires guided path from A-01)
- Same pattern for Videos empty state: "Create a video from any photo you've made"
- Videos tab: rename to "Reels" in the tab label (aligned with Instagram vocabulary)
- Surface a "New" badge on Videos/Reels tab for first 30 days after signup

**Files:**
- `components/sselfie/gallery-screen.tsx`
- `components/sselfie/gallery/components/gallery-filters.tsx` (tab labels)

**Constraints:** No API changes. Pure UI.

---

### TASK B-02: Profile — "Complete Your Brand Profile" Onboarding Prompt

**Feature doc:** `docs/features/profile.md`
**Problem:** Users skip Personal Brand setup, degrading Maya's personalization. Maya brand injection is only useful if the data is there.
**Evidence:** Maya is the primary value-delivery feature; brand profile injection is core to its design.

**What to build:**
- In `components/sselfie/account-screen.tsx` Profile section: if `personal_brand` fields are empty/incomplete (name/bio/brand_voice fields not set), show a prominent banner:
  - "Teach Maya who you are → Your photos will match your brand"
  - CTA: "Set up brand profile" (opens Personal Brand expandable section)
- Show completion progress: "3/5 fields complete" with a simple progress bar
- After completion: show confirmation toast "Maya now knows your brand ✓"
- Track: `brand_profile_completion_X_of_5` event

**Files:**
- `components/sselfie/account-screen.tsx`
- `components/sselfie/personal-brand-section.tsx`
- `app/api/profile/info/route.ts` (check completeness)

**Constraints:** No changes to how Maya reads brand profile. Only UI/prompting changes.

---

### TASK B-03: Prompts Tab — Curate "Sandra's Picks"

**Feature doc:** `docs/features/maya.md` §5 (Prompts tab data source)
**Problem:** Prompts tab "not many prompts added" — it's a half-built dead end. It's a high-value discovery surface.
**Evidence:** maya.md: user-facing prompts from `prompt_guide_items` + `prompt_guides`; admin can manage via `/api/admin/creative-content/prompts`.

**What to build (Admin side):**
- In `app/admin/mission-control/page.tsx` or a new admin sub-page: add "Manage Prompts Tab" section
- UI to create/edit/reorder `prompt_guide_items` with fields: title, category (e.g. "Fashion", "Lifestyle", "Power Pose"), image preview URL, and a "Sandra's Pick" badge toggle
- Batch-seed: create a script `scripts/seed-sandra-prompts.ts` that inserts 10–15 curated Nano Banana Pro prompts (Sandra approves the list) into `prompt_guide_items`

**What to build (User side):**
- In `components/sselfie/maya/maya-prompts-tab.tsx`: show category filter chips at top
- Show "Sandra's Picks" category first (badge on each card)
- Each card: photo preview + style name + "Try this →" button
- "Try this" fires directly into Pro generation with that prompt pre-filled

**⚠️ BLOCKED — needs Sandra input before starting:**
`scripts/seed-sandra-prompts.ts` requires a list of 10–15 Nano Banana Pro prompts approved by Sandra (categories, style names, example outputs). Do NOT implement seed script until Sandra provides and approves this list. Build the Admin UI and user-facing tab first; seed separately once list is confirmed.

**Files:**
- `components/sselfie/maya/maya-prompts-tab.tsx`
- `scripts/seed-sandra-prompts.ts` (new — blocked until Sandra's prompt list is approved)
- `app/api/admin/creative-content/prompts/route.ts` (extend if needed)

**Constraints:** Use existing `prompt_guide_items` / `prompt_guides` tables. No new tables.

---

## Priority 3 — FUNNEL (Free → Paid Conversion)

### TASK C-01: Academy In-App "You Have Access" Surface

**Feature doc:** `docs/features/academy.md`
**Problem:** Users who bought Academy mini-products (What To Say, Show Up, Get Paid) have no in-app reminder or next-step guidance.
**Evidence:** IN-APP-JOURNEY-AND-ACADEMY-FUNNEL.md: "After buying What To Say there is no in-app next step."

**What to build:**
- In `components/sselfie/academy-screen.tsx` Overview section: call `GET /api/academy/my-products` to fetch user's purchased products
- For each owned product: show a card with "You have access → Start now" and a deep-link CTA:
  - What To Say → Feed Planner (create captions)
  - Show Up → Maya (create photos)
  - Get Paid → Profile (add best work)
  - AI Photo Prompt Pack → Maya Prompts tab
- For non-Studio users who have bought products: show the mini-products grid (same as public `/academy`) inside the Academy tab as "Get more →" section

**Pre-built research — read before implementing:**
- `docs/in-app-funnel/01-journey-map-2026-02-25.md` §Stage 3 + §Stage 4 (Studio member + Academy buyer gaps)
- `docs/in-app-funnel/02-content-copy-2026-02-25.md` §Section 1 (exact CTA copy per product, button labels, deep-link targets)
- `docs/in-app-funnel/03-designs-wireframes-2026-02-25.md` §Wireframe 1 (Academy tab layout with "YOU HAVE ACCESS" row)

**Files:**
- `components/sselfie/academy-screen.tsx`
- `app/api/academy/my-products/route.ts` (verify this exists before building on it; if missing, create it)

**Constraints:** Respect existing Studio membership gate for courses/templates/drops. This adds a layer on top.

---

### TASK C-02: Post-Purchase In-App Redirect

**Feature doc:** `docs/features/academy.md`, `docs/features/feed-planner.md`
**Problem:** After buying an Academy product or Paid Blueprint, users land on a static success page with no clear in-app next step.

**What to build:**
- Enhance `app/academy/success/page.tsx`: add product-specific "Next step" card:
  - Paid Blueprint: "Your feed is waiting → Open Feed Planner"
  - What To Say: "Plan your first week of captions → Open Feed Planner"
  - Show Up: "Create your first photo → Open Maya"
  - AI Photo Prompt Pack: "Browse your prompts → Open Maya Prompts"
- Each CTA is a deep link to `/studio?tab=[feed-planner|maya]` with an appropriate hash
- Add `?source=academy_purchase&product=[productId]` param so in-app can show a welcome banner

**Pre-built research — read before implementing:**
- `docs/in-app-funnel/02-content-copy-2026-02-25.md` §Section 3 (post-purchase success page copy per product) + §Section 4 (post-purchase email openers)
- `docs/in-app-funnel/03-designs-wireframes-2026-02-25.md` §Wireframe 2 (post-purchase bottom-sheet modal, mobile design)
- `docs/in-app-funnel/05-slice-1-verification-checklist.md` §3 (QA steps for this task)

**Files:**
- `app/academy/success/page.tsx`
- `app/feed-planner/feed-planner-client.tsx` (read `?source` param to show welcome)
- `app/maya/page.tsx` or `app/studio/page.tsx` (read `?source` param to show welcome)

**Constraints:** No webhook changes. Success page is post-redirect; use query params for in-app state.

---

### TASK C-03: Upgrade CTA — Outcome-Focused Messaging

**Feature doc:** `docs/features/profile.md`
**Problem:** Non-Studio users see generic upgrade CTAs. "Creator Studio €97/month" doesn't answer "what do I get?"
**Evidence:** 17/547 = 3.1% Studio conversion; 24 canceled (they tried it and left); messaging must be outcome-driven.

**What to build:**
- In `components/upgrade/upgrade-modal.tsx` and `components/sselfie/account-screen.tsx` upgrade CTA:
  - Replace generic "Upgrade to Creator Studio" with: "Your Maya learns YOU. Gets smarter. Creates better."
  - Add 3 specific outcome bullets: "Your custom selfie model (trained on your photos)", "200 monthly generation credits", "Full Academy: courses, templates, monthly drops"
  - Show social proof: "Join [X] women building their brand with SSELFIE" (pull live count from `/api/studio/stats`)
- Past_due users: add a small banner in Profile Settings → Account Info: "⚠ Payment failed — update billing to keep your access" with link to Stripe portal

**Files:**
- `components/upgrade/upgrade-modal.tsx`
- `components/sselfie/account-screen.tsx`
- `app/api/studio/stats/route.ts` (add active member count)

**Constraints:** No changes to checkout flow or Stripe integration.

---

## Priority 4 — ADMIN OPERATOR TOOLS

### TASK D-01: Admin Activation Alert Panel

**Feature doc:** `docs/features/admin.md`
**Problem:** Sandra has no visibility into "users who signed up but never generated." This is the #1 lever for conversion.
**Evidence:** 0% activation across 55 new users in 3 days; no alert in admin.

**What to build:**
- In `components/admin/admin-dashboard.tsx`: add "Activation Watch" panel
- Query: users created in last 72 hours with 0 image-type credit transactions
- Show: count + list (email, signup time, credits remaining)
- CTA per user: "Send nudge email" (fires a one-off via Resend)
- Below: 7-day activation trend sparkline (signups vs first-generation completions per day)

**Files:**
- `components/admin/admin-dashboard.tsx`
- `app/api/admin/analytics/activation/route.ts` (new endpoint)

**Constraints:** Read-only query. Email nudge requires explicit click. Use existing Resend integration.

---

### TASK D-02: Admin At-Risk Subscription Panel

**Feature doc:** `docs/features/admin.md`
**Problem:** 1 past_due, 24 canceled — no early-warning or win-back in the dashboard.
**Evidence:** subscription-audit-2026-02-25: 1 past_due, 24 canceled (sselfie_studio_membership).

**What to build:**
- In `components/admin/admin-dashboard.tsx`: add "Subscription Health" section (currently shows aggregate; add action layer)
  - Past_due (1): show email + "Send billing update email" CTA (link to Stripe portal email)
  - Recently canceled (last 30 days): show list with days since cancel + "Send win-back" CTA
- Win-back email: short template in `email-templates/` — "We miss you. Here's what's new in SSELFIE."

**Files:**
- `components/admin/admin-dashboard.tsx`
- `app/api/admin/analytics/subscription-health/route.ts` (new or extend existing)
- `email-templates/win-back.tsx` (new)

**Constraints:** Manual send only (no automated triggers). Respect Resend rate limits (2 req/sec).

---

## Quick Wins (No Feature Doc Needed)

### TASK E-01: Maya Videos Tab → Rename to "Reels"

Change the tab label "Videos" → "Reels" in `components/sselfie/maya/maya-tab-switcher.tsx` and the corresponding string constants. Aligns with how the target audience (Instagram users) thinks about this content. 5-minute change.

---

### TASK E-02: Feed Planner — Show Credit Cost Before Generation

In `components/feed-planner/feed-view-screen.tsx`, before the "Generate" button fires, show a tooltip or inline text: "This will use 2 credits per image (18 credits for a 9-post feed)." Prevents surprise and builds trust. No API change needed — credit costs are already in `lib/credits.ts` constants.

---

### TASK E-03: Past-Due Badge in Profile Settings

In `components/sselfie/account-screen.tsx` Settings → Account Info section: if subscription status is `past_due`, show a yellow ⚠️ badge and text "Payment needs updating" with direct link to Stripe portal (already exists at `/api/stripe/create-portal-session`). No new API needed.

---

## Implementation Order (Recommended for Codex)

1. **A-01** Maya First-Generation Guided Path — highest impact, self-contained UI
2. **A-02** Feed Planner Wizard Simplification — clears the biggest funnel block
3. **B-01** Gallery Empty State redesign — quick polish, high visibility
4. **E-01/E-02/E-03** Quick wins — ship fast, build momentum
5. **B-02** Profile Brand Profile prompt — sets up Maya quality improvement
6. **B-03** Prompts Tab curation — requires Sandra's prompt list first (get from Sandra)
7. **C-01** Academy in-app "You have access" — depends on my-products API working
8. **C-02** Post-purchase redirect — coordinate with Academy checkout flow
9. **C-03** Upgrade CTA messaging — easy copy change, needs Sandra to approve copy
10. **D-01** Admin activation panel — operator tool, lower urgency
11. **D-02** Admin subscription health panel — operator tool, lower urgency

---

## What Codex Needs Before Starting Each Task

For all tasks:
1. Read `docs/CODEX_CONTEXT.md` (State Summary Template)
2. Read the matching feature doc in `docs/features/`
3. Confirm the specific files listed exist (use grep/search before touching)
4. Plan → Implement → Test → Summarize per the operating procedure

For tasks touching credits: Read `lib/credits.ts` first. Never change CREDIT_COSTS without explicit product decision.
For tasks touching email: Read `lib/email/` and respect 2 req/sec Resend limits with existing queue.
For tasks touching Stripe: Read `lib/stripe.ts` and `lib/subscription.ts`. No changes to webhook handler without a dedicated task.

---

*Research by: North + 6 feature subagents (Maya, Feed Planner, Gallery, Academy, Profile, Admin)*
*Evidence: output/automation/funnel-digest-2026-02-25, support-digest-2026-02-25, revenue-audit-2026-02-25, subscription-audit-2026-02-25, friction-digest-2026-02-25*
