# ARCHITECTURE AUDIT V1
> Historical audit snapshot (2026-03-03). Not canonical operating truth.
> Canonical agent/system truth lives in `CLAUDE.md`, `docs/CODEX_CONTEXT.md`, and `docs/_CANONICAL/CURSOR_CONSTITUTION.md`.

**Branch:** `refactor/architecture-stabilization-v1`
**Date:** 2026-03-03
**Auditor:** Claude Code (automated structural analysis)
**Codebase:** SSELFIE Studio — Next.js 16 / React 19 / TypeScript
**Purpose:** Phase 1 inventory — NO CODE CHANGES. Analysis only.

---

## Codebase Scale

| Metric | Count |
|--------|-------|
| API routes (`route.ts`) | **457** |
| App pages (`page.tsx`) | **54** |
| Library modules (`lib/**/*.ts`) | **345** |
| Components (`*.tsx`) | **250** |
| Email templates | **60+** |
| Cron routes | **37** (11 scheduled in vercel.json) |

This is a **large production codebase** with significant organic growth. The audit focuses on structural risk, not feature completeness.

---

## 🔴 HIGH RISK AREAS

### HR-01 — Database Access Fragmentation (CRITICAL)
**What:** Four separate patterns for accessing Neon PostgreSQL, used inconsistently throughout the codebase.

| Import Pattern | Usage Count | Location |
|----------------|------------|---------|
| `@neondatabase/serverless` (direct) | **244** | API routes (majority) |
| `@/lib/db` | **55** | Library modules |
| `@/lib/neon` | **15** | Library modules |
| `@/lib/db-singleton` | **13** | Library modules |

**Why it's high risk:**
- Three singleton implementations (`lib/neon.ts`, `lib/db.ts`, `lib/db-singleton.ts`) each attempt their own connection pooling but are separate modules — they cannot share a pool
- 244 routes importing `@neondatabase/serverless` directly bypass all abstractions
- Inconsistent error handling at the connection level
- Connection exhaustion risk under production load

**Files involved:**
- `lib/neon.ts` — getNeonClient() singleton
- `lib/db.ts` — getDb() singleton (different from above)
- `lib/db-singleton.ts` — getOrCreateDb() (third singleton)
- `app/api/**` — 244 files importing neon directly

---

### HR-02 — Prompt Authority Layer Fragmentation (CRITICAL)
**What:** The AI prompt construction system has at least **8 overlapping implementations** with no clear authority.

| File | Lines | Role |
|------|-------|------|
| `lib/maya/prompt-authority.ts` | **2,232** | "The authority" — routes prompts |
| `lib/maya/prompt-constructor.ts` | **826** | Another prompt builder |
| `lib/maya/prompt-generator.ts` | **654** | `PromptGenerator` class (used for suggestions) |
| `lib/maya/nano-banana-prompt-builder.ts` | ~200 | NanoBanana-specific builder |
| `lib/maya/pro/prompt-architecture.ts` | ~200 | Pro mode specific |
| `lib/maya/prompt-components/` | ~6 files | Component-based system |
| `lib/maya/prompt-templates/` | ~15 files | Template-based system |
| `lib/feed-planner-v2/maya-prompts.ts` | ~100 | Feed planner prompts |
| `lib/feed-planner/prompt-shaper.ts` | ~100 | Older feed planner prompts |

**Why it's high risk:**
- `prompt-authority.ts` at 2,232 lines is a god object — impossible to reason about
- `prompt-constructor` and `prompt-generator` solve the same problem differently
- Routes bypass the "authority" layer and call builders directly
- Brand voice consistency is not enforced at a single point

---

### HR-03 — Stripe Metrics: 5 Parallel Versions (HIGH)
**What:** Five versions of the same Stripe live metrics logic, totalling 1,979 lines of near-duplicate code.

| File | Lines | Status |
|------|-------|--------|
| `lib/stripe/stripe-live-metrics.ts` | 325 | Current (presumably) |
| `lib/stripe/stripe-live-metrics-optimized.ts` | 310 | "Optimized" — purpose unclear |
| `lib/stripe/stripe-live-metrics-simple.ts` | 307 | "Simple" — purpose unclear |
| `lib/stripe/stripe-live-metrics-old.ts` | 650 | Old v1 |
| `lib/stripe/stripe-live-metrics-old2.ts` | 387 | Old v2 |

