# Prioritized In-App Funnel & Academy Implementation List
**Date:** 2026-02-25
**Audience:** Implementation team (Codex), Sandra (product), North (research)
**Status:** Ready for implementation sprint planning

---

## Priority Framework

This list prioritizes **impact on the 0% activation crisis first**, then **Academy buyer retention and post-purchase activation**, then **non-member micro-conversions**. The framework is evidence-based: funnel digest shows 0/14 new users generated any image despite free-credit grants; 547 total users yield only 17 live Studio members (3.1% conversion); and 24 canceled subscriptions indicate retention risk. The in-app funnel and Academy integration are critical levers for all three.

---

## Slice 1 — First Sprint (Week 1, Highest Impact)

These four items directly address the 0% first-output activation and unlock the post-Academy-purchase next-step flow.

### 1.1 Maya First-Generation Guided Path (New Task)

**Description:**
Add an in-app welcome flow for new users with unused bonus credits that guides them from signup → first image generation in three simple steps (choose style → pick mode → generate). This directly targets the 0/14, 0/20, 0/21 first-output activation crisis.

**Maps to:** Overlaps with **A-01 (Maya First-Generation Guided Path)** in CODEX-TASKS but this prioritized list focuses on the **in-app funnel entry**, not the full Codex task scope. Implementation may combine A-01 + in-app onboarding sequencing.

**Rationale:**
**Evidence:** funnel-digest-2026-02-25: 0/14 new users generated (14 got bonus credits, 0 spent). 547 total users; only 17 active Studio members = 3.1% conversion. **Root cause:** New users see Maya's full interface with no guided action. The welcome flow removes friction and validates the "click-and-create" value prop.

**Dependency:**
- Journey map (define entry condition: `credit_transactions.transaction_type = 'bonus'` AND no `image` spend yet)
- Copy approval: "Your first photo in 3 steps" messaging
- Wireframe: modal/banner placement and CTA progression

---

### 1.2 Academy In-App "You Have Access" Surface (Maps to C-01)

**Description:**
Display purchased Academy mini-products (What To Say, Show Up, Get Paid, AI Photo Prompt Pack) as cards in the Academy tab Overview with product-specific deep-link CTAs: "You have [Product] → [Start in Feed Planner / Create with Maya / Browse Prompts]". For non-Studio users with purchases, also show the mini-products grid as a "Get more →" section.

**Maps to:** **Extends C-01 (Academy In-App "You Have Access" Surface)** in CODEX-TASKS. This item is the core lever for post-purchase activation inside the app.

**Rationale:**
**Evidence:** academy.md §7 pain: "Disconnected entry points… After purchase, user has no clear 'next step' within the Studio to activate or use their product." **Pain:** 0% activation from Academy buyers because they purchase on `/academy` but have no in-app reminder or next action. This surface makes purchases visible and drives immediate activation.

**Dependency:**
- `GET /api/academy/my-products` endpoint (should already exist; verify working)
- Copy approval: product-specific next-step CTAs (e.g. "What To Say → Plan your first week in Feed Planner")
- Wireframe: card layout, colors, link targets in Academy tab

---

### 1.3 Post-Purchase In-App Redirect & Welcome Banner (Maps to C-02)

**Description:**
After checkout on `/academy` or `/pricing`, redirect user into the app with a product-specific welcome banner: "Paid Blueprint → Open Feed Planner"; "What To Say → Plan captions in Feed Planner"; "Show Up → Create photos with Maya". Use query params (e.g. `?source=academy_purchase&product=what-to-say`) to trigger in-app banner that says "Welcome! Let's get started →" with deep link to correct tool.

**Maps to:** **Extends C-02 (Post-Purchase In-App Redirect)** in CODEX-TASKS.

**Rationale:**
**Evidence:** funnel-digest: 0 new subscriptions in 24h; feed-planner §7 pain: "Zero activation conversion… Almost no users reach first feed. 'Activation continue clicks' shows only 1 click on Feb 22, 0 on Feb 23, 0 on Feb 25." **Root cause:** Post-purchase user lands on static success page, not inside the app. This redirect + banner closes the loop between checkout and in-app activation.

**Dependency:**
- Journey map: product → correct in-app destination mapping (e.g. Paid Blueprint → Feed Planner)
- Copy approval: Welcome banner text and CTA strings
- URL structure: agreed-upon query param scheme for source and product tracking

---

### 1.4 Feed Planner Wizard Simplification (Maps to A-02)

