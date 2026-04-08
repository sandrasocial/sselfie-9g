# Feed Planner — Feature doc

**Purpose:** Single source of truth for how the Feed Planner feature works end-to-end. For agents, North, and product.

---

## 1. Overview

- **Feature name:** Feed Planner
- **One-line:** Manual, click-and-create Instagram feed planning: create feeds, define strategy, generate 9-post grids with AI images and captions, save and download. Serves as the **Blueprint funnel** for Free → Paid Blueprint → Creator Studio. The live `create-from-strategy` path is currently **Pro-only** even though some surrounding Classic branching still exists. (No conversational Maya flow; Maya Feed tab is disabled.)
- **Entry points:**
  - `/feed-planner` (direct; defaults to feed-planner tab)
  - `/studio?tab=feed-planner`
  - In-app: bottom nav “Feed” in `SselfieApp`
- **Who can access:** All authenticated users. **Access level** depends on product: Free (limited preview / 2 credits); Paid Blueprint (full Feed Planner, 9-post grids, 60 credits one-time); Creator Studio (full access, 200 monthly credits).

### Product history and intent (canonical)

- **Original intent:** Feed Planner was originally designed to be **Maya conversational** — Maya would assist in designing a 9-post feed and implement directly into Feed Planner for the user. That conversational path was **never implemented correctly** despite many weeks of effort.
- **Current reality:** After repeated try/fail cycles, the product became **manual feed creation with click-and-create** instead of Maya conversational. The implementation evolved through **V1 and V2**, built back and forth over a long period, and was perceived as **too complex and over-engineered**.
- **Current generation mode reality:** The live `app/api/feed-planner/create-from-strategy/route.ts` path forces every created post into **Pro mode**. Classic branching still exists in adjacent feed-planner code, but it is dormant in the current planner creation flow.
- **Role in the funnel:** Feed Planner **became the Blueprint funnel** for the rest of the user journey and features. It is the main conversion and value-delivery surface: Free users get limited preview (e.g. 2 credits); Paid Blueprint and Creator Studio get full 9-post grids and strategy. Full journey and three-tier system: **`docs/COMPLETE_USER_JOURNEY_MAP.md`** (Free → Paid Blueprint → Membership; credits, access matrix, email sequences).
- **Relationship to Maya:** The **Maya Feed tab** (conversational “Maya assists in designing a feed”) is **disabled** in Maya. Feed Planner is a **standalone tab** with a manual flow only. Any future “Maya implements directly to Feed Planner” would be a separate product/engineering initiative.

---

## 2. User journey (start to finish)

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Land on Feed Planner tab | Auth check; `FeedPlannerClient` loads; fetches access, onboarding-status, welcome-status. |
| 2 | Onboarding wizard (free / first-time) | `UnifiedOnboardingWizard` if setup not complete: goal, style, preview feed, “You’re all set!”. On complete → show FeedViewScreen. |
| 3 | Welcome wizard (paid blueprint first-time) | `WelcomeWizard` if welcome not shown: “You’re all set!” + “Use your credits in Maya…” ; on complete → POST welcome-status. |
| 4 | Feed view | `FeedViewScreen`: list of feeds, create feed, open a feed. Manual flow only (no Maya chat). Uses `/api/feed/latest`, `/api/feed/list`. |
| 5 | Create / edit feed (manual) | **Click-and-create:** Set strategy (goal, style), generate strategy, then select/customize scenes or posts. Generate images (credits per scene; 2 credits per scene typical). Save to planner. |
| 6 | Single feed detail | Feed posts grid (e.g. 9-post), regenerate post/caption, replace image, download bundle, profile image, highlights. |
| 7 | Activation / conversion | Activation checklist and “Continue” CTA; links to first generation or feed. **Funnel:** Free → limited preview; Paid Blueprint / Studio → full 9-post grids. |

Branches: no onboarding → skip wizard; paid returning → skip welcome wizard; no credits → upgrade/buy modals. **No conversational Maya in Feed Planner;** Maya Feed tab is disabled elsewhere.

---

## 3. Frontend

- **Routes (pages):**
  - `app/feed-planner/page.tsx` — server; auth, neon user, subscription; renders `SselfieApp` with `initialTab="feed-planner"`.
- **Main component(s):**
  - `components/sselfie/sselfie-app.tsx` — when tab is feed-planner, renders `FeedPlannerClient`.
  - `app/feed-planner/feed-planner-client.tsx` — wizard gate, welcome gate, then `FeedViewScreen`.
  - `components/feed-planner/feed-view-screen.tsx` — feed list and feed detail view.
  - `components/onboarding/unified-onboarding-wizard.tsx` — onboarding steps.
  - `components/feed-planner/welcome-wizard.tsx` — paid welcome “You’re all set!”.
