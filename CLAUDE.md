# SSELFIE Operational Memory
*Last updated: 2026-07-13 — Read this at the start of every session*

---

## Me — Sandra (The Selfie Queen)
Founder of SSELFIE Studio. Single mother, Iceland/Norway. **8 active Suite members** (35 canceled, 14 active trials), **110,835 Instagram followers** (verified live 2026-06-29 via Graph API), 6,839 subscribed email contacts. Building AI-powered personal branding platform. Live at **sselfie.ai**.

**For current MRR + exact paying counts — always pull from Stripe. Don't trust stale numbers in docs.**

## Current Voice / Audience Source Of Truth (LOCKED 2026-06-27)

Before writing or editing any outward-facing copy, prompts, Studio.com blueprint text, landing-page copy, emails, DMs, product descriptions, Maya/persona language, or content-generation rules, read:

**`docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`**

Also read the purpose/category lock:

**`docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`**

For daily CEO focus, money moves, offer-temperature routing, and the admin Command Center, read:

**`docs/business/SSELFIE_HIGHER_SELF_OPERATING_SYSTEM_2026-07-07.md`**

Its source files live in `docs/brand/source/2026-06-27/`.

The former Voice Bible, former content grounding doc, and old Studio marketing drafts have been removed from active guidance. Do not recreate or reuse them unless Sandra explicitly asks for historical context.

Core lock:
- SSELFIE is Sandra's category, not an AI photo tool: helping women stop hiding, become recognizable, know what to say, and build something of their own from their phone, their story, and AI.
- This was never just about selfies. It was about becoming visible enough to build something of your own.
- AI is not the hero. The woman is.
- The selfie is where we start. Visibility is where it leads.
- Low-ticket offers are bridges. Warm trust gets Visibility To Paid / Work With Me. SUITE is the monthly creation system.
- Daily operating rule: do the money move before opening a new build thread. One story, one offer bridge, one follow-up loop, one system improvement.
- Sandra writes like a real woman texting another woman: simple, warm, direct, human.
- Do not drift into generic AI/photo-tool, corporate personal-brand, or motivational-coach language.
- Do not use old Studio marketing drafts as current copy.

---

## Admin Data Contract (LOCKED 2026-06-11 — every agent must obey)

1. Every metric on an admin page or in an admin email must name its source: `Stripe`, `stripe_payments`, `subscriptions`, `analytics_events`, or `checkout_attribution`.
2. **Money (revenue, purchases, refunds, MRR) may ONLY come from `stripe_payments`** (`status IN ('succeeded','paid')`, `is_test_mode` excluded, windowed on `payment_date`) **or the live Stripe API.** Code that derives money from `analytics_events` or `checkout_attribution` is a data-correctness bug — fix or delete on sight.
3. **Member counts** may only come from `subscriptions` rows verified against Stripe (`lib/revenue/single-source.ts`) or Stripe directly. One-time products stored in `subscriptions` are "owners", never "members".
3b. **MRR is always NET of discounts.** Most current members hold a lifetime "BETA 50%" coupon (forever 50% off), so list-price math overstates MRR (e.g. $689 gross vs $393 net as of 2026-06-11). Discounts are documented in `subscriptions.discount_percent` / `discount_coupon` (synced by the Stripe webhook). Stripe API note: on apiVersion 2026-01-28.clover the coupon lives at `subscription.discounts[].source.coupon` and must be expanded (`expand: ["data.discounts.source.coupon"]`) — reading the legacy `subscription.discount` silently returns gross.
4. `analytics_events` is for **behavior only** (views, clicks, copies, opens). `checkout_attribution` is for **where buyers came from**, never how much they paid.
5. No new admin page, metric card, or admin email without removing or merging an existing one.
6. Admin layout: `/admin` home answers money → members → needs-me → next content move (data layer: `lib/admin/home-report.ts`). Nav is Home · Content · Support · Tools. The one daily email is the Daily Sandra Briefing; the weekly is the Content Brief; everything else is alert-only.
7. Full reasoning: `docs/audits/ADMIN_AUDIT_2026-06-11.md`.

---

## How This Repo Is Run

| Role | Tool | Responsibilities |
|------|------|-----------------|
| **Sandra** | Claude (Cowork) | Strategy, direction, approvals |
| **Claude (Cowork)** | This app | Brain — memory, specs, plans, content, guidance |
| **Codex / Cursor** | AI code agents | Code implementation — reads `tasks/`, writes `codex/` branches |

**No OpenClaw. No North. No Stella. Those systems are retired.** The last repo notifier and
Telegram shell are deleted, and the local zero-job OpenClaw gateway launch agent is disabled.

