# SSELFIE Operational Memory
*Last updated: 2026-06-11 — Read this at the start of every session*

---

## Me — Sandra (The Selfie Queen)
Founder of SSELFIE Studio. Single mother, Iceland/Norway. ~30 active paying customers, 180K+ followers, 3K+ email list. Building AI-powered personal branding platform. Live at **sselfie.ai**.

**For current MRR + exact paying counts — always pull from Stripe. Don't trust stale numbers in docs.**

---

## Admin Data Contract (LOCKED 2026-06-11 — every agent must obey)

1. Every metric on an admin page or in an admin email must name its source: `Stripe`, `stripe_payments`, `subscriptions`, `analytics_events`, or `checkout_attribution`.
2. **Money (revenue, purchases, refunds, MRR) may ONLY come from `stripe_payments`** (`status IN ('succeeded','paid')`, `is_test_mode` excluded, windowed on `payment_date`) **or the live Stripe API.** Code that derives money from `analytics_events` or `checkout_attribution` is a data-correctness bug — fix or delete on sight.
3. **Member counts** may only come from `subscriptions` rows verified against Stripe (`lib/revenue/single-source.ts`) or Stripe directly. One-time products stored in `subscriptions` are "owners", never "members".
3b. **MRR is always NET of discounts.** Most current members hold a lifetime "BETA 50%" coupon (forever 50% off), so list-price math overstates MRR (e.g. $689 gross vs $393 net as of 2026-06-11). Discounts are documented in `subscriptions.discount_percent` / `discount_coupon` (synced by the Stripe webhook). Stripe API note: on apiVersion 2026-01-28.clover the coupon lives at `subscription.discounts[].source.coupon` and must be expanded (`expand: ["data.discounts.source.coupon"]`) — reading the legacy `subscription.discount` silently returns gross.
4. `analytics_events` is for **behavior only** (views, clicks, copies, opens). `checkout_attribution` is for **where buyers came from**, never how much they paid.
5. No new admin page, metric card, or admin email without removing or merging an existing one.
6. Admin layout: `/admin` home answers money → members → needs-me → next content move (data layer: `lib/admin/home-report.ts`). Nav is Home · Inbox · Content · Support · Tools. The one daily email is the Daily Sandra Briefing; the weekly is the Content Brief; everything else is alert-only.
7. Full reasoning: `docs/audits/ADMIN_AUDIT_2026-06-11.md`.

---

## How This Repo Is Run

| Role | Tool | Responsibilities |
|------|------|-----------------|
| **Sandra** | Claude (Cowork) | Strategy, direction, approvals |
| **Claude (Cowork)** | This app | Brain — memory, specs, plans, content, guidance |
| **Codex / Cursor** | AI code agents | Code implementation — reads `tasks/`, writes `codex/` branches |

**No OpenClaw. No North. No Stella. Those systems are retired.**

Claude (Cowork) writes task specs → Codex reads and implements → commits `codex/` branch → Sandra merges to `main`.

**App codebase path:** Sandra's selected folder in Cowork (mounted). Verify path with `pwd` when in doubt.

---

## Session Start — Always Do This First

1. Read `AS-BUILT.md` (repo facts, verified remotes)
2. Read this file (`CLAUDE.md`) for business context
3. Read `docs/CODEX_CONTEXT.md` for tech stack + file map
4. Check `tasks/` for active specs

---

## Current Priorities (June 2026)

| Workstream | Status |
|------------|--------|
| BRIDGE-01 — one-time buyer -> SUITE member upgrade path | **✅ COMPLETE 2026-06-11** — all phases A-E live + backfill broadcast sent (20 delivered, 6 suppressed). Trial conversion shows on /admin home. Video tile on /join/studio waits for VIDEO-01. Spec: `tasks/BRIDGE-01-suite-bridge.md` |
| ENTITLE-01 — audit access gates vs Stripe truth (subscriptions table has stale rows) | **Next up (approved)** |
| Weekly newsletter drafted by Content Engine (Sandra approves) | Approved |
| Support backlog triage (~34 old threads) | Approved |
| CONTENT-01 weekly brief + /admin/content-brief | ✅ Live 2026-06-10 |
| VOICE-01 copy cleanup batches 1-4a + check:voice guard | ✅ Live 2026-06-11 |
| ADMIN-01/02/03 truth-only admin rebuild | ✅ Live 2026-06-11 |
| DM-RELIEF-01 ManyChat DM bridge + ig-inbox triage | ✅ Live 2026-06-10 |
| DESIGN-01 convergence to Cool Editorial (audit done, build pending) | Planned — docs/audits/DESIGN_AUDIT_2026-06-10.md |
| Maya UX fixes (UX-01/02), Academy (ACADEMY-01/02) | Background — see tasks/ |