- **Key UI state:** `showWizard`, `showWelcomeWizard`, `wizardMode`, `selectedFeedId`, feed list, strategy, posts, generation progress.
- **Navigation:** Tab in SselfieApp; within Feed Planner: feed list ↔ feed detail; deep link `?tab=feed-planner`.
- **Code paths:**
  - `app/feed-planner/page.tsx`, `app/feed-planner/feed-planner-client.tsx`
  - `components/feed-planner/*` (feed-view-screen, welcome-wizard, etc.)
  - `components/onboarding/unified-onboarding-wizard.tsx`
  - `app/feed/[feedId]/page.tsx` (single feed page when used)

---

## 4. Backend

- **API routes (Feed Planner / Feed):**
  - Access & status: `app/api/feed-planner/access/route.ts`, `app/api/feed-planner/welcome-status/route.ts`
  - Strategy & batch: `app/api/feed-planner/create-from-strategy/route.ts`, `app/api/feed-planner/generate-batch/route.ts`, `app/api/feed-planner/generate-all-images/route.ts`, `app/api/feed-planner/queue-all-images/route.ts`, `app/api/feed-planner/preview-feed/route.ts`, `app/api/feed-planner/delete-strategy/route.ts`, `app/api/feed-planner/enhance-goal/route.ts`
  - V2: `app/api/feed-planner/v2/variations/route.ts`, `app/api/feed-planner/save-to-planner/route.ts`
  - Feed CRUD & generation: `app/api/feed/list/route.ts`, `app/api/feed/latest/route.ts`, `app/api/feed/create-manual/route.ts`, `app/api/feed/create-free-example/route.ts`, `app/api/feed/[feedId]/route.ts`, `app/api/feed/[feedId]/generate-strategy/route.ts`, `app/api/feed/[feedId]/generate-images/route.ts`, `app/api/feed/[feedId]/generate-single/route.ts`, `app/api/feed/[feedId]/regenerate-post/route.ts`, `app/api/feed/[feedId]/regenerate-caption/route.ts`, `app/api/feed/[feedId]/update-style/route.ts`, `app/api/feed/[feedId]/download-bundle/route.ts`, plus profile, highlights, reorder, etc.
- **Server actions:** Checkout/credits elsewhere; feed generation is API-driven.
- **Cron / webhooks:** None specific to Feed Planner; reconcile/generation crons may touch feed images.
- **Code paths:** `app/api/feed-planner/**/*.ts`, `app/api/feed/**/*.ts`, `lib/feed-planner/*.ts`, `lib/feed/*.ts`, `lib/onboarding/activation.ts`

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Checked/deducted in feed image generation routes (e.g. `generate-single`, `generate-images`, feed-planner batch). Typical: **2 credits per scene**; full 9-post feed = 18 credits. Balance from `/api/user/credits`. Free: 2 credits (one-time grant); Paid Blueprint: 60 credits one-time; Creator Studio: 200/month.
- **Generation mode:** The live `create-from-strategy` planner path currently forces all generated planner posts to **Pro mode**. Treat any remaining Classic branching in nearby feed-planner files as dormant until a deliberate consolidation pass reintroduces it.
- **Entitlements / access:** `lib/feed-planner/access-control.ts` and `/api/feed-planner/access`. **Free:** limited (e.g. 1-post preview, 2 credits). **Paid Blueprint:** full Feed Planner, 9-post grids. **Creator Studio:** full access, 200 monthly credits. Onboarding and welcome wizards from `/api/user/onboarding-status`, `/api/user/setup-status`, `/api/feed-planner/welcome-status`.
- **Data flow:** Feeds and posts in DB (feeds, feed_posts, strategies); images via generation_trackers and gallery; personal brand from `/api/profile/personal-brand`. Feed Planner is the **Blueprint funnel** surface for conversion (free → paid → membership).

---

## 6. Code map (for agents)

- **Pages:** `app/feed-planner/page.tsx`, `app/feed/[feedId]/page.tsx`
- **Components:** `app/feed-planner/feed-planner-client.tsx`, `components/feed-planner/feed-view-screen.tsx`, `components/feed-planner/welcome-wizard.tsx`, `components/onboarding/unified-onboarding-wizard.tsx`, plus other feed-planner components
- **API routes:** `app/api/feed-planner/**/*.ts`, `app/api/feed/**/*.ts`
- **Lib / shared:** `lib/feed-planner/*.ts`, `lib/feed/*.ts`, `lib/onboarding/activation.ts`

---

## 7. Current value / pain (research)

- **Current value:** Manual click-and-create feed planning; full 9-post grid strategy and AI images; captions; download bundle; onboarding and welcome wizards for funnel; **Blueprint funnel** conversion surface (Free → Paid Blueprint → Membership).

