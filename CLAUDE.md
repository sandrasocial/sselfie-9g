# SSELFIE Operational Memory
*Last updated: 2026-04-09 — Read this at the start of every session*

---

## Me — Sandra (The Selfie Queen)
Founder of SSELFIE Studio. Single mother, Iceland/Norway. ~30 active paying customers, 180K+ followers, 3K+ email list. Building AI-powered personal branding platform. Live at **sselfie.ai**.

**For current MRR + exact paying counts — always pull from Stripe. Don't trust stale numbers in docs.**

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

### Selfie Education Reposition (April 23, 2026)

- Approved direction: `docs/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`
- New public ladder: Free Selfie Guide -> Starter Kit ($37) -> Masterclass ($147) -> Studio (€97/mo) -> 1:1
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
| `app/api/maya/generate-feed/` | Only called by the disabled Maya Feed Tab |
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
| Free Selfie Guide | Free | 🚧 Reposition in progress | Lead magnet + email capture front door |
| Starter Kit | $37 | 🚧 Reposition in progress | One-time. Tokenized delivery path planned |
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

---

## Sandra's Preferences

- **Voice:** Text a close friend. Warm, honest, short sentences. Contractions always.
- **Design:** Scandinavian luxury. 5 colors only (#0a0a0a, #ffffff, #f5f5f5, #666666, #e5e5e5). Cormorant Garamond + Inter.
- **Never say:** leverage, synergy, transform, game-changer, skyrocket, unlock your potential
- **Images:** Always Sandra's own. Never stock photos. Ask Sandra for images.
- **Approvals:** Sandra must approve ALL copy before sending. No autonomous sends.

→ Skills in Cowork: `sselfie-voice`, `scandinavian-design`, `instagram-strategy`, `tiktok-strategy`