Claude (Cowork) writes task specs → Codex reads and implements → commits `codex/` branch → Sandra merges to `main`.

**App codebase path:** Sandra's selected folder in Cowork (mounted). Verify path with `pwd` when in doubt.

---

## Session Start — Always Do This First

1. Read `AS-BUILT.md` (repo facts, verified remotes)
2. Read this file (`CLAUDE.md`) for business context
3. Read `docs/CODEX_CONTEXT.md` for tech stack + file map
4. Check `tasks/` for active specs
5. Before creating, enabling, or debugging ANY automation: read `docs/AUTOMATION_ROSTER.md` —
   the single map of every automation across all layers (repo/Vercel, Claude Cowork, Codex app,
   ManyChat/Resend/Stripe) plus the lane rules for where new automations may live. Update it the
   same day anything changes. Core lane rule: customer/money automations live in the repo ONLY;
   Claude layer = drafts + watching only; Codex hosts no business automations.

---

## Current Priorities (July 2026)

### Growth Machine (locked 2026-07-12)

The current operating contract is
`docs/business/SSELFIE_GROWTH_MACHINE_2026-07-12.md`. It supersedes older funnel sequencing where
they conflict.

- `PROMPT` → $37 Prompt Vault → paid-buyer SUITE activation.
- `SELFIE` → $37 Starter Kit → paid-buyer SUITE activation.
- `WORK` → attended application pipeline → private €2,000 checkout.
- SUITE → first useful image → download → repeat creation → €97/month continuation.
- Presets remain a fulfilled secondary sale, not another primary front door.
- Selfie To Brand Shoot is historical-access-only; public sales and checkout are retired while paid
  buyer access and fulfillment remain protected.
- One commercial experiment at a time. AI measures, prioritizes, drafts, and monitors; it does not
  create parallel funnels or send attended high-value offers automatically.

### Forward Revenue Plan (superseded where it conflicts, 2026-07-01)

Historical foundation: `docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md`. Use the newer
Growth Machine contract for current routing.

Do not treat the whole audience as one buyer.

- **Cold top-of-funnel audience:** wants a simple selfie/AI-photo result. Sell the dedicated **Selfie To AI Photos Kit** as the obvious paid next step from viral selfie tutorials, AI reels, and ManyChat traffic. Code path and Production env exist; launch requires Claude/Sandra voice QA, merge/deploy, and a live checkout smoke.
- **Warm audience:** wants the deeper path. Build the immediate **Visibility To Paid Sprint** around women who already have skills, a story, a service, expertise, or an idea, but do not know what to post, what to say, or what they can sell first.
- **Prompt Vault:** stays the proven low-ticket buyer bridge. Do not expect it to carry the whole business alone.
- **SUITE / Studio:** stays the recurring core and monthly creation system.
- **Selfie To Brand Shoot:** historical buyer access only. Do not restore public promotion without a
  new measured decision.

Operating rule:

> Cold attention gets the Kit. Warm trust gets Visibility To Paid. Paid activation gets SUITE.