**Description:**
Reduce the unified onboarding wizard to **max 3 steps** (Goal → Style → "You're ready!") and replace the "Activation checklist + Continue CTA" with a single, large "Create my first feed →" button. For paid blueprint users, skip wizard entirely and show an inline "Set up in 30 seconds" card in the feed list view. Add step-progress indicator so users know where they are.

**Maps to:** **Exact match A-02 (Feed Planner — Wizard Drop-off Fix)** in CODEX-TASKS.

**Rationale:**
**Evidence:** funnel-digest: 1 "Continue" click total across 3 days of new signups; 13 paid blueprint users, 0% generating credits. feed-planner §7: "Wizard drop-off is the activation gate… onboarding and welcome wizards are blocking the funnel." **Impact:** This is the single biggest funnel blocker. Simplification + prominent CTA should lift activation from 0% materially.

**Dependency:**
- Journey map: confirm wizard steps (goal, style) are the minimal required data
- Copy approval: "Create my first feed" CTA wording, inline card copy
- Wireframe: 3-step progression with indicators, new "Create" button placement

---

## Slice 2 — Second Sprint (Week 2–3, Academy Buyer Activation & Value Clarity)

These items drive post-Academy-purchase activation and retention; they follow Slice 1 because Slice 1 items must establish the in-app journey first.

### 2.1 Maya System Context Injection for Academy Buyers (New Task)

**Description:**
When a user with Academy purchases (identified by `user_tags` or `academy_course_purchases` query) opens Maya, inject product context into Maya's system prompt: "User purchased [Product]. Suggest relevant guidance: if What To Say, offer caption planning; if Show Up, suggest brand positioning." First message from Maya: "I see you have [Product]. Want me to help you [use/plan with/apply] it?" This ties Academy purchases to Maya engagement.

**Maps to:** **Overlaps academy.md §8 opportunity:** "Maya system context injection." Not in CODEX-TASKS; this is a new integrative item.

**Rationale:**
**Evidence:** academy.md §8 outlines opportunity; maya.md shows Maya is the primary engagement driver (119 users, 8,421 generation transactions across paid users). **Insight:** Academy buyers need guidance on how to use what they bought; Maya is the natural conversational entry point. This feature makes purchases "feel real" inside the app and drives usage.

**Dependency:**
- `user_tags` or query to identify Academy purchases (check if table structure supports)
- Copy approval: product-specific first messages and suggestions (e.g. "Help me plan captions with What To Say")
- System prompt template for each product type

---

### 2.2 Profile Brand Profile Completion Prompt (Maps to B-02)

**Description:**
In the Profile/Account screen, if personal brand fields are empty or <3/5 complete, show a prominent banner: "Teach Maya who you are → Your photos will match your brand." Tapping opens the Personal Brand section; show progress "3/5 fields complete" with a bar. After completion, show a toast: "Maya now knows your brand ✓". This ensures Maya personalization (brand profile injection) is effective.

**Maps to:** **Exact match B-02 (Profile — "Complete Your Brand Profile" Onboarding Prompt)** in CODEX-TASKS.

**Rationale:**
**Evidence:** maya.md §1: "brand profile is injected into Maya"; §7 pain: Maya's value depends on brand data. If profile is empty, Maya cannot personalize. **Insight:** Users don't know to fill it; a prompt drives completion and improves experience quality.

**Dependency:**
- Journey map: when to show prompt (first login, post-signup, or post-purchase?)
- Copy approval: "Teach Maya who you are" messaging and progress wording
- Wireframe: banner placement in Profile, Personal Brand section layout

---

### 2.3 Prompts Tab Curation & "Sandra's Picks" (Maps to B-03)

**Description:**
Create an admin interface in Mission Control (or new sub-page) to manage `prompt_guide_items` with fields: title, category (Fashion, Lifestyle, Power Pose, etc.), preview image, "Sandra's Pick" badge toggle. Batch-seed 10–15 curated Nano Banana Pro prompts (Sandra provides list). On user side, show category filter chips, "Sandra's Picks" category first (with badge), and "Try this →" button that pre-fills the prompt in Pro generation.

**Maps to:** **Exact match B-03 (Prompts Tab — Curate "Sandra's Picks")** in CODEX-TASKS.

