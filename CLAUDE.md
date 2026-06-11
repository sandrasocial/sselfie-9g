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

## Current Priorities (April 2026)

| Task file | Topic | Status |
|-----------|-------|--------|
| `tasks/UX-01-maya-classic-ux-fixes.md` | Maya Classic UX fixes | Active |
| `tasks/UX-02-maya-pro-mode-ux-audit.md` | Maya Pro mode UX audit | Active |
| `tasks/UX-02-maya-pro-mode-ux-fixes.md` | Maya Pro mode fixes | Active |
| `tasks/E-01-fix-subscriber-count-and-mismatch-guard.md` | Subscriber count fix + guard | Active |
| `tasks/ACADEMY-01-foundation.md` | Academy foundation | Planned |
| `tasks/ACADEMY-02-CODEX-SPEC.md` | Academy Codex spec | Planned |

### Prompt Vault Pivot (May 26-27, 2026)

**Current growth signal:** Instagram and email behavior show people want instant AI photoshoot transformations from one selfie, not another selfie education starter product and not a generic "prompt collection."

**Do not drift back to the old Starter Kit-first funnel.** Starter Kit has been tested for weeks and has sold weakly (7 total reported by Sandra; live Neon shows 6 active Starter Kit records and Stripe payment tracking is incomplete). The audience is asking for AI photo prompts. The front-end offer should follow that demand.

- New low-ticket offer: **AI Photo Prompt Vault** (`prompt_vault`) — $27.
- Positioning: **"turn one selfie into unlimited photoshoots."** Avoid positioning it as "learn prompts" or a static prompt pack.
- New funnel/product ladder source of truth: `docs/funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`.
- Free lead magnet: `/ai-prompts` and token access at `/ai-prompts/access/[token]`.
- Primary upgrade from the free AI prompts product: `/prompt-vault` -> `/checkout/prompt-vault` -> `/access/prompt-vault/[token]`.
- Academy/library access: `/academy/access/prompt-vault`.
- Delivery email: `lib/email/templates/prompt-vault-delivery.ts`.
- Buyer-success nurture drafts: `lib/email/templates/prompt-vault-buyer-sequence.ts`, scheduled by `app/api/cron/nurture-sequence/route.ts` only when `PROMPT_VAULT_NURTURE_ENABLED=true`.
- Launch monitor: `/admin/prompt-vault` tracks Prompt Vault visits, free-to-vault clicks, checkout starts, purchases, access opens, prompt views, and prompt copies.
- Attribution priority: preserve `source`, UTM params, `entry_post_slug`, `cta_keyword`, and `buyer_stage` from reels, ManyChat, email, and free prompt bridges into `/checkout/prompt-vault`.
- **Buyer psychology doctrine (LOCKED 2026-06-10): `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` governs ALL copy, captions, UI text, emails, carousels, and Maya language.** Core: her fear is "people will think I'm fake," so the promise is "look elevated without feeling fake." AI = creative direction around the real her, never deception. Never write copy implying viewers are fooled ("no one will know", "look rich", "fake photoshoot", "perfect face", "flawless skin"). Always: AI-assisted, realistic, recognizable, tasteful, true-to-you, "keeps your face." Signature line: "AI should not erase you. It should frame you."
- Buyer behavior priority: use prompt view/copy frequency as the demand signal for the next "PROMPT MY SELFIE" reel. Current strongest aesthetic signal is Dark Balcony / Reel Cover Hero.
- Checkout recovery: abandoned Prompt Vault checkouts are handled by `/api/cron/prompt-vault-checkout-recovery`, gated by `PROMPT_VAULT_CHECKOUT_RECOVERY_ENABLED=true`.
- AI audience segmentation: use **AI Photoshoot Audience** as the clean business segment for AI prompt opt-ins, Prompt Vault buyers, checkout abandoners, access openers, prompt copiers, and ManyChat prompt-reel leads. Canonical rule: `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md`; code source: `lib/audience/ai-photoshoot-segment.ts`; Resend env: `RESEND_SEGMENT_AI_PHOTOSHOOT_AUDIENCE`.
- Launch broadcast draft: `docs/email/PROMPT_VAULT_LAUNCH_BROADCAST_DRAFT_2026-05-26.md` — Sandra must approve before any send.
- SOP for adding new collections: `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`.
- Membership reposition plan: `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md`. Working direction is SSELFIE Vault Club: weekly AI photoshoot transformation drops, seasonal collections, creator challenges, and referral/community loop. Do not build the subscription until validation gates in that doc are met.
- Starter Kit is no longer the primary next step from AI prompts. It may remain as a secondary support product only when clearly framed as "make the original selfie stronger before AI."

### Selfie Education Reposition (April 23, 2026 — Superseded For Front-Door Growth)

- Approved direction: `docs/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`
- Old public ladder: Free Selfie Guide -> Starter Kit ($37) -> Masterclass ($147) -> Studio (€97/mo) -> 1:1
- Status: keep routes and fulfillment working for existing buyers, but do not treat this as the active front-door growth funnel.
- Lifecycle owner: `app/api/cron/nurture-sequence/route.ts`
- Delivery model:
  - Free Guide -> `freebie_subscribers` token -> `/selfie-guide/access/[token]`
  - Starter Kit -> tokenized access route at `/access/starter-kit/[token]`
  - Masterclass -> Academy entitlement + lifecycle delivery