| Workstream | Status |
|------------|--------|
| BRIDGE-01 — one-time buyer -> SUITE member upgrade path | **✅ COMPLETE 2026-06-11** — all phases A-E live + backfill broadcast sent (20 delivered, 6 suppressed). Trial conversion shows on /admin home. Video tile on /join/studio waits for VIDEO-01. Spec: `tasks/BRIDGE-01-suite-bridge.md` |
| FUNNEL overhaul (8 moves, 2026-06-11) | **Built; narrowed 2026-07-12** — free AI Prompts and legacy free-guide leads no longer receive the no-card SUITE trial after the path produced 0/50 paid conversions. Paid Kit/Vault buyers still receive their included trial while the new activation scorecard measures that higher-intent cohort. Hourly `membership-checkout-recovery` returns abandoners to paid checkout (kill switch env `MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED`); homepage is prompt-first; vault drops sync into Library; trial day-0 email remains on claim. |
| TASK SPECS audit | **Updated 2026-06-13** — use `tasks/README.md` before choosing work. It separates active build queue, stale/completed specs, superseded plans, and gated planning docs. |
| MAYA-ADMIN-01 — Maya IS the admin content surface | **RETIRED — fully deleted 2026-07-09** (commit `30b0bd12`, same commit removed a "Post Now" tool). Admin Maya as a content surface does not exist in the running app; confirmed via the 2026-07-11 content-system audit. Shoot Studio + the three collapsed generator tools on `/admin/content-brief` are the one live surface now — don't plan around this spec, `tasks/MAYA-ADMIN-01-admin-maya.md` is historical only. |
| SHOOT-STUDIO-01 — inspiration-image photoshoots (the real engine; vault-anatomy prompt writer feeds it) | **Live, this is the core content engine** — shoots generate 6+ shots, publish to DB-backed Vault/freebie/Library/Maya surfaces automatically, and include drop-email preview/test/dry-run/send flow. Reads brand truth via the synced `lib/content/grounding.ts` snapshot. Spec: `tasks/SHOOT-STUDIO-01-admin-shoot-studio.md`. vault-prompt-writer skill recreated + COMMITTED at `.agents/skills/vault-prompt-writer/`. |
| MEMBER-CHECKOUT-01 — membership checkout email capture + payment-moment fixes. Spec: `tasks/MEMBER-CHECKOUT-01-email-capture.md` | **Complete/stale** — email capture, recovery cron, analytics, and tests are implemented. Stripe products renamed to "SSELFIE SUITE"/"SSELFIE SUITE Annual"; monthly charges €97 EUR (`price_1ThYxHEVJvME7vkw32NBHPXB`); old USD price kept active for existing subs. |
| ENTITLE-01 — audit access gates vs Stripe truth (subscriptions table has stale rows; 26 test-mode "active" membership rows found 2026-06-11) | **No active task spec found in `tasks/` during 2026-06-13 task audit** — create a fresh spec before assigning. |
| Weekly content brief drafted by Cowork (Sandra approves) | ✅ Real Monday run verified 2026-07-13; canonical payload validation now runs before storage/email. The retired repo content engine is deleted. |
| Support backlog triage (~34 old threads) | Approved |
| CONTENT-01 weekly brief + /admin/content-brief | ✅ Live 2026-06-10 |
| VOICE-01 copy cleanup batches 1-4a + check:voice guard | ✅ Live 2026-06-11 |
| ADMIN-01/02/03 truth-only admin rebuild | ✅ Live 2026-06-11 |
| Repo-hosted Instagram/ManyChat reply agent | **RETIRED AND REMOVED 2026-07-12** — Sandra chose to remove the inbox, inbound bridge, AI drafting, reply approvals, senders, reports, and unattended DM jobs because they created more confusion than value. ManyChat keyword marketing flows remain live. Inbox review is attended and on demand in the signed-in ManyChat inbox only. Historical customer-message tables remain for now and have no active runtime consumers. |
| Activation + Work With Me revenue lane | ✅ Built 2026-07-12 — `/admin/activation-funnel` reports the seven real app/trial activation and retention steps by source with honest measurement limits. `/admin/work-with-me` is the attended pipeline for applications, stages, notes, and private €2,000 checkout links; successful Stripe payment closes the matching application as won. Stored checkout links are verified with Stripe before copying and expired links are replaced idempotently. |
| Paid-buyer SUITE activation | ✅ Built 2026-07-12 — live Prompt Vault, Starter Kit, and AI Photos Kit purchases automatically start the buyer's one-ever included SUITE trial when her account is already known. Guest buyers keep the claim-token path. Test checkouts and duplicate webhooks cannot grant or email another trial. |
| Post-value review capture | ✅ Built 2026-07-12 — after a signed-in customer records her third SUITE download, App v3 may show one dismissible review request. Identity is server-derived, consent is explicit, submissions are unpublished until admin moderation, and the unsafe legacy feedback widget/routes are removed. Contract: `docs/product/SUITE_REVIEW_CAPTURE_2026-07-12.md`. |
| Payment + credential hardening | ✅ Completed 2026-07-12 — the new $39 Presets Bundle checkout was manually recovered and guest fulfillment now has regression coverage. Unresolved webhook reviews returned to zero. Publicly exposed Neon and Stripe webhook credentials were rotated/revoked, removed from tracked files, and protected by a secret-scan regression. |
| Behavioral growth-machine hardening | ✅ Completed 2026-07-13 — paid-buyer trials are a distinct Activation Funnel source; App v3 generation/download behavior carries stable persisted asset IDs; the approved Day-7 member reset targets one-day creators who stalled; the obsolete weekly engine, daily intelligence layer, Product QA reporter, newsletter poller, Brand Shoot recovery, North/OpenClaw notifier, and Telegram shell are deleted after dependency checks. |
| Maya Invisible AI first-result experience | ✅ Completed + simplified 2026-07-13 — returning Create leads with one personalized recommendation and a text escape hatch. **Start with one selfie** now commits photo + Maya decides, then goes selfie → one recommended concept without format/style/shot/director/source/extras/composer overwhelm. Old inspiration no longer silently attaches to fresh sessions. Successful browser download records value; one contextual next action continues the workflow; exact workspace state resumes; generation cannot spill into another chat. Contract: `docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md`. |
| DESIGN-01 convergence to Cool Editorial (audit done, build pending) | Planned — docs/audits/DESIGN_AUDIT_2026-06-10.md |
| Maya UX fixes (UX-01/02), Academy (ACADEMY-01/02) | Background — see tasks/ |

