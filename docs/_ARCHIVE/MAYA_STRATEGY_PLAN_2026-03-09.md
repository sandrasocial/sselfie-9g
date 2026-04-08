# Maya Strategy + Action Plan
*Based on MAYA_SYSTEM_MAP.md live-code audit · 2026-03-09*

---

## What This Doc Is

The MAYA_SYSTEM_MAP audit mapped every live Maya surface, pipeline, and table.
It found five real problems. This doc turns those findings into a three-phase plan that moves Maya from its current "works but messy" state toward the Maya-first OS vision locked in CLAUDE.md.

Everything below is grounded in what the live code actually does — not what the docs say it should do.

---

## The Five Problems the Audit Found

### Problem 1 — Chat route confusion
`/api/maya/chat` is the real live backend. `/api/maya/pro/chat` exists but the frontend doesn't primarily call it. Mode is controlled by request headers (`x-studio-pro-mode`, `x-chat-type`, `x-active-tab`).

**Why it matters:** Any dev (or agent) working from repo structure alone will head to the wrong file. Documentation drift, incorrect fixes, wasted time.

### Problem 2 — Feed is fragmented and naming is broken
Three different strings (`feed-planner`, `feed-designer`, `feed_designer`) refer to the same concept across migrations, APIs, and components. The Maya feed tab exists in code but is *disabled*. The real feed experience lives in a separate `app/feed-planner/` surface. And the live Feed Planner `create-from-strategy` route forces Pro mode even when Classic branching code still exists around it.

**Why it matters:** Analytics, history queries, and any migration touching feed data will silently miscount or fail. The feed tab disable also means Maya isn't the entry point for feed creation — the user has to navigate away, which breaks the Maya-first vision.

### Problem 3 — Image storage is split across two tables
Classic flows write to `generated_images`. Studio Pro, gallery, and feed reconciliation write to `ai_images`. Both tables exist. No authoritative decision has been made about which is canonical.

**Why it matters:** Gallery views, credit audits, and reconciliation crons all have to query two tables and do their own bridging. Every new feature that touches images has to decide which table to use. This compounds over time.

### Problem 4 — Memory architecture divergence
Vision docs and AGENT-V1-EXECUTION-SPEC reference `agent_profiles` as the home of user identity. Live code's memory pipeline is built around `user_personal_brand` + `maya_personal_memory.memory_data`. `agent_profiles` is not the active center of the current user-context pipeline.

**Why it matters:** The named-agent feature (Maya Vision: "What do you want to call me?") needs a real table behind it. Building it on top of the wrong mental model — or the wrong table — will create another layer of drift.

### Problem 5 — Prompt authority is only a wrapper
`lib/generation/prompt/index.ts` looks like a clean canonical layer. It mostly re-exports from `lib/generation/prompt/legacy-authority.ts`. The actual implementation is still the extracted legacy wrapper. Plus, `prompt-constructor.ts` has comments describing Studio Pro / attachment identity, but its actual route usage shows it's Classic/Flux only.

**Why it matters:** Anyone touching the prompt pipeline will read the comments and build against a false model. Bugs from this are subtle and hard to trace.

---

## The Strategy: Three Phases

```
Phase 0 — Clarify       (this week, no risk, ~0.5 dev days)
Phase 1 — Consolidate   (2 weeks, medium risk, foundation work)
Phase 2 — Maya OS       (ongoing, the vision build)
```

Phase 0 is cleanup that unblocks Phase 1. Phase 1 removes the technical debt that would otherwise slow or break Phase 2. Phase 2 is the Maya-first OS.

---

## Phase 0 — Clarify
*Goal: Fix naming, comments, and documentation so the codebase tells the truth. Zero behavior change.*

### 0-A · Fix chat route documentation
**What:** Add a clear comment block at the top of `/api/maya/pro/chat/route.ts` explaining it is NOT the primary live route. Add a matching note in `/api/maya/chat/route.ts` explaining the mode-header switching pattern.

**Files touched:**
- `app/api/maya/chat/route.ts`
- `app/api/maya/pro/chat/route.ts`

**Effort:** 30 minutes. Zero risk.

---

### 0-B · Fix prompt-constructor.ts comments
**What:** Remove/rewrite the misleading Studio Pro / attachment-identity comments in `lib/maya/prompt-constructor.ts`. The file is Classic/Flux only. The comments should say that clearly.

**Files touched:**
- `lib/maya/prompt-constructor.ts`

**Effort:** 30 minutes. Zero risk.

---

### 0-C · Document feed mode as Pro-only
**What:** Add a comment at the top of `app/api/feed-planner/create-from-strategy/route.ts` marking it as Pro-only and noting that Classic branching code in surrounding files is currently dormant.

Update `docs/features/feed-planner.md` §1 to reflect this accurately.

**Files touched:**
- `app/api/feed-planner/create-from-strategy/route.ts`
- `docs/features/feed-planner.md`

**Effort:** 45 minutes. Zero risk.

---