**Rationale:**
**Evidence:** maya.md §1: "Prompts tab… Not fully built out — needs to be optimized and researched for best-performing prompts… not many prompts added." §8 Opportunity: "Optimize Prompts tab as curated entry point." **Impact:** Prompts tab is a high-value discovery surface for new and returning users; curation makes it a trusted, inspiring feed.

**Dependency:**
- Sandra approval: list of 10–15 curated Nano Banana Pro prompts + categories
- Copy approval: category names and descriptions
- Wireframe: category filter chip layout, "Sandra's Picks" badge placement, "Try this" button behavior

---

### 2.4 Gallery Empty State + First-Generation CTA (Maps to B-01)

**Description:**
Redesign Gallery Photos empty state with headline "Your AI photos will live here", sub-line "Create your first photo with Maya in under 60 seconds", and a prominent "Create with Maya →" button that deep-links to Maya and fires the guided path from Slice 1.1. Same pattern for Videos/Reels empty state. Rename Videos tab to "Reels" (align with Instagram terminology). Show "New" badge on Reels tab for first 30 days after signup.

**Maps to:** **Exact match B-01 (Gallery Empty State + First-Generation CTA)** in CODEX-TASKS.

**Rationale:**
**Evidence:** gallery.md (from research digests): 8421 image transactions across 119 users (paying members); 0% new-user activation means most Galleries are empty. **Impact:** Empty state is the only message new users see in Gallery; redesign it to be a clear CTA, not a dead end.

**Dependency:**
- Copy approval: "Your AI photos will live here" messaging
- Wireframe: empty state layout, button placement, Reels tab badge
- Link to Slice 1.1 guided path (ensure Maya entry is seamless)

---

## Slice 3 — Third Sprint (Maya Conversational Layer + Cross-Product Tie-In)

These items complete the AI/conversational layer and tie Academy, Feed Planner, and Maya into a unified in-app experience.

### 3.1 Outcome-Focused Upgrade Messaging (Maps to C-03)

**Description:**
Replace generic "Upgrade to Creator Studio" CTAs (in upgrade modal, Account screen, non-member Academy tab) with outcome-focused copy: "Your Maya learns YOU. Gets smarter. Creates better." Add 3 specific bullets: "Your custom selfie model (trained on your photos)", "200 monthly generation credits", "Full Academy: courses, templates, monthly drops". Show social proof: "Join [X] women building their brand with SSELFIE" (pull live count from `/api/studio/stats`). For past_due users: add a small ⚠️ banner in Settings → Account: "Payment failed — update billing to keep access".

**Maps to:** **Exact match C-03 (Upgrade CTA — Outcome-Focused Messaging)** in CODEX-TASKS.

**Rationale:**
**Evidence:** maya.md §7: 0% activation; subscription-audit: 17/547 = 3.1% Studio conversion, 24 canceled. **Root cause:** Generic "€97/month" doesn't answer "what do I get?" **Impact:** Outcome messaging and social proof are proven conversion levers for SaaS.

**Dependency:**
- Copy approval: outcome bullets and social proof messaging
- `/api/studio/stats` endpoint (must return active member count)
- Wireframe: modal layout, bullet placement, past_due banner in Settings

---

### 3.2 Maya Auto-Select Mode + First-Message Guidance (New Task)

**Description:**
If user trained a custom Flux model (in Training tab), default Maya to Classic mode; else default to Pro with inline prompt: "I can generate in **Classic mode** (your trained style) or **Pro mode** (with reference images you pick). Which do you prefer?" This removes mode confusion (maya.md §7 pain: "Classic vs Pro confusion") and makes the first choice intentional. Track mode-selection event.

**Maps to:** **Overlaps maya.md §8 opportunity:** "Smarter mode guidance and defaults" + "Auto-select mode." Not in CODEX-TASKS; this is a new item that should be quick.

**Rationale:**
**Evidence:** maya.md §7: "No evidence users understand when to use each mode or what reference images mean in Pro mode; no first-time guidance on mode selection." **Impact:** Mode selection is a critical UX moment for first-time users; guidance removes confusion and improves initial experience.

**Dependency:**
- Journey map: when to show the mode explainer (first Maya visit, first generation attempt?)
- Copy approval: mode explanation strings
- Check: `user_models.training_status = 'completed'` to auto-select Classic

---

## What to NOT Build Yet

### 1. Photoshoot Auto-Generation (Defer to Slice 4)

Photoshoot is a high-value feature (6–9 carousel images in exact style) but is currently buried post-generation. Surface the button and add cost/time estimate are Slice 4 priorities after first-output activation is solved. Auto-generating without user request could waste credits.