### Prompt Vault Funnel (active front door — locked May 26-27, 2026)

- Front-door demand is AI photo prompts: free `/ai-prompts` -> **Prompt Vault $37** (`/prompt-vault` -> `/checkout/prompt-vault`; $27 until the 2026-06-26 flash flip — live price module: `lib/launch/cash-launch-pricing.ts`). Positioning: "turn one selfie into unlimited photoshoots", never "learn prompts".
- **ManyChat PROMPT lock (updated 2026-06-30):** do not use numbered prompt keywords as the operating model. The live/default flow is `PROMPT` -> `/ai-prompts`, where the free page shows the latest five SSELFIE shoot previews. The old numbered prompt task is superseded history. Do not tell Sandra to wire `n={{last_text_input}}`, create per-number ManyChat keywords, or use `/p/latest` as the default PROMPT destination.
- **Do not drift back to the Starter Kit-first funnel.** Starter Kit is secondary support only.
- **Buyer psychology doctrine (LOCKED): `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` governs ALL copy, captions, UI text, emails, and Maya language.** Her fear: "people will think I'm fake" -> promise: "look elevated without feeling fake". Never imply viewers are fooled ("no one will know", "look rich", "fake photoshoot", "perfect face", "flawless skin"). Always: AI-assisted, realistic, recognizable, true-to-you, "still you". Signature: "AI should not erase you. It should frame you."
- Demand signal for next reel = prompt view/copy frequency (see /admin/content-brief).
- Ladder/source docs: `docs/funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`, segment rule `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md` (code: `lib/audience/ai-photoshoot-segment.ts`), membership reposition `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md` (do not build Vault Club until its gates pass), collections SOP `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`.
- Recovery crons: Prompt Vault + Starter Kit + membership only. Selfie To Brand Shoot recovery is
  retired. Nurture: `PROMPT_VAULT_NURTURE_ENABLED`.
- Legacy education ladder (Free Guide -> Starter Kit -> Masterclass -> SUITE) stays fulfilled for buyers but is NOT the growth funnel. History + details: `docs/CLAUDE_ARCHIVE_2026-06-11.md`.

---

## App v3 — THE live member app (cutover 2026-06-10, APP-CUTOVER-01)

**Members now use `/app` (Studio 3.0). Legacy `/studio` is retired but still in the repo.** Built via MAYA-REBUILD-03..17, merged to main, member access enabled via `APP_V3_MEMBERS_ENABLED=true` in Vercel prod (set 2026-06-10). Rollback = one env flip.

- Code: `app/app/` (route) · `components/app-v3/` (UI: maya-concierge, visual front door, concept cards, edit mode, gallery, reference library, account) · `lib/app-v3/` (persona, prompt compiler, ingredients) · `app/api/app-v3/` (maya/generate, maya/edit, upload-selfie, gallery, reference-library, account).
- **Image generation flagship: `gpt-image-2` (OpenAI API)** — `openai.images.edit` with the member's reference selfie attached; model switchable via `OPENAI_IMAGE_MODEL` env. **No training. No Replicate/Flux. No Nano Banana in v3.** Those belong to legacy `/studio` only.
- **Creation UX lock (2026-07-06):** Maya is the single owner of creation setup. The Create tab starts Maya only; it must not become a second studio with selfie, style, shot, text/font, trained-model, or manual format controls. Contract: `docs/product/SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md`.
- **First-result lock (2026-07-13):** returning Create shows one personalized recommendation and one direct text escape hatch. Maya chooses the default visual world, leads with one concept, records value only after a real download, and offers one contextual next action. Naming and brand questions stay out of the pre-value path. Contract: `docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md`.
- Stack questions: code wins over docs — check `app/api/app-v3/maya/generate/route.ts` first. Model landscape research: `docs/audits/SUITE_VALUE_AND_HOME_RESEARCH_2026-06-11.md`.

## Maya UX — Locked State (LEGACY `/studio` only — superseded by App v3 for members)
Source of truth: `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`