- Public marketing routes now live in repo: `/starter-kit`, `/masterclass`, `/join/studio`, `/work-with-me`
- Checkout routes now live in repo: `/checkout/starter-kit`, `/checkout/masterclass`
- Keep outbound copy draft-safe until Sandra approves final launch copy and ops confirms production env vars

### Selfie Guide Status (April 2026)

- `tasks/SELFIE-GUIDE-02-phase-b.md` — **Implemented** (chapter flow, challenge tracking + Day 14 trigger, Maya preview API, analytics API + admin UI, email templates)
- Remaining polish is content/ops validation (real before/after assets swap, end-to-end smoke checks in prod-like environment)

### Academy Library Status (April 23, 2026)

- `tasks/ACADEMY-03-course-library-ui.md` — **Implemented on `codex/academy-course-library`**
- `/academy` is now the authenticated course library, not the old mini-product wall
- New surfaces:
  - `/academy/courses/[courseId]`
  - `/academy/courses/[courseId]/lessons/[lessonId]`
  - `/api/academy/lessons/[lessonId]/notes`
- Lesson companion data is seeded into `academy_lessons.content`
- New per-user lesson state table: `user_lesson_notes`
- Maya profile sync from Academy lessons writes into `user_personal_brand` for whitelisted brand fields

**Completed sprints (do not re-open):**
- V-02 Full Funnel Hardening ✅ (2026-03-09)
- Maya UX Stabilization ✅ (2026-03-11, commit `b950f1db`)

---

## Maya UX — Locked State (DO NOT REVERSE)
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
- Classic generation (Flux LoRA / custom model) + Pro generation (NanoBanana Pro)
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
| Resend total contacts | ~3,082 (2,954 subscribers) — re-verify before broadcasts |
| Neon DB users | 603 unique emails (verified 2026-03-02) |
| Studio checkout URL | `https://sselfie.ai/checkout/membership` |
| Feed Planner checkout | `https://sselfie.ai/checkout/blueprint` |
| Selfie Guide checkout URL | `https://sselfie.ai/checkout/selfie-guide` |
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
| Brand Strategy landing URL | `https://sselfie.ai/brand-strategy` ($19 paid) |
| Brand Strategy checkout URL | `https://sselfie.ai/checkout/brand-strategy-pack` |
| Brand Strategy setup URL | `https://sselfie.ai/brand-strategy/setup/[setupToken]` |
| Brand Strategy result URL | `https://sselfie.ai/strategy/[accessToken]` |
| Blueprint price ID | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| Stripe portal config | `bpc_1SRX2wEVJvME7vkwu0rlIgfW` |
| Vercel Blob token | In `.env.local` as `BLOB_READ_WRITE_TOKEN` |
| Supabase | `https://rnnqqkidsoojtsmqqbyw.supabase.co` — **AUTH ONLY** (not data) |
| Database | **Neon** (PostgreSQL) — all app data: users, subscriptions, email_logs, etc. |
| File storage | Vercel Blob — Supabase buckets are EMPTY, do not use |

---

## Resend Segments (Current State)

| Segment | Count | Notes |
|---------|-------|-------|
| Main Audience | ~2,965 | ✅ Use for all broadcasts |
| Brand Blueprint (legacy) | ~892 | Legacy freebie downloaders — no new entries |
| Paid users | 93 | ⚠️ MIXED: one-time + beta + Studio members |
| Beta Customers | 73 | Old beta pricing (€47/€79/€99) |

**Always send to Main Audience for full-list broadcasts — NOT smaller segments**

---

## Pricing & Products

| Product | Price | Status | Notes |
|---------|-------|--------|-------|
| AI Prompts | Free | ✅ Active front-door lead magnet | Prompt reels -> email capture -> `/ai-prompts/access/[token]` |
| AI Photo Prompt Vault | $27 | ✅ Active low-ticket offer, launch next | Primary paid upgrade from AI Prompts. ChatGPT-ready editorial photoshoot prompts. |
| Free Selfie Guide | Free | 🚧 Reposition in progress | Lead magnet + email capture front door |
| Starter Kit | $37 | ⚠️ Secondary/support only | Not the primary prompt-funnel upgrade. Keep fulfillment for buyers. |
| Masterclass | $147 | 🚧 Reposition in progress | One-time. Academy-style fulfillment planned |
| Studio membership | €97/mo | ✅ Active | Cancel anytime |
| Selfie Guide | €17 | ✅ Active | Interactive course, token access flow |
| Selfie Guide Bundle | €27 | ✅ Active | Guide + extras |
| Brand Strategy Pack | $19 | ✅ Active | Pay → questionnaire → Maya generates → `/strategy/[token]` |
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

## Email History

- Studio membership had NEVER had a dedicated broadcast before Feb 28, 2026
- Feb 28, 2026: First Studio membership email — Broadcast ID `8cacda39-7495-47a6-8505-c6985df7eaeb`
- Mar 02, 2026: SEQ-01 Nurture sequence approved (5 emails, Day 2/5/9/14/20 for Selfie Guide buyers) — templates renamed `nurture-strategy-n*.ts`
- Mar 09, 2026: Legacy manual/scheduled campaign stack removed from repo. Only live email paths remain.
- Apr 23, 2026: Selfie education ladder approved. `nurture-sequence` now owns draft lifecycle for Free Guide -> Starter Kit -> Masterclass plus the legacy Brand Strategy follow-up until checkout/webhook migration completes.
- May 26, 2026: Growth pivot documented. Prompt Vault is the primary paid bridge from AI prompt demand. Do not promote Starter Kit as the main AI prompts upgrade unless Sandra explicitly reverses this decision.

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