**Why it's high risk:**
- Revenue data reading from 5 different code paths
- Revenue calculation bugs in any one version affect downstream decisions
- The 3 non-`-old` versions are all similar size — it's unclear which is canonical

---

### HR-04 — Image Generation Route Fragmentation (HIGH)
**What:** 5+ routes handling image generation with confusing naming and aliases.

| Route | Lines | Notes |
|-------|-------|-------|
| `/api/maya/generate-image` | 406 | Classic Flux LoRA (canonical) |
| `/api/maya/generate-classic` | 3 | **Re-exports** generate-image |
| `/api/maya/generate-studio-pro` | 293 | NanoBanana Pro (canonical) |
| `/api/maya/generate-pro` | 3 | **Re-exports** generate-studio-pro |
| `/api/maya/pro/generate-image` | 321 | NanoBanana (from Pro mode UI) |
| `/api/studio/generate` | ~100 | Studio tab generation |

**Why it's high risk:**
- 3-line passthrough aliases create dead navigation paths in docs/memory
- `/api/maya/pro/generate-image` and `/api/maya/generate-studio-pro` may have diverged
- No shared request validation or auth middleware between these paths

---

### HR-05 — Alex Agent Incomplete Refactor (HIGH)
**What:** `lib/alex/` contains infrastructure for extracting 35 tools. Only 2/35 have been extracted. The rest of the agent logic lives elsewhere (in `lib/stella/runtime.ts`).

- `lib/alex/REFACTORING_PROGRESS.md` explicitly states: "Status: In Progress (2/35 tools extracted)"
- 13 tool stub files exist but most are empty scaffolding
- `app/api/admin/chat-with-agent/route.ts` delegates to `lib/stella/runtime.ts` (not alex)
- The naming (`alex` vs `stella`) adds confusion — `lib/stella/` is the running agent, `lib/alex/` is an abandoned extraction project

**Risk:** The lib/alex/ directory is dead weight that looks like active code.

---

## 🟡 MEDIUM RISK AREAS

### MR-01 — Feed System with 4 Overlapping Pipelines
Four separate "feed" subsystems that partially overlap:
1. `app/api/feed/[feedId]/` — 40+ endpoints for the main Feed Planner feature
2. `app/api/feed-planner/` — 12 endpoints for the Feed Planner product
3. `app/api/maya/feed/` — Maya-specific feed routes
4. `app/api/maya/pro/generate-feed/` — Pro mode feed generation

**Impact:** Business logic for feed creation is split across these, making bug fixes risky.

---

### MR-02 — Feed Planner Dual Version (`v1` vs `v2`)
- `lib/feed-planner/` — original feed planner library (15+ files)
- `lib/feed-planner-v2/` — newer version (5 files)
- Both are imported by active routes
- `lib/feed-planner-v2/feature-flag.ts` exists, suggesting v2 was behind a flag

---

### MR-03 — Email Template Proliferation (60+ templates)
- 60+ active templates in `lib/email/templates/`
- 4 separate archived templates in `lib/email/templates/archived/`
- Multiple email sender implementations: `send-email.ts`, `transactional-sender.ts`, `marketing-sender.ts`
- Several sequences may be superseded (`social-proof-sequence.tsx`, `enhanced-conversion-sequence.tsx`)
- Maintenance burden: changing email brand voice requires touching 60+ files

---

### MR-04 — Strategist Layer Fragmentation
Four separate "strategist" modules each wrapping AI calls:
- `lib/content-research-strategist/`
- `lib/personal-brand-strategist/`
- `lib/instagram-strategist/`
- `lib/instagram-bio-strategist/`

Each has its own `personality.ts` and logic file. These could be unified into a single "AI Strategist" with personality configuration.

---

### MR-05 — Twin Control Plane (Unclear Active Status)
- `lib/twin-control-plane.ts` + `app/api/twin/` (6 routes)
- No frontend calls to twin routes detected in the codebase
- Purpose appears experimental/internal
- Risk: these routes are publicly accessible endpoints without clear auth guards

---

### MR-06 — Agent Coordinator (Orphaned)
- `lib/agent-coordinator/` + `app/api/agent-coordinator/workflow-status/`
- One removed endpoint: `app/api/.removed-endpoints/agent-coordinator-generate-feed-1767452889/`
- No active frontend usage detected
- The "workflow" system may have been superseded by direct API calls

---