- Maya top tabs: **Photos**, **Videos**, **Train** only. No Feed tab. No new top tabs.
- Feed stays in Feed Planner until Maya feed ownership is rebuilt cleanly.
- No new `chat_type` values without DB migration + load/save/new-chat/test coverage.
- Landing pages, workbooks, and pro-photoshoot flows stay retired/hidden until rebuilt.

**⚠️ CRITICAL: Maya Feed Tab ≠ Feed Planner — DO NOT CONFUSE THESE**

| System | Status | What it is |
|--------|--------|-----------|
| **Feed Planner** (`app/feed-planner/`, `app/api/feed-planner/*`, `app/api/feed/*`) | ✅ LIVE — DO NOT DELETE | Paid Blueprint product. Paying users depend on it. Full 9-post grid, captions, strategy. |
| **Maya Feed Tab** (`components/sselfie/maya/maya-feed-tab.tsx`, `app/api/maya/feed*`) | ❌ DEAD — disabled via `isFeedTabDisabled = true` | A separate in-Maya feed tab. Hardcoded disabled. Routes are orphaned. Safe to delete. |
| **`lib/maya/feed-generation-handler.ts`** | ⚠️ SHARED — DO NOT DELETE | Used by BOTH the dead Maya tab AND the live Feed Planner hooks. Cannot be removed until Feed Planner is refactored. |

---

## The Maya Vision — North Star (DO NOT DRIFT FROM THIS)
*Locked 2026-03-03 — Sandra's words, verbatim*

**Maya IS the app. Not a feature. Not a chatbot on the side. Maya is the entire interface.**

Users never navigate. They just talk to their agent — and their agent surfaces everything they need, right there in the conversation.

### Interaction model refinement (Locked 2026-07-13 — supersedes "chat-first" for `/app`)
Maya stays the face and creative director, but the happy path is **Maya-guided and tap-first, optimized for completion, not conversation.** The customer is buying a useful brand result without having to learn prompts, formats, or workflows. Like a decisive creative director: "I chose this direction for what you need today."
- Primary interaction is **recommendation-led and visual**: one useful intent → Maya's chosen world → one concept → generate → download/use → one next visibility action. Zero typing is required to reach the core outcome.
- Chat is **refinement only**: "Want something different? Ask Maya." It must never be required to get value.
- Optional style, inspiration, shot, and trained-model controls remain available, but they do not block the default first result.
- This refines, does not abandon, the North Star: Maya is still the relationship. She uses memory and judgment before asking the member to navigate.

### The Experience
```
User: "I want to create a photo for my new offer"
Maya: "Let's do it. Do you want to use your uploaded selfies, train your custom model, or use the latest base model?"
→ three buttons appear inline in chat
User picks selfies
Maya: "Perfect. Drop them here" → upload zone appears inline
User uploads → Maya processes → generates photo
Maya: "Here it is. Want to add your product into this shot, or save it to your gallery?"
→ image shows in chat
```
No navigation. No "go to settings, click generate, find the upload button." The chat handles everything.

### What's Already Built (Proof of Concept)
- Maya's personality + system prompt (Anthropic streaming, in character)
- Brand profile context injected into every Maya response
- Style preferences and aesthetic defaults from wizard
- Image generation: see "App v3 — THE live member app" below. Flagship = gpt-image-2 (OpenAI). Legacy /studio stack (Nano Banana Pro "Pro mode" + Flux LoRA "Classic") still in repo but retired.
- **Concept cards** = the seed of the vision. `[GENERATE_CONCEPTS]` trigger → inline cards. This IS the pattern.
- Training pipeline, Gallery, Feed Planner, Academy (as tabs — intermediate step)

### The Three Missing Layers
1. **Tool dispatcher** — Maya needs a registry: `generate_image`, `upload_zone`, `show_gallery`, `save_to_gallery`, `build_feed_plan`, `show_brand_profile`. Intent → tool → inline component result.
2. **Inline component renderer** — chat bubble becomes a dynamic canvas: images, upload zones, action buttons, brand profile cards, feed previews — all rendered inside the conversation.
3. **Cross-session memory** — "This doesn't sound like me" persists forever. Brand profile fed into every session from `agent_profiles` table. What they've rejected. What they've loved.

### Named Agent (Personalisation)
Naming is available in Memory. It must not interrupt the first-result path. The optional short brand
interview may appear only after the member has used or downloaded a result. The name is stored in
`agent_profiles` and injected into later sessions.

### Build Order
The historical UX-first build order is superseded by the live App v3 contracts. Work from the
largest measured post-value constraint, preserve the one-recommendation first-result path, and do
not add a new tool, tab, or onboarding interruption without evidence that it improves visible,
trusted, or paid customer outcomes.