### 2. Feed Tab Re-Enablement in Maya (Defer to Product Decision)

Maya Feed tab is currently disabled. feed-planner.md §8 notes: "Revisiting 'Maya implements directly to Feed Planner' would be a separate product decision." Don't re-enable until architecture for Maya→Feed integration is clear. Risk: enabling a broken/confusing flow that reduces user confidence.

### 3. Bonus Credit Top-Ups / Incentive Mechanics (Defer to Slice 4)

maya.md §8 opportunity: "Offer bonus-credit top-ups on first generation." This requires analytics, email coordination, and careful credit-accounting logic. Defer until Slice 1 activation is proven; then run an experiment on top-up offers for the 0% cohort.

---

## Open Questions for Sandra

**Before implementation of Slice 1 begins, clarify:**

1. **Mini-product in-app purchase:** When a non-Studio user taps "Get more" in the Academy tab and sees the mini-products grid, should they be able to purchase inside the app, or should we link to `/academy/products/[productId]`? (Note: current checkout is public-only; in-app purchase requires new flow.)

2. **Academy buyer Studio gate:** If a user bought "What To Say" on `/academy` but never subscribed to Studio, should they see the full Academy tab with "You have access to [What To Say]" messaging, or only see their specific product card? (Current: in-app Academy is fully gated by Studio membership.)

3. **Maya first message for free vs. paid users:** Should the welcome flow message differ between free (2 credits) and paid users (60+ credits)? E.g. "You have 2 free credits — let's make your first photo!" vs. "You have 60 credits — unlimited creativity!"?

4. **Feed Planner wizard skip condition:** Should paid blueprint users **always** skip the wizard (show inline card only), or should they see the wizard once and then skip on subsequent visits?

5. **Post-purchase email + in-app sync:** Should the post-purchase email include a "Open app → [Academy / Feed Planner / Maya]" link, or rely on the in-app redirect and banner to guide users? (Copy and email sequence must align with in-app next steps.)

---

## Implementation Dependencies & Handoff Notes

- **Slice 1 verification:** After implementation, use **`docs/in-app-funnel/05-slice-1-verification-checklist.md`** for QA (build, Maya flow, Academy tab, post-purchase, Feed Planner wizard, end-to-end).

- **Before Codex starts Slice 1:** Subagents must deliver:
  - In-app journey map (per funnel stage: free, paid blueprint, Studio member, Academy buyer → current landing + desired next-step surface)
  - Copy doc: exact strings for all CTAs, banners, Maya first messages, and product-specific guidance
  - Wireframes or UI spec: Academy tab layout, Gallery empty state, post-purchase modal, Maya mode explainer
  - Color/component tokens: ensure designs follow existing SSELFIE design system

- **Credit invariants:** No changes to `lib/credits.ts` CREDIT_COSTS without explicit product decision. All UI changes preserve existing credit logic.

- **Preserve Studio membership gate:** All per-product additions (Academy mini-product cards, in-app purchases) must layer **on top** of the existing Studio all-access gate; do not break `components/sselfie/academy-screen.tsx` gating logic.

- **Analytics:** Codex must add event tracking as per CODEX-TASKS (e.g. `first_generation_guided_start`, `brand_profile_completion_X_of_5`, `wizard_step_X_complete`). These events are critical for measuring activation lift.

---

## Success Metrics (Post-Implementation)

After Slice 1 ships (estimated 1–2 weeks):
- **First-output activation:** Target 15–25% (vs. current 0%) for new users in the guided path.
- **Feed Planner continue click rate:** Target 10%+ (vs. current <1%) post-wizard simplification.
- **Academy "You Have Access" card views:** Track engagement for each product type.

After Slice 2 ships (estimated 2–3 weeks):
- **Academy buyer re-engagement:** Measure % of Academy buyers who visited in-app Academy tab within 24h of purchase (target: >40%).
- **Maya context utilization:** Track % of Academy buyers who generated images with contextual guidance vs. baseline.
- **Brand profile completion:** Target >50% of new users completing all 5 fields (vs. current unknown).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | Prioritized list created by research subagent. Slice 1 (first-generation guided path + Academy visibility + Feed wizard fix) targets 0% activation crisis. Slice 2 (Academy buyer activation + Maya context + profile prompt) targets post-purchase retention. Slice 3 (outcome messaging + mode guidance) completes conversational layer. Five open questions for Sandra. |