### MR-07 — 26 Unscheduled Cron Routes
- **37 cron route files** exist
- **Only 11** are scheduled in `vercel.json`
- 26 cron routes are deployed as HTTP endpoints but never triggered automatically
- Some may be manually invocable admin tools; others may be dead code

**Notable unscheduled crons:**
- `blueprint-discovery-funnel`, `send-blueprint-followups`, `reindex-codebase`, `milestone-bonuses`, `backfill-resend-audience`, `welcome-sequence`, `cohort-report-weekly`, `monthly-usage-recap`, and 18 more

---

### MR-08 — Middleware Auth Bypass Surface
`middleware.ts` explicitly skips authentication for:
- All upload routes
- `/api/webhooks/stripe/*`
- `/api/cron/*`
- `/api/freebie/*`
- `/api/brand-engine/*` (for Make.com)

The Make.com bypass for brand-engine has no token validation in middleware — relies solely on route-level checks. This is a known pattern but worth auditing.

---

## 🗑️ DEAD CODE CANDIDATES

### Confirmed Dead (safe to delete)

| Item | Type | Evidence |
|------|------|---------|
| `lib/stripe/stripe-live-metrics-old.ts` | File | Named "old" |
| `lib/stripe/stripe-live-metrics-old2.ts` | File | Named "old2" |
| `app/api/maya/generate-classic/route.ts` | Route | 3-line re-export, alias only |
| `app/api/maya/generate-pro/route.ts` | Route | 3-line re-export, alias only |
| `app/api/.removed-endpoints/` | Directory | Already "removed" — just not deleted |
| `app/api/cron/cold-reeducation-sequence/route.ts.disabled` | File | Explicitly disabled |
| `app/api/maya/pro/chat/route.ts.bak` | Backup file | `.bak` extension |
| `app/academy/success/page.tsx.bak` | Backup file | `.bak` extension |
| `lib/alex/` tools stubs (33 of 35) | Files | Empty stubs, refactor abandoned |

### Likely Dead (verify before deleting)

| Item | Type | Evidence |
|------|------|---------|
| `lib/stripe/stripe-live-metrics-simple.ts` | File | No clear purpose vs main |
| `lib/stripe/stripe-live-metrics-optimized.ts` | File | No clear purpose vs main |
| `lib/agent-coordinator/` | Directory | No active frontend callers found |
| `lib/twin-control-plane.ts` + `app/api/twin/` | System | No frontend callers found |
| `lib/maya/feed-chat/history.ts` | File | Route has no POST handler |
| `app/api/maya/feed-chat/` (route body) | Route | Only health endpoint exists, no actual handler |
| `lib/feature-flags.ts` (workbench flag) | Function | Zero callers in routes |
| `lib/brand-engine/agents/` | Directory | Agent logic (not Make.com integration) |
| `lib/brand-engine/brand-brain/` | Directory | Unclear active usage |

### Dead npm Dependencies (never imported in active code)