### 0-D · Decide the Maya feed tab
**Decision Sandra needs to make:**
> Should the Maya feed tab be re-enabled, or removed from the code?

Two options:
1. **Re-enable it** — the `maya-feed-tab.tsx` code exists, the `[CREATE_FEED_STRATEGY]` trigger works, feed cards persist in chat messages. Wiring it back up as a visible Maya tab is a Phase 1 task, but the decision to do it should be made now.
2. **Delete it** — if the separate `feed-planner` surface is the permanent home for feed work, clean the dead code out.

The Maya-first OS vision strongly implies re-enabling it (feed planning should happen *inside* Maya, not in a separate surface). But this is Sandra's call.

---

## Phase 1 — Consolidate
*Goal: Fix the three real architectural inconsistencies so Phase 2 builds on solid ground.*

### 1-A · Unify chat type naming (feed)
**What:** Pick one canonical string for feed chat types and migrate everything to it.

Recommendation: `feed_planner` (underscored, consistent with Neon table naming conventions).

**Changes:**
- Audit all usages of `feed-planner`, `feed-designer`, `feed_designer` across:
  - `maya_chats.chat_type` values in the DB (data migration)
  - route handlers
  - components
  - migrations
- Write a single migration that updates all existing `feed-designer` / `feed_designer` rows to `feed_planner`
- Update all string literals in code to use `feed_planner`

**Files to audit first (start here):**
- `lib/data/maya.ts`
- `app/api/maya/chat/route.ts`
- `components/sselfie/maya/maya-feed-tab.tsx`
- `app/api/maya/generate-feed/route.ts`
- `app/api/maya/pro/generate-feed/route.ts`

**Test:** After migration, `SELECT DISTINCT chat_type FROM maya_chats;` should show no rows with `feed-designer` or `feed_designer`.

**Effort:** 1-2 dev days. Medium risk (data migration + string search). Run on preview, verify, then main.

---

### 1-B · Decide and document the canonical image table
**Decision:** Designate `ai_images` as the canonical store for all completed/delivered images going forward. `generated_images` becomes a legacy Classic-mode staging table only.

**What changes:**
- Add a clear DB comment / doc block explaining: `generated_images` = Classic pipeline staging, `ai_images` = canonical gallery record
- Review the reconciliation cron (`reconcile-generations`) and confirm it's already bridging `generated_images` → `ai_images` correctly (from the audit it appears so — verify this)
- Update `lib/data/maya.ts` gallery queries to read from `ai_images` as primary
- Add a doc note to `docs/features/gallery.md` §1

**What does NOT change yet:**
- The Classic generation write path (still writes to `generated_images` first — leave it; reconciler handles the bridge)
- No schema changes

**Effort:** 1 dev day. Low-medium risk. Mostly verification + documentation.

---

### 1-C · Activate agent_profiles and wire to memory
**This is the named-agent feature.** It's already in the Agent V1 spec as Slice W1-C. But the audit confirms the live memory pipeline (`get-user-context.ts`) doesn't read from `agent_profiles` at all yet.

**What this enables:** The Maya Vision moment — "What do you want to call me?" → name persisted → injected every session → users don't cancel relationships.

**Changes:**
- Run migration: `migrations/20260228_add_agent_profiles.sql` (already written per Agent V1 spec)
- Add a first-open name-prompt to Maya's onboarding conversation (replaces wizard wizard first question)
- Read `agent_profiles.agent_name` in `lib/maya/get-user-context.ts` and inject it into the Maya system prompt
- Store and read it from `maya_personal_memory.memory_data.agent_context_note` as a fallback if `agent_profiles` row doesn't exist yet

**This does NOT replace `user_personal_brand` or `maya_personal_memory`.** Those stay. `agent_profiles` adds the *identity layer* (what the user named their AI) on top.

**Files:**
- `lib/maya/get-user-context.ts`
- `lib/maya/memory-layer.ts`
- `components/sselfie/maya-chat-screen.tsx` (name-prompt on first open)
- `app/api/maya/chat/route.ts` (inject agent name into system prompt)

**Effort:** 1.5-2 dev days. Medium risk.

---

### 1-D · Re-enable Maya feed tab (if Sandra says yes in Phase 0-D)
**What:** Wire the disabled `maya-feed-tab.tsx` back as a visible tab in `maya-tab-switcher.tsx`.

Feed strategy creation happens in Maya chat → feeds into the Maya feed tab → saves to feed tables. The separate `feed-planner` surface remains for the full editing/refinement experience, but the entry point is Maya.

**What already works (no new code needed):**
- `[CREATE_FEED_STRATEGY]` trigger parsing in `maya-chat-screen.tsx` ✅
- Feed card persistence in `maya_chat_messages` ✅
- `maya-feed-tab.tsx` component code ✅

**What needs checking:**
- Does the feed tab currently read live data from `feed_layouts` / `feed_posts` correctly?
- Does the "View in Feed Planner" handoff work?

**Effort:** 0.5-1 dev day to verify + re-enable. Low risk.

