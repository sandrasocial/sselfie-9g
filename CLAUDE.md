# SSELFIE Operational Memory
*Last updated: 2026-03-13 — Read this at the start of every session*

---

## Me — Sandra (The Selfie Queen)
Founder of SSELFIE Studio. Single mother, Iceland/Norway. Building an AI-powered personal branding platform for women creators.

## My Role (Claude in Cowork)
I am the **desktop strategy and execution layer**. I:
- Validate agent plans before execution
- Catch inconsistencies and errors before they reach production
- Translate Sandra's requests into precise agent instructions
- Keep all agents synced to the locked Codex strategy while North handles mobile-first orchestration

**Access:** Claude (Cowork) has full access to Sandra's Mac via Desktop Commander — terminal, all projects, all API keys. No limitations.
**Stella (Codex)** also has full Mac access — terminal, all projects, all API keys in `.env.local`. No MCPs needed; she can query Neon, Stripe, Resend etc. directly via terminal.

---

## The Agent Team (OpenClaw)

| Agent | Role | Talk to them? |
|-------|------|--------------|
| **North** | COO orchestrator, Telegram/mobile-first command layer | YES — primary contact |
| **Operator** | Revenue + email + audience operations (Stripe/Resend/Neon checks) | Via North |
| **Builder** | Technical specs, deploy checks, Codex handoff verification | Via North |
| **Stella (Codex)** | Code implementation in repo | Via Claude/Cursor or Builder handoff |

Retired as standalone agents (kept as compatibility stubs): `north-revenue`, `north-email`, `north-audience`, `north-code`, `north-product`, `north-content`, `north-inbox`.

## When To Use Claude vs North

| When | Use | Why |
|------|-----|-----|
| Mobile, quick checks, morning brief, fast approvals | **North via Telegram/OpenClaw** | Always-on execution without computer access |
| Planning, deep strategy, code review, implementation specs | **Claude via Cursor** | Full repo context and precise file-level control |
| Urgent bug triage | **Either** (Claude preferred for code changes) | North diagnoses quickly; Claude applies/validates fixes |

**Command to talk to North:**
```
openclaw agent --agent north --local --message "YOUR MESSAGE"
```
**⚠️ Keep messages SHORT (under 100 words) — long responses cause 60s timeouts**
**⚠️ North's workspace:** `~/stella/` — all her files live here
**⚠️ List agents:** `openclaw agents list`

---

## Key Files (North's Workspace `~/stella/`)

| File | What it is |
|------|-----------|
| `ACTIVE/tasks/` | Active task list — check before adding tasks |
| `ACTIVE/reports/` | Execution reports and evidence |
| `NORTH_ACTIVE.md` | Compact runtime snapshot (refreshed from live Stripe + ACTIVE) |
| `SHARED_MEMORY.md` | Handoff log only (blockers, completions); not canonical business truth. Canonical: CLAUDE.md → CODEX_CONTEXT.md → NORTH_ACTIVE.md → STATUS.md (technical only) |
| `PIVOT-LOG-2026-02-28.md` | Strategic pivot doc — Website Agent V1 decision |
| `reports/REVENUE-IMPACT-*.md` | Revenue audit findings |
| `reports/EMAIL-HISTORY-AUDIT-*.md` | Email history findings |
| `reports/RESEND-NEON-AUDIT-*.md` | Resend/DB inconsistency audit |
| `drafts/` | Email and content drafts |