| Package | Evidence |
|---------|---------|
| `@stackframe/stack` | Zero imports in active code |
| `next-auth` | No usage (just a comment noting it's NOT used) |
| `@auth/core` | No usage found |
| `console` (0.7.2) | Node.js polyfill — built-in in Node |
| `fs` (0.0.1-security) | Built-in Node module |
| `path` (0.12.7) | Built-in Node module |
| `crypto` (latest) | Built-in Node module |
| `neon` (2.0.0 standalone) | Different from `@neondatabase/serverless` — likely leftover |

---

## ⚡ IMMEDIATE SIMPLIFICATION OPPORTUNITIES

### ISO-01 — Consolidate DB Access to One Pattern
**Effort: Medium | Risk: Low**
Choose `lib/neon.ts` (or `lib/db-singleton.ts`) as the single DB entry point. Remove the other two. Migrate the 244 direct-import routes gradually. No logic changes — purely import hygiene.

### ISO-02 — Delete `.bak` and `.disabled` Files
**Effort: Trivial | Risk: Zero**
Remove: `route.ts.bak`, `page.tsx.bak`, `route.ts.disabled`

### ISO-03 — Delete `.removed-endpoints` Directory
**Effort: Trivial | Risk: Zero**
This directory exists to document history. Move documentation to a CHANGELOG or git history. Delete the actual code.

### ISO-04 — Delete 2 Old Stripe Metrics Files
**Effort: Trivial | Risk: Low**
`stripe-live-metrics-old.ts` and `stripe-live-metrics-old2.ts` — confirm no imports, delete.

### ISO-05 — Audit and Document Unscheduled Cron Routes
**Effort: Low | Risk: Low**
Produce a decision table: each of the 26 unscheduled routes is either (a) manually-triggered admin tool, (b) deprecated, or (c) should be added to vercel.json. No code changes needed — just documentation.

### ISO-06 — Remove Dead npm Dependencies
**Effort: Low | Risk: Low**
Remove `console`, `fs`, `path`, `crypto` (npm versions of built-ins), `neon` (standalone), and verify `@stackframe/stack`/`next-auth`/`@auth/core` before removing.

### ISO-07 — Collapse generate-classic/generate-pro Aliases
**Effort: Trivial | Risk: Low**
Either: (a) Delete the 3-line aliases and update callers, or (b) Reverse: make the aliases canonical and consolidate the logic. Current state is confusing either way.

---

## 🏗️ ARCHITECTURAL INCONSISTENCIES

### AI-01 — Stella vs Alex Naming (Same Agent)
- `lib/stella/` = the running admin agent (runtime.ts, email-queue.ts, charter.ts)
- `lib/alex/` = an incomplete extraction project of tools FOR the same agent
- `app/api/admin/chat-with-agent/route.ts` calls `stellaReply()` — no Alex involved
- **Inconsistency:** The agent is called "Stella" in docs and "Alex" in the lib extraction work

### AI-02 — Auth Stack Confusion
Supabase is the active auth system. Three additional auth packages (`@stackframe/stack`, `next-auth`, `@auth/core`) are installed but not used. There's even a comment in the codebase explicitly noting next-auth is NOT used. Clean up to prevent future confusion.

### AI-03 — Dual AI Client Pattern
Two AI SDK patterns co-exist:
- `ai` package with `streamText` / Vercel AI SDK (main pattern, used in maya/chat)
- Direct `openai` SDK (used in `lib/ai/embeddings.ts` and `lib/ai/semantic-search.ts`)
Both are legitimate for their specific uses (streaming vs embeddings), but should be documented as intentional.

### AI-04 — Credits vs Quota System
Two parallel rate-limiting systems:
- `lib/credits.ts` — credit balance checks (`checkCredits`, `deductCredits`) — **active, used across generation routes**
- `app/api/quota/` — separate quota system — usage unclear in active flows
Both exist in `package.json` endpoints; unclear if quota is layered on top of credits or superseded.

### AI-05 — No Unified Request Auth Middleware
Each API route independently handles authentication by calling:
1. `createServerClient()` (Supabase)
2. `getEffectiveNeonUser()` or `getUserByAuthId()`
3. Various admin checks

There is no shared `withAuth()` middleware wrapper. Authentication logic is duplicated across all ~450 routes.

---

## 🗺️ CORE FLOW MAPS

### Auth Flow
```
User → /auth/login (page)
     → Supabase auth (session)
     → /auth/callback (route.ts)
     → /studio (redirect)

Server-side: middleware.ts → lib/supabase/middleware.ts (updateSession)
             → lib/auth-helper.ts (getAuthenticatedUser)
             → lib/user-mapping.ts (getUserByAuthId → Neon DB lookup)
```

### Image Generation Flow (Classic)
```
User triggers generation in Maya chat
  → [GENERATE_CONCEPTS] trigger detected in maya/chat/route.ts
  → generateConceptCardsViaAuthority() in lib/maya/prompt-authority.ts
  → Replicate API via lib/replicate-client.ts
  → Polling via lib/replicate-polling.ts
  → Image saved via lib/data/images.ts
  → Stored in Vercel Blob
```

### Image Generation Flow (Pro / NanoBanana)
```
User in Maya Pro mode
  → /api/maya/pro/generate-image (321 lines)
  → checkCredits() → lib/credits.ts → Neon DB
  → lib/maya/nano-banana-prompt-builder.ts
  → lib/nano-banana-client.ts (external API)
  → Polling loop
  → deductCredits() → Neon DB
  → Image stored in Neon + Vercel Blob
```

### Stripe/Payment Flow
```
New customer → /checkout/membership (page)
            → /api/stripe/create-checkout-session
            → Stripe hosted checkout
            → Stripe webhook → /api/webhooks/stripe
            → lib/stripe.ts (subscription upsert → Neon DB)
            → Welcome email via lib/email/

Portal: /studio?tab=settings → /api/stripe/create-portal-session
```

### Agent Orchestration (Maya Chat)
```
User message → /api/maya/chat (POST, streaming)
            → streamText() with Anthropic claude-sonnet-4-6
            → getMayaSystemPrompt() from lib/maya/mode-adapters.ts
            → getUserContextForMaya() from lib/maya/get-user-context.ts
            → [brand profile] from Neon DB
            → Stream response
            → Save chat via lib/data/maya.ts

If [GENERATE_CONCEPTS] detected in response:
            → generateConceptCardsViaAuthority()
            → Concept cards returned as inline UI data
```

### Stella Admin Agent Flow
```
Admin → /admin/agents (page) → chat UI
     → /api/admin/chat-with-agent
     → lib/stella/runtime.ts (stellaReply)
     → lib/admin/alex-system-prompt.ts (system prompt)
     → Anthropic with tool_use
     → lib/alex/tools/* (2 extracted tools + inline tools in runtime)
     → Tool results → next message turn
```

---

## RISK SUMMARY TABLE

| Risk | Severity | Category | Effort to Fix |
|------|----------|----------|---------------|
| DB access fragmentation (4 patterns, 244 direct imports) | 🔴 Critical | Architecture | Medium |
| Prompt authority god object (2,232 lines, 8+ overlapping systems) | 🔴 Critical | Architecture | High |
| 5 parallel Stripe metrics files (1,979 lines) | 🔴 High | Dead code | Low |
| Generation route aliases and confusion | 🔴 High | Architecture | Low |
| Alex refactor abandoned at 2/35 (dead lib) | 🔴 High | Dead code | Low |
| Feed system 4-way split | 🟡 Medium | Architecture | High |
| Feed planner v1/v2 coexistence | 🟡 Medium | Architecture | Medium |
| 60+ email templates (no single voice layer) | 🟡 Medium | Architecture | Medium |
| 26 unscheduled cron routes | 🟡 Medium | Hygiene | Low |
| 4 strategist modules (same pattern, different names) | 🟡 Medium | Architecture | Low |
| Twin/agent-coordinator with no active callers | 🟡 Medium | Dead code | Low |
| Auth middleware duplication across 450 routes | 🟡 Medium | Architecture | High |
| .bak / .disabled / .removed-endpoints files | 🟢 Low | Hygiene | Trivial |
| 8 unused npm packages (built-ins + dead auth libs) | 🟢 Low | Hygiene | Low |
| workbench feature flag (zero callers) | 🟢 Low | Dead code | Trivial |

---

## WHAT MUST NOT BREAK (Sacred Paths)

The following systems carry **production revenue and data** and must be treated with extreme caution in any refactor:

1. **`/api/webhooks/stripe`** — All subscription state lives here
2. **`/api/maya/chat`** — Core user experience, streaming
3. **`/api/maya/generate-image`** and **`/api/maya/generate-studio-pro`** — Billable generation
4. **`/api/training/*`** — User model training (long-running, irreversible)
5. **`lib/credits.ts`** + **`lib/stripe.ts`** — Billing logic
6. **`lib/supabase/`** — Auth sessions
7. **`middleware.ts`** — Auth gate for all routes
8. **`/api/cron/reconcile-subscriptions`** + **`reconcile-credits`** — Data integrity

---

## NEXT STEPS (Phase 2 — Awaiting Approval)

The following will be proposed as the clean architecture plan:

1. **Unified DB Client** — Single `lib/db/client.ts`, all routes import from there
2. **Collapsed Prompt Authority** — Flatten 8 builders → 2 (Classic prompt builder, Pro prompt builder) behind one exported interface
3. **Generation Route Consolidation** — `POST /api/generate` with `{ mode: "classic" | "pro" }` replacing 5 routes
4. **Stripe Metrics Cleanup** — Delete 4 of 5 versions, keep the simplest working one
5. **Email Voice Layer** — Single `lib/email/brand-voice.ts` applied at render time across all templates
6. **Alex/Stella rename** — Complete extraction or abandon the lib/alex/ project; unify under lib/stella/
7. **Auth Middleware** — Shared `withAuth(handler)` wrapper reducing 450 independent auth checks

**This document is Phase 1 output. No code has been changed.**

---

*Generated: 2026-03-03 | Audit branch: `refactor/architecture-stabilization-v1` | Source branch: `sprint/clean-architecture`*