### The 5-Tab Rebuild: Intermediate Step, NOT the Destination
The 5-tab shell (Maya, Gallery, Feed Planner, Academy, Account) is **Phase B scaffolding.** Phase C collapses it — Gallery IS a Maya tool, Feed Planner IS a Maya tool. No tab router. One screen.
→ Do NOT get comfortable with 5 tabs as the final state.

### Pricing (Once Vision Is Live)
"The only AI that already knows your brand — and gets smarter every time you use it."
Target: €197/month minimum. Not €97. Not €27.

---

## Dead Code Map — Approved for Deletion
*Read this before touching any "cleanup" task. Many items look dead but are not.*

### ✅ Safe to delete — confirmed dead
| Item | Why dead |
|------|----------|
| `components/sselfie/maya/maya-feed-tab.tsx` | Feed tab hardcoded disabled (`isFeedTabDisabled = true`). |
| `app/api/maya/feed/` | Only called by the disabled Maya Feed Tab |
| `app/api/maya/feed-chat/` | Only called by the disabled Maya Feed Tab |
| `app/api/maya/feed-progress/` | Only called by the disabled Maya Feed Tab |
| `app/api/maya/generate-all-feed-prompts/` | Only called by the disabled Maya Feed Tab |
| `app/brand-engine/`, `app/apply/brand-engine/`, `app/brand-engine/vip/` | Brand Engine retired, no routes/redirects |
| `app/freebie/` | Routes redirect to paid pages; page files themselves are dead |
| `lib/feed-chat/history.ts` | No callers found anywhere in codebase |

### ⚠️ Looks dead but is NOT — do not delete
| Item | Why it's actually live |
|------|----------------------|
| `app/api/maya/generate-feed/` | Called by `components/sselfie/maya-chat-screen.tsx` — keep |
| `app/api/maya/generate-feed-prompt/` | Imported by the live Feed Planner single-post generation route — keep |
| `app/api/feed/*` (11 routes) | Actively called by `components/feed-planner/*` — core Feed Planner data layer |
| `lib/maya/feed-generation-handler.ts` | `FeedStrategy` type + `createFeedFromStrategyHandler` used by `lib/feed-planner/hooks/` |
| `lib/feed-planner-v2/` | Used in 4 active feed routes via `use_feed_planner_v2` per-user flag |
| `app/feed-planner/` entire directory | LIVE product — paying Blueprint users depend on this |
| `app/api/feed-planner/*` (12 routes) | Both systems active — feed-planner routes handle higher-level logic |

### 🔒 Never delete — business-critical
- `app/feed-planner/` — entire directory
- `app/api/feed-planner/` — entire directory
- `app/api/feed/` — entire directory
- `lib/feed-planner/` — entire directory
- `components/feed-planner/` — entire directory
- `lib/maya/feed-generation-handler.ts` — until Feed Planner refactor is done

---

## Payments architecture (WEBHOOK-01, 2026-06-10)

Stripe fulfillment is split out of the webhook monolith: `app/api/webhooks/stripe/route.ts` is
the dispatcher (verify -> route by event/product); per-product fulfillment lives in
`lib/payments/handlers/*` and subscription lifecycle in `lib/payments/lifecycle/*`, with shared
helpers in `lib/payments/shared.ts`. Every extraction was verbatim and byte-proven. When touching
ANY payment behavior: edit the handler module, never re-inline into the route. Money numbers come
from `stripe_payments` / Stripe API only — never analytics events.

## Technical Constants (Use These — Don't Guess)