- **Pain / friction:**
  - **Zero activation conversion:** 13 paid blueprint users active, but 0% are generating credits (across Feb 22–25 digests: 0/21 → 0/20 → 0/14 bonus users spent any credits). Indicates a post-purchase value realization gap.
  - **Wizard drop-off is the activation gate:** Almost no users reach first feed. "Activation continue clicks" (link to first generation) shows only 1 click on Feb 22, 0 on Feb 23, 0 on Feb 25. The onboarding and welcome wizards are blocking the funnel — users sign up or purchase but never click to generate.
  - **Over-engineered V1/V2 complexity:** Original Maya-conversational intent was abandoned; product evolved through multiple iterations, built and rebuilt, perceived as too complex. Manual click-and-create is the current reality, but the complexity from V1/V2 remains in UX and code.
  - **Access / credit mismatch unclear:** Paid Blueprint users are given 60 credits (enough for 9-post feed, ~18 credits used) but entry friction is so high (wizard gate + unclear first-feed CTA) that most never use them. Free users get 2 credits (1-post preview only), no clear onboarding value.
  - **Known history:** Original Maya vision was abandoned after weeks of failed try/fail cycles and over-engineering; current flow is manual only.

- **Audience evidence:** 13 paid blueprint active subscriptions (from subscription audit); 0 new subscriptions in last 3 days (funnel digests); 547 total users, but bulk acquisition not converting to generation.

---

## 8. Opportunities (for rebuild / AI)

- **High-priority:**
  - **Simplify the onboarding/welcome wizard:** Current wizard is a drop-off cliff. Reduce steps, clarify “Your first feed” as the immediate next action, and remove cognitive load. Consider a single “quick-start” card (e.g. “Create your first feed in 2 minutes”) with a direct CTA instead of multi-step flow.
  - **Clearer “Continue” CTA to first generation:** The activation-continue button (link to first generation) is not found by users (0/14, 0/20, 0/21 users clicking it per digests). Redesign as a prominent, clear “Create my first feed” or “Generate now” button immediately after wizard completion. Remove the activation checklist; it's noise.
  - **Faster path to first output:** Free users get 2 credits (1-post preview); Paid Blueprint get 60 credits (9-post feed). Both need a 2-click path from signup → strategy → generate, not a wizard maze. Consider a “Quick feed template” (e.g. preset strategy) to accelerate first generation.
  - **Measure wizard drop-off per step:** Add analytics to identify which wizard step(s) are causing exits (goal, style, preview, or “You're all set”). Currently, 13 paid users sign up but 0% generate — the wizard is the suspect.

- **Medium-priority:**
  - **Academy ↔ Feed Planner tie-in:** When a user buys an Academy mini-product (e.g. “What To Say”), the in-app next step should link to Feed Planner with a prompt: “You have [Product] — create your first [captions/feed] here.” This ties the funnel together and drives post-purchase activation.
  - **Better welcome message for paid blueprint:** Current welcome wizard says “You're all set!” + “Use your credits in Maya…” Maya Feed tab is disabled, which confuses users. Replace with “You have 60 credits — create your first 9-post feed below” and show a template picker or quick-start.
  - **In-app post-purchase next steps:** After a user completes onboarding or purchases, show a small banner or modal: “Next: [Create my first feed] or [Ask Maya for help]” to guide them to the next surface (Feed Planner or Maya).

- **Lower-priority / future:**
  - **Maya integration revisited:** Revisiting “Maya implements directly to Feed Planner” would be a separate product decision; Maya Feed tab is currently disabled. See `docs/features/maya.md` for Maya scope.
  - **Complexity reduction:** V1/V2 accumulated significant tech debt. A future refactor should simplify the code surface (e.g. merge wizard flows, reduce API routes, clarify feed-creation logic).

- **Constraints:** Design system; constitution; no breaking paid flows or credit invariants. Feed Planner must remain the **Blueprint funnel** conversion surface. All changes must measure and improve the funnel (Free → Paid Blueprint → Membership).

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Initial doc from codebase audit (North). |
| 2026-02-25 | Product history and intent: original Maya-conversational vision never implemented; became manual click-and-create (V1/V2, over-engineered). Feed Planner as Blueprint funnel (Free → Paid Blueprint → Membership). Access levels and credits clarified; relationship to Maya (Feed tab disabled) and refs to user journey docs added. |
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. Key findings: 13 paid blueprint users but 0% generating (0 credit spend from bonus users); 0 activation continue clicks (except 1 on Feb 22) = wizard is a drop-off cliff. Opportunities: simplify wizard, clearer first-feed CTA, Academy tie-in, in-app post-purchase next steps. |