**App codebase:** sselfie-9g repo (path may vary by workspace; e.g. Sandra's selected folder)
**Codex spec:** `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`

---

## Current Priorities

### V-02 Full Funnel Hardening (Active — 2026-03-09)

| Step | Task | Status |
|------|------|--------|
| 0 | Git sync + CLAUDE.md update | ✅ Done |
| 1 | Retire freebie routes (redirects + template rename) | ✅ Done |
| 2 | Brand Strategy $19: landing + setup questionnaire + generate API + DB migration | ✅ Done |
| 3 | Critical email fixes (download language, firstName, Studio URL) | ✅ Done |
| 4 | Selfie Guide Day 0 activation email + cron block | ✅ Done |
| 5 | Brand Strategy paid delivery email | ✅ Done |
| 6 | Stripe order bump (Brand Strategy on Selfie Guide checkout) | ✅ Done |
| 7 | Fix nurture N2 missing CTA | ✅ Done |
| 8 | Delete dead funnel email tooling + archived cron/template debt | ✅ Done |
| 9 | Daily funnel monitoring scheduled task | ✅ Done (automation core rebuilt into 5 engines on 2026-03-10) |

### Maya UX Stabilization — Shipped ✅ (2026-03-11, commit `b950f1db`)

Source of truth: `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`

**Locked — do not reverse:**
- Maya top tabs: **Photos**, **Videos**, **Train** only. No Feed tab. No new top tabs.
- Feed stays in Feed Planner until Maya feed ownership is rebuilt cleanly.
- No new `chat_type` values without DB migration + load/save/new-chat/test coverage.
- Landing pages, workbooks, and pro-photoshoot flows stay retired/hidden until rebuilt.

**⚠️ CRITICAL: Maya Feed Tab ≠ Feed Planner — DO NOT CONFUSE THESE**
| System | Status | What it is |
|--------|--------|-----------|
| **Feed Planner** (`app/feed-planner/`, `app/api/feed-planner/*`, `app/api/feed/*`) | ✅ LIVE — DO NOT DELETE | Paid Blueprint product used by active paying users. Full 9-post grid, captions, strategy. |
| **Maya Feed Tab** (`components/sselfie/maya/maya-feed-tab.tsx`, `app/api/maya/feed*`) | ❌ DEAD — disabled via `isFeedTabDisabled = true` | A separate in-Maya feed tab. Hardcoded disabled. Routes are orphaned. Safe to delete. |
| **`lib/maya/feed-generation-handler.ts`** | ⚠️ SHARED — DO NOT DELETE | Used by BOTH the dead Maya tab AND the live Feed Planner hooks (`use-feed-actions.ts`). Cannot be removed until Feed Planner is refactored. |

**What shipped (commit `b950f1db`):**
- `MY MODEL / SELFIE` toggle visible to all Photos tab users (was membership-gated)
- Selfie detection fix: checks `imageLibrary` directly, no longer gated on `proMode`
- Mode-pure quick prompts per mode (`lib/maya/prompt-contract.ts` — new file)
- Maya system prompt now injects `CURRENT GENERATION MODE` block; guides users to toggle instead of silently failing cross-mode requests
- Pro concept card JSONB save fix: `chatId` passed as fallback when `messageId` is a temp AI SDK ID
- `update-message` content overwrite bug fixed — no longer blanks message text when saving `concept_cards` only
- Content calendar rebuilt: Maya voice copy, curated image selection, gap offer for missing photos
- Image Gallery modal dark theme fixed
- Videos tab: isolated per-tab chat sessions, cleaner voice and flow
- B-roll deduplication: brand_assets → ai_images → generated_images priority

**Still open:**
- Videos tab full Maya-guided flow rebuild (tab-scoped sessions added; end-to-end flow pending)
- Chat tab prompt cleanup — image creation not yet separated from planning prompts

### Website Agent V1 Sprint (On hold)

| Week | Tasks | Status |
|------|-------|--------|
| W1-A | Security hardening (north-notifier token, bridge auth) | ⏸ On hold |
| W1-B | Core agent loop | Pending |
| W1-C | Website read/write | Pending |
| W2-A | Brand voice layer | Pending |
| W2-B | Content generation | Pending |
| W2-C | Dashboard + launch | Pending |

**Locked price:** €27/month standalone
**North must read Codex spec before any agent work**

---

## Recent Codex Commits

| Commit | Description | Date |
|--------|-------------|------|
| `b950f1db` | fix(maya): mode toggle, pro JSONB save, mode-aware prompts + UX cleanup | 2026-03-11 |
| `7e798510` | fix(maya): stabilize model-choice UX and unblock training CTA | 2026-03-11 |
| `74eb299e` | fix: stabilize studio header across tab switches | 2026-03-11 |
| `4c03c85a` | chore(V-02): remove archived email tooling and sync agent context | 2026-03-09 |
| `e537db70` | feat(V-02): add strategy order bump fulfillment and email cleanup | 2026-03-09 |
| `770d687b` | feat: Brand Strategy $19 paid flow + delivery email | 2026-03-09 |
| `c9acc7fc` | feat(V-02 Step 1): retire freebie routes + rename nurture templates | 2026-03-09 |

---

## Technical Constants (Use These — Don't Guess)

| What | Value |
|------|-------|
| Resend Main Audience ID | `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd` |
| Resend total contacts | Verify live in Resend before quoting |
| Neon DB users | Verify live in Neon before quoting |
| Active Studio members | Verify live in Stripe before quoting |
| Active Blueprint buyers | Verify live in Stripe + Neon before quoting |
| Total active paying | Verify live (Stripe subscriptions + valid one-time entitlements) |
| Last metrics verification baseline | Historical snapshots may exist in reports; always verify live before quoting |
| Studio checkout URL | `https://sselfie.ai/checkout/membership` |
| Feed Planner checkout | `https://sselfie.ai/checkout/blueprint` |
| Selfie Guide checkout URL | `https://sselfie.ai/checkout/selfie-guide` |
| Selfie Guide access URL | `https://sselfie.ai/selfie-guide/access/[token]` |
| Brand Strategy landing URL | `https://sselfie.ai/brand-strategy` ($19 paid — ManyChat STRATEGY keyword) |
| Brand Strategy checkout URL | `https://sselfie.ai/checkout/brand-strategy-pack` |
| Brand Strategy setup URL | `https://sselfie.ai/brand-strategy/setup/[setupToken]` (post-payment questionnaire) |
| Brand Strategy result URL | `https://sselfie.ai/strategy/[accessToken]` (paid — generated after questionnaire) |
| Upsell fix | ✅ SHIPPED 2026-03-02 — commit `39bf931` — `?checkout=studio_membership` → `/checkout/membership` |
| Blueprint price ID | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| Stripe portal | Session-based — link to `https://sselfie.ai/studio?tab=settings` |
| Stripe portal config | `bpc_1SRX2wEVJvME7vkwu0rlIgfW` |
| Vercel Blob token | In `.env.local` as `BLOB_READ_WRITE_TOKEN` |
| Supabase | `https://rnnqqkidsoojtsmqqbyw.supabase.co` — **AUTH ONLY** (user sessions, not data) |
| Database | **Neon** (PostgreSQL) — all app data lives here: users, subscriptions, freebie_brand_strategies, email_logs, etc. |
| File storage | Vercel Blob — Supabase buckets are EMPTY, do not use |

---

## Resend Segments (Current State)

| Segment | Count | Notes |
|---------|-------|-------|
| Main Audience | Verify live | ✅ Use for full-list broadcasts |
| Brand Blueprint (legacy) | Verify live | Legacy Blueprint/freebie cohort; no new expected entries |
| Paid users | Verify live | ⚠️ Mixed cohort: one-time + beta + Studio members |
| Beta Customers | Verify live | Legacy pricing cohort (historically €47/€79/€99) |
| Cold Users | Verify live | Segment may be empty; confirm before use |

**Queued cleanup (Tasks 15-17):** Split mixed paid cohort into `paid-one-time`, `paid-beta`, `paid-studio-active`. Low priority, after Agent V1 W2-C.

### Audience Composition (Critical Context)
- Resend audience size does **not** equal app users.
- A large chunk of contacts are migrated from legacy Flodesk selfie-guide freebie flows (pre-app era).
- Neon "registered users" reflects app signups only; many Resend contacts may never have created an app account.
- Beta cohorts and legacy one-time buyers must be segmented from active Studio subscriptions before revenue decisions.

---

## Pricing & Products

| Product | Price | Status | Notes |
|---------|-------|--------|-------|
| Studio membership | €97/mo | ✅ Active | Cancel anytime |
| Selfie Guide | €17 | ✅ Active | `selfie_guide` type — interactive course, checkout + access token flow |
| Selfie Guide Bundle | €27 | ✅ Active | `selfie_guide_bundle` type — guide + extras |
| Brand Strategy Pack | $19 | ✅ Active | `brand_strategy_pack` — pay → questionnaire → Maya generates → `/strategy/[token]` |
| Feed Planner | See blueprint | ✅ Active | `paid_blueprint` type |
| Mini-products (4) | DEACTIVATED | ❌ | Prices set active=false. Become free workbooks in Academy |
| Website Agent V1 | €27/mo | 🔒 Planned | Standalone, not bundled |

**⚠️ NO FREEBIE PRODUCTS** — all entry points are paid. `/freebie/*` routes redirect to paid pages. `freebie_brand_strategies` table kept for legacy tokens; no new free entries.

**Mini-product price IDs (deactivated — do not reactivate):**
- What To Say: `price_1T2xljEVJvME7vkwFcaN1GEw`
- Show Up: `price_1T2xllEVJvME7vkwHC3r6GAI`
- Get Paid: `price_1T2xlmEVJvME7vkwkbgotHoB`
- AI Photo Prompts: `price_1T3aR3EVJvME7vkw6pzbZS9m`

---

## Email History

- Studio membership has **NEVER** had a dedicated broadcast before Feb 28, 2026
- Feb 28, 2026: First Studio membership email sent — Broadcast ID `8cacda39-7495-47a6-8505-c6985df7eaeb`
- Feb 28, 2026: Recovery emails sent to 9 members with failed payments
- Mar 02, 2026: SEQ-01 Nurture sequence approved (5 emails, Day 2/5/9/14/20 for Selfie Guide buyers) — templates renamed from `nurture-freebie-n*.ts` → `nurture-strategy-n*.ts` in V-02
- Mar 09, 2026: Legacy manual/scheduled campaign stack removed from repo. Archived cron copies, old campaign catalog/executor, and dead funnel templates deleted so agents only see live email paths.
- **Always send to Main Audience** (ID locked above; count verify live) for full-list broadcasts — NOT smaller segments

---

## Sandra's Preferences

- **Voice:** Text a close friend. Warm, honest, short sentences. Contractions always.
- **Design:** Scandinavian luxury. 5 colors only (#0a0a0a, #ffffff, #f5f5f5, #666666, #e5e5e5). Cormorant Garamond + Inter.
- **Never say:** leverage, synergy, transform, game-changer, skyrocket, unlock your potential
- **Images:** Always Sandra's own. Never stock photos. Ask Sandra for images.
- **Approvals:** Sandra must approve ALL copy before sending. No autonomous sends.
- **Agent guidance:** Claude validates all agent plans before North executes. Catch drift early.

→ Full brand guide: `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md`
→ Skills: `sselfie-voice`, `scandinavian-design`, `instagram-strategy`, `tiktok-strategy`

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
1. Fix bugs (background colour + real Maya chat wired) ← Stella doing this now
2. Verify Maya sounds like herself on preview
3. Expand tool registry: `show_gallery` + `save_to_gallery` first (tests dispatcher pattern cheaply)
4. Named agent + richer onboarding conversation (replaces wizard with Maya interviewing the user)
5. Phase C: collapse 5-tab navigation into Maya tools (tabs become what Maya surfaces, not separate screens)

### The 5-Tab Rebuild: Intermediate Step, NOT the Destination
The clean branch has 5 tabs (Maya, Gallery, Feed Planner, Academy, Account).
**This is Phase B scaffolding.** Phase C collapses it — Gallery IS a Maya tool, Feed Planner IS a Maya tool. No tab router. One screen.
→ Do NOT get comfortable with 5 tabs as the final state.

### Agent Skill (Shared Journey Source)
- Canonical multi-agent journey/UI/scale skill: `skills/sselfie-maya-os/SKILL.md`
- Use this when implementing or auditing funnel routes, screen behavior, and Maya-first orchestration changes.

### Pricing (Once Vision Is Live)
"The only AI that already knows your brand — and gets smarter every time you use it."
That's not a tool. That's a business relationship. Target: €197/month minimum. Not €97. Not €27.

---

## Dead Code Map — Approved for Deletion (2026-03-12)
*Read this before touching any "cleanup" task. Many items look dead but are not.*

### ✅ Safe to delete — confirmed dead
| Item | Why dead | Risk |
|------|----------|------|
| `components/sselfie/maya/maya-feed-tab.tsx` | Feed tab hardcoded disabled (`isFeedTabDisabled = true`). Tab not shown. | Low — remove component + import in maya-chat-screen.tsx |
| `app/api/maya/feed/` | Only called by the disabled Maya Feed Tab | Low |
| `app/api/maya/feed-chat/` | Only called by the disabled Maya Feed Tab | Low |
| `app/api/maya/feed-progress/` | Only called by the disabled Maya Feed Tab | Low |
| `app/api/maya/generate-feed/` | Only called by the disabled Maya Feed Tab | Low |
| `app/api/maya/generate-feed-prompt/` | Only called by the disabled Maya Feed Tab | Low |
| `app/api/maya/generate-all-feed-prompts/` | Only called by the disabled Maya Feed Tab | Low |
| `app/brand-engine/`, `app/apply/brand-engine/`, `app/brand-engine/vip/` | Brand Engine retired offer, no routes/redirects | Low |
| `app/freebie/` | Routes redirect to paid pages; page files themselves are dead | Low — keep redirects in vercel.json, delete page files |
| `app/checkout-upgrade/` | Duplicate checkout entry, no active links | Medium — verify no active links first |
| `app/bio/` | Bio page — unclear where in user journey, no active links found | Medium — verify first |
| `lib/feed-chat/history.ts` | No callers found anywhere in codebase | Low |
| `lib/maya/feed-generation-handler.ts` imports only used by maya-feed-tab.tsx | Safe ONLY AFTER maya-feed-tab.tsx is deleted AND feed-planner hooks are refactored | **HIGH RISK — do not delete yet** |

### ⚠️ Looks dead but is NOT — do not delete
| Item | Why it looks dead | Why it's actually live |
|------|-------------------|----------------------|
| `app/api/feed/*` (11 routes) | Not under `feed-planner/` so looks orphaned | Actively called by `components/feed-planner/*` — core Feed Planner data layer |
| `lib/maya/feed-generation-handler.ts` | Associated with disabled Maya Feed Tab | `FeedStrategy` type + `createFeedFromStrategyHandler` used by `lib/feed-planner/hooks/` |
| `lib/feed-planner-v2/` | Looks like a parallel/unfinished system | Used in 4 active feed routes via `use_feed_planner_v2` per-user flag |
| `app/feed-planner/` entire directory | Might be confused with the dead Maya Feed Tab | LIVE product — active paying Blueprint users depend on this |
| `app/api/feed-planner/*` (12 routes) | Separate from `app/api/feed/*` so might look redundant | Both systems active — feed-planner routes handle higher-level logic |

### 🔒 Never delete — business-critical
- `app/feed-planner/` — entire directory — **active paying users, recurring revenue**
- `app/api/feed-planner/` — entire directory
- `app/api/feed/` — entire directory
- `lib/feed-planner/` — entire directory
- `components/feed-planner/` — entire directory
- `lib/maya/feed-generation-handler.ts` — until Feed Planner refactor is done

---

## Rebuild Status (sprint/clean-architecture branch)
*Updated 2026-03-03*

| Item | Status |
|------|--------|
| Branch created | ✅ `sprint/clean-architecture` commit `0269e304` |
| 5-tab shell | ✅ Built, tests 30/30 pass |
| Maya generation (Classic + Pro) | ✅ Wired to real Replicate APIs |
| Maya chat (real AI) | ✅ FIXED — commit `15b3cf94` — streaming + `[GENERATE_CONCEPTS]` wired |
| Background colour | ✅ FIXED — commit `15b3cf94` — full light theme cascade (22 files) |
| All 5 screens | ✅ Skeletal layouts present |
| Main branch (live paying customers) | ✅ Untouched — live throughout |

**Preview (NOT production):** https://v0-sselfie-qanvy6o2q-sselfie-studio.vercel.app
**Do NOT merge to main until Sandra verifies on preview.**
**Fix report:** `~/stella/reports/FIX-01-VERIFICATION-2026-03-02.md`

---

## Protocol: How Claude Guides North

1. **Check North's task list** (`~/stella/ACTIVE/tasks/` and `~/stella/NORTH_ACTIVE.md`) before adding new tasks
2. **Keep messages to North under 100 words** — long replies cause timeouts
3. **Validate numbers** — North has made counting errors before (check live Stripe/Resend/Neon, not doc snapshots)
4. **Corrections go via terminal** — do not write business metrics or product truth into SHARED_MEMORY.md (handoff log only)
5. **Sandra approves strategy** — Claude and North execute, Sandra decides direction
6. **Before any broadcast email:** confirm audience ID, confirm copy is approved, confirm image is hosted

→ Deep context: `memory/context/openclaw-protocol.md`