| What | Value |
|------|-------|
| Resend Main Audience ID | `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd` |
| Resend total contacts | 7,857 in Main Audience (7,059 subscribed, 798 unsubscribed) — verified via full Resend API pagination 2026-07-09; re-verify before broadcasts |
| Neon DB users | 603 unique emails (verified 2026-03-02) |
| Studio checkout URL | `https://sselfie.ai/checkout/membership` |
| Feed Planner checkout | `https://sselfie.ai/checkout/blueprint` |
| Selfie Guide checkout URL | RETIRED 2026-06-11 — redirects to free `/selfie-guide` |
| Selfie Guide access URL | `https://sselfie.ai/selfie-guide/access/[token]` |
| AI Prompts free opt-in URL | `https://sselfie.ai/ai-prompts` |
| AI Prompts free access URL | `https://sselfie.ai/ai-prompts/access/[token]` |
| Prompt Vault landing URL | `https://sselfie.ai/prompt-vault` |
| Prompt Vault checkout URL | `https://sselfie.ai/checkout/prompt-vault` |
| Prompt Vault access URL | `https://sselfie.ai/access/prompt-vault/[token]` |
| Prompt Vault Academy access URL | `https://sselfie.ai/academy/access/prompt-vault` |
| Starter Kit landing URL | `https://sselfie.ai/starter-kit` |
| Starter Kit checkout URL | `https://sselfie.ai/checkout/starter-kit` |
| Starter Kit access URL | `https://sselfie.ai/access/starter-kit/[token]` |
| Masterclass landing URL | `https://sselfie.ai/masterclass` |
| Masterclass checkout URL | `https://sselfie.ai/checkout/masterclass` |
| Studio join URL | `https://sselfie.ai/join/studio` |
| Work With Me URL | `https://sselfie.ai/work-with-me` |
| Brand Strategy landing URL | RETIRED — `/brand-strategy` redirects to `/masterclass` |
| Brand Strategy checkout URL | RETIRED — redirects to `/checkout/masterclass` |
| Brand Strategy setup URL | `https://sselfie.ai/brand-strategy/setup/[setupToken]` |
| Brand Strategy result URL | `https://sselfie.ai/strategy/[accessToken]` |
| Blueprint price ID | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| Stripe portal config | `bpc_1SRX2wEVJvME7vkwu0rlIgfW` |
| Vercel Blob token | In `.env.local` as `BLOB_READ_WRITE_TOKEN` |
| Supabase | `https://rnnqqkidsoojtsmqqbyw.supabase.co` — **AUTH ONLY** (not data) |
| Database | **Neon** (PostgreSQL) — all app data: users, subscriptions, email_logs, etc. |
| File storage | Vercel Blob — Supabase buckets are EMPTY, do not use |

---

## Resend Segments (verified via API 2026-06-11)

| Segment | Count | Notes |
|---------|-------|-------|
| Main Audience | 7,857 (7,059 subscribed) — re-verified 2026-07-09 | ✅ Use for all broadcasts |
| AI Photoshoot Audience | 2,798 (2,701 subscribed) | Prompt-funnel segment — count from 2026-06-11, not re-verified |
| Cold Users | 2,754 (2,556 subscribed) | Imported/cold — low engagement expected — count from 2026-06-11, not re-verified |
| Brand Blueprint (legacy) | 901 | Legacy freebie downloaders — no new entries — count from 2026-06-11, not re-verified |
| Paid users | 100 | ⚠️ MIXED: one-time + beta + Studio members — count from 2026-06-11, not re-verified |
| Beta Customers | 73 | Old beta pricing (€47/€79/€99) — count from 2026-06-11, not re-verified |

Resend also holds ~60 mechanical "Sequence:"/"Sequence History:" audiences (cron plumbing) — ignore for marketing counts.
DB↔Resend sync state (2026-06-11): DB union of email tables = 6,795 distinct; 241 DB-only (tests/invalid/old imports, zero real paying customers), 35 Resend-only (manual imports). No paying customer is missing from Main Audience. This sync check has not been re-run since — only the Main Audience total/subscribed count above was refreshed on 2026-07-09.

**Always send to Main Audience for full-list broadcasts — NOT smaller segments**

---

## Pricing & Products

| Product | Price | Status | Notes |
|---------|-------|--------|-------|
| AI Prompts | Free | ✅ Active front-door lead magnet | Prompt reels -> email capture -> `/ai-prompts/access/[token]` |
| AI Photo Prompt Vault | $37 (was $27 until the 2026-06-26 flash flip) | ✅ Active low-ticket bridge | Proven buyer activation product. Do not expect it to carry the whole business alone. |
| Selfie To AI Photos Kit | $37 | ✅ Active; production checkout verified 2026-07-11 | Dedicated product for viral selfie/AI traffic: one clear selfie -> AI photos that still look like her. Uses its own product key, checkout, access page, delivery email, and webhook handler. |
| Selfie Guide | Free | ✅ Free lead magnet ONLY (paid tier killed 2026-06-11) | `/selfie-guide` opt-in → token access. Paid checkout redirects to free page; fulfillment for past €17/€27 buyers intact. ⚠️ Follower reported guide content outdated — content refresh pending. |
| Starter Kit | $37 | ⚠️ Secondary/support only | Not the primary prompt-funnel upgrade. Keep fulfillment for buyers. |
| Masterclass | $147 | ✅ Active, 14 published lessons | Lessons 15-17 (Offer Map, Content-To-Cash, 30-Day Sprint) to be built as interactive lessons — drafts pending Sandra approval. Bundles Brand Strategy tool. |
| SUITE membership | €97/mo | ✅ Active | Cancel anytime. No landing page yet (BRIDGE-01 scope). **Includes ALL one-time products (D3, 2026-06-11)**: flags in `academy_products` DB table (DB wins) + `lib/academy-entitlements.ts` defaults. |
| Visibility To Paid Sprint | €2,000 or 2 × €1,100 | ✅ Active application offer; decision locked 2026-07-11 | Private two-week build/prep plus four-week sprint. Uses the existing Work With Me application, personal review, fit call, and attended payment-link path. No passive checkout. |
| Brand Strategy Pack | $19 | ❌ Retired standalone (2026-06-11 verified) | `/brand-strategy` + its checkout redirect to Masterclass; tool bundled into Masterclass. Selfie Guide order-bump path still fulfills. |
| Feed Planner | See blueprint | ✅ Active | `paid_blueprint` type |
| Mini-products (4) | DEACTIVATED | ❌ | Prices set `active=false`. Become free workbooks in Academy |
| Website Agent V1 | €27/mo | 🔒 Planned | Standalone, not bundled — on hold |