### Prompt Vault Funnel (active front door — locked May 26-27, 2026)

- Front-door demand is AI photo prompts: free `/ai-prompts` -> **Prompt Vault $27** (`/prompt-vault` -> `/checkout/prompt-vault`). Positioning: "turn one selfie into unlimited photoshoots", never "learn prompts".
- **Do not drift back to the Starter Kit-first funnel.** Starter Kit is secondary support only.
- **Buyer psychology doctrine (LOCKED): `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` governs ALL copy, captions, UI text, emails, and Maya language.** Her fear: "people will think I'm fake" -> promise: "look elevated without feeling fake". Never imply viewers are fooled ("no one will know", "look rich", "fake photoshoot", "perfect face", "flawless skin"). Always: AI-assisted, realistic, recognizable, true-to-you, "keeps your face". Signature: "AI should not erase you. It should frame you."
- Demand signal for next reel = prompt view/copy frequency (see /admin/content-brief).
- Ladder/source docs: `docs/funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`, segment rule `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md` (code: `lib/audience/ai-photoshoot-segment.ts`), membership reposition `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md` (do not build Vault Club until its gates pass), collections SOP `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`.
- Recovery crons: prompt-vault + starter-kit + selfie-to-brand-shoot checkout recovery (env-gated). Nurture: `PROMPT_VAULT_NURTURE_ENABLED`.
- Legacy education ladder (Free Guide -> Starter Kit -> Masterclass -> SUITE) stays fulfilled for buyers but is NOT the growth funnel. History + details: `docs/CLAUDE_ARCHIVE_2026-06-11.md`.

---

## App v3 — THE live member app (cutover 2026-06-10, APP-CUTOVER-01)

**Members now use `/app` (Studio 3.0). Legacy `/studio` is retired but still in the repo.** Built via MAYA-REBUILD-03..17, merged to main, member access enabled via `APP_V3_MEMBERS_ENABLED=true` in Vercel prod (set 2026-06-10). Rollback = one env flip.

- Code: `app/app/` (route) · `components/app-v3/` (UI: maya-concierge, visual front door, concept cards, edit mode, gallery, reference library, account) · `lib/app-v3/` (persona, prompt compiler, ingredients) · `app/api/app-v3/` (maya/generate, maya/edit, upload-selfie, gallery, reference-library, account).
- **Image generation flagship: `gpt-image-2` (OpenAI API)** — `openai.images.edit` with the member's reference selfie attached; model switchable via `OPENAI_IMAGE_MODEL` env. **No training. No Replicate/Flux. No Nano Banana in v3.** Those belong to legacy `/studio` only.
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

### Interaction model refinement (Locked 2026-06-09 — supersedes "chat-first" for /app)
Maya stays the face and creative director, but the happy path is **Maya-guided and tap-first, optimized for completion, not conversation.** The customer is buying "give me amazing brand photos without having to think," which is a workflow problem, not a conversation problem. Like a high-end stylist: "I pulled three looks for you. Which feels most like you?"
- Primary interaction is **selection-based and visual**: look → format → concept → generate → use. Zero typing required to reach the core outcome.
- Chat is **refinement only**: "Want something different? Ask Maya." It must never be required to get value.
- Distinction: ❌ chat-first ("talk to Maya to figure out what to create") vs ✅ Maya-guided ("Maya already pulled options, I just pick what I like"). The second is closer to luxury.
- This refines, does not abandon, the North Star: Maya is still everywhere and still the relationship. She just leads with curated taps instead of a blank prompt.

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
First open: Maya asks "What do you want to call me?" → user names their AI (e.g. Aria).
That name is stored in `agent_profiles`, injected every session. This creates **ownership** — people don't cancel relationships.