---

## Phase 2 — Maya OS Build
*Goal: Realize the north star. Maya IS the app.*

This is the build phase. It should only start after Phase 1 is complete — the consolidation work in Phase 1 removes the ambiguity that would otherwise cause Phase 2 to drift.

### Build order (from CLAUDE.md Maya Vision, now grounded by audit)

**Step 2-1: Expand the tool registry**
Current registered tools: `show_gallery`, `save_to_gallery`, `generate_image`, `generate_video`, `show_upload_zone`, `create_asset`, `edit_asset`, `collect_offer_brief`.

Add next:
- `show_feed_plan` (surfaces the feed tab inline)
- `open_training` (routes into training without tab navigation)
- `show_brand_profile` (shows `user_personal_brand` inline as an editable card)

**Key files:**
- `lib/maya/tool-registry.ts`
- `lib/maya/tool-orchestrator.ts`
- `lib/maya/intent-dispatcher.ts`

---

**Step 2-2: Named agent richer onboarding**
Replace the current wizard with Maya *interviewing the user* in conversation. The first-open experience should feel like meeting your AI, not filling out a form.

- Maya asks 3-4 questions over the first session
- Answers build `user_personal_brand` progressively
- Agent name from 1-C is the foundation for this

---

**Step 2-3: Collapse navigation into Maya tools**
The 5-tab shell (Maya, Gallery, Feed Planner, Academy, Account) is Phase B scaffolding, not the destination. Phase C collapses it.

- Gallery → `show_gallery` tool renders inline
- Feed Planner → `show_feed_plan` tool renders inline
- Academy → `show_academy` tool surfaces content inline

This is the largest build item. Sequence it last, after 2-1 and 2-2 are proven.

---

**Step 2-4: Cross-session memory deepening**
What Maya currently remembers: notes, style feedback, latest offer brief, asset workspace.

What the vision needs:
- Everything the user has rejected (don't repeat those prompts)
- Everything they've loved (amplify the pattern)
- Progressive brand build-up over sessions

This requires `maya_personal_memory.memory_data` to grow per session from a soft summary to a structured preference model.

---

## Decision Log — What Sandra Needs to Answer

| # | Question | Options | Default if no answer |
|---|---------|---------|----------------------|
| 1 | Maya feed tab: re-enable or remove? | Re-enable (Phase 1-D) / Remove | Hold (don't touch) |
| 2 | Named agent: start with Phase 1-C now or after Agent V1 W1-A security work? | Start now / After security | Start now (low risk) |
| 3 | Image table unification: designate `ai_images` as canonical? | Yes / No / Need to audit further | Yes (already implied by current cron behavior) |
| 4 | Feed naming migration: approve running on preview first? | Yes / No | Yes (required before main) |

---

## Sprint Sequence (Recommended Order)

```
Week 1
  Mon-Tue  Phase 0-A + 0-B + 0-C  (comments, docs, zero risk)
  Wed      Sandra decision on 0-D (feed tab) + Decision Log
  Thu-Fri  Phase 1-A prep: audit feed type strings, write migration

Week 2
  Mon-Tue  Phase 1-A: run feed naming migration on preview, verify, merge
  Wed-Thu  Phase 1-B: image table decision + docs + gallery query audit
  Fri      Phase 1-C start: agent_profiles migration + get-user-context wire

Week 3
  Mon-Wed  Phase 1-C complete: name-prompt on first open, system prompt injection
  Thu-Fri  Phase 1-D (if approved): re-enable Maya feed tab, verify handoff

Week 4+
  Phase 2 begins: tool registry expansion → named agent onboarding → nav collapse
```

---

## What NOT to Touch

Per the audit, these areas are either admin-only or require separate decisions:

- Pro Photoshoot routes (`/api/maya/pro/photoshoot/*`) — admin-gated, out of scope
- `prompt-constructor.ts` full rewrite — not needed, comment fix in Phase 0 is enough
- Classic/Pro mode branching in feed code — leave dormant until there's a reason to re-enable Classic feeds
- `legacy-authority.ts` full replacement — wrapper is fine for now; don't rewrite it without a clear failing test to fix

---

## Files That Define Maya Today (Heart of the App)

Per the audit, these 10 files are the center of gravity. Any change to Maya should start here:

1. `components/sselfie/maya-chat-screen.tsx`
2. `app/api/maya/chat/route.ts`
3. `lib/maya/get-user-context.ts`
4. `lib/maya/memory-layer.ts`
5. `lib/generation/prompt/legacy-authority.ts`
6. `app/api/maya/generate-concepts/route.ts`
7. `app/api/maya/pro/generate-image/route.ts`
8. `app/api/feed-planner/create-from-strategy/route.ts`
9. `lib/maya/asset-generation.ts`
10. `lib/data/maya.ts`

---

*This plan stays grounded in the audit. Any work should reference MAYA_SYSTEM_MAP.md as the live-code source of truth and CLAUDE.md as the vision anchor.*