**⚠️ NO FREEBIE PRODUCTS** — all entry points are paid. `/freebie/*` routes redirect to paid pages.

**Mini-product price IDs (deactivated — do not reactivate):**
- What To Say: `price_1T2xljEVJvME7vkwFcaN1GEw`
- Show Up: `price_1T2xllEVJvME7vkwHC3r6GAI`
- Get Paid: `price_1T2xlmEVJvME7vkwkbgotHoB`
- AI Photo Prompts: `price_1T3aR3EVJvME7vkw6pzbZS9m`

---

## Email History (compact)

- One daily admin email (Daily Sandra Briefing, 06:15) + Monday content brief + alert-only exceptions — see Admin Data Contract.
- May 26, 2026: Prompt Vault locked as the primary paid bridge from AI prompt demand.
- Customer lifecycle: `nurture-sequence` cron owns Free Guide/Starter Kit/Masterclass lifecycle; vault nurture env-gated.
- Older history: `docs/CLAUDE_ARCHIVE_2026-06-11.md`.

---
## Sandra's Preferences

- **Voice:** Text a close friend. Warm, honest, short sentences. Contractions always.
- **Never say:** leverage, synergy, transform, game-changer, skyrocket, unlock your potential
- **Never write:** m-dashes (—) in any copy, button labels, or eyebrows. Use a period, a colon, or a middle dot `·` for price separators instead.
- **Images:** Always Sandra's own. Never stock photos. Ask Sandra for images.
- **Approvals:** Sandra must approve ALL copy before sending. No autonomous sends.

→ Skills in Cowork: `sselfie-voice`, `scandinavian-design`, `instagram-strategy`, `tiktok-strategy`

### Design System — Single Contract (updated 2026-05-21)
*Single visual + product UI source of truth: `docs/SSELFIE_DESIGN_SYSTEM.md`. If anything here differs from that file, `docs/SSELFIE_DESIGN_SYSTEM.md` wins immediately.*

| Token | Value | Usage |
|-------|-------|-------|
| `obsidian` | `#0A0A0A` | Primary dark surface, primary text on light |
| `porcelain` | `#FFFFFF` | Clean white surfaces and text on dark |
| `pearl` | `#F5F5F5` | Secondary backgrounds and soft card fills |
| `smoke` | `#666666` | Body text, captions, secondary copy |
| `whisper` | `#E5E5E5` | Borders, dividers, subtle separators |
| `stone` | `#8A8780` | Muted labels and metadata |
| `stoneDark` | `#2C2B29` | Dark gray text/panels when pure black is too strong |
| `stoneSoft` | `#D4D1CC` | Soft gray borders and quiet fills |

**Fonts:** Cormorant Garamond or approved editorial serif for display/headings. Neue Einstellung or approved clean sans for body/UI. Inter remains acceptable in existing app UI until a planned typography pass replaces it safely.

**Rules that never bend (mirrors `docs/SSELFIE_DESIGN_SYSTEM.md`):**
- Rounded product UI stays. Do not apply zero-radius globally.
- Light luxury editorial is the current direction. Do not default to dark-first templates.
- Avoid glassmorphism, random translucent card effects, and generic SaaS UI.
- No gradients on buttons and no gradient text.
- Gold accent `#c9a96e` is retired and must not be reintroduced.
- No new colors, fonts, icons, emojis, or token systems without Sandra approval.