### Build Order
1. Fix Maya UX bugs (active — see tasks/UX-01, UX-02)
2. Expand tool registry: `show_gallery` + `save_to_gallery` first (tests dispatcher pattern cheaply)
3. Named agent + richer onboarding conversation (replaces wizard with Maya interviewing the user)
4. Phase C: collapse 5-tab navigation into Maya tools (tabs become what Maya surfaces, not separate screens)

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
| ~~app/api/maya/generate-feed~~ | **NOT DEAD (corrected 2026-06-10):** called by `components/sselfie/maya-chat-screen.tsx` — keep |

| `app/api/maya/generate-feed-prompt/` | Only called by the disabled Maya Feed Tab |
| `app/api/maya/generate-all-feed-prompts/` | Only called by the disabled Maya Feed Tab |
| `app/brand-engine/`, `app/apply/brand-engine/`, `app/brand-engine/vip/` | Brand Engine retired, no routes/redirects |
| `app/freebie/` | Routes redirect to paid pages; page files themselves are dead |
| `lib/feed-chat/history.ts` | No callers found anywhere in codebase |

### ⚠️ Looks dead but is NOT — do not delete
| Item | Why it's actually live |
|------|----------------------|
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
| Resend total contacts | 6,589 in Main Audience (6,295 subscribed) — verified via API 2026-06-11; re-verify before broadcasts |
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
| Main Audience | 6,589 (6,295 subscribed) | ✅ Use for all broadcasts |
| AI Photoshoot Audience | 2,798 (2,701 subscribed) | Prompt-funnel segment |
| Cold Users | 2,754 (2,556 subscribed) | Imported/cold — low engagement expected |
| Brand Blueprint (legacy) | 901 | Legacy freebie downloaders — no new entries |
| Paid users | 100 | ⚠️ MIXED: one-time + beta + Studio members |
| Beta Customers | 73 | Old beta pricing (€47/€79/€99) |

Resend also holds ~60 mechanical "Sequence:"/"Sequence History:" audiences (cron plumbing) — ignore for marketing counts.
DB↔Resend sync state (2026-06-11): DB union of email tables = 6,795 distinct; 241 DB-only (tests/invalid/old imports, zero real paying customers), 35 Resend-only (manual imports). No paying customer is missing from Main Audience.

**Always send to Main Audience for full-list broadcasts — NOT smaller segments**

---

## Pricing & Products

| Product | Price | Status | Notes |
|---------|-------|--------|-------|
| AI Prompts | Free | ✅ Active front-door lead magnet | Prompt reels -> email capture -> `/ai-prompts/access/[token]` |
| AI Photo Prompt Vault | $27 | ✅ Active low-ticket offer, launch next | Primary paid upgrade from AI Prompts. ChatGPT-ready editorial photoshoot prompts. |
| Selfie Guide | Free | ✅ Free lead magnet ONLY (paid tier killed 2026-06-11) | `/selfie-guide` opt-in → token access. Paid checkout redirects to free page; fulfillment for past €17/€27 buyers intact. ⚠️ Follower reported guide content outdated — content refresh pending. |
| Starter Kit | $37 | ⚠️ Secondary/support only | Not the primary prompt-funnel upgrade. Keep fulfillment for buyers. |
| Masterclass | $147 | ✅ Active, 14 published lessons | Lessons 15-17 (Offer Map, Content-To-Cash, 30-Day Sprint) to be built as interactive lessons — drafts pending Sandra approval. Bundles Brand Strategy tool. |
| SUITE membership | €97/mo | ✅ Active | Cancel anytime. No landing page yet (BRIDGE-01 scope). **Includes ALL one-time products (D3, 2026-06-11)**: flags in `academy_products` DB table (DB wins) + `lib/academy-entitlements.ts` defaults. |
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
