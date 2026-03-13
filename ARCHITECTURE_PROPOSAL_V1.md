# ARCHITECTURE PROPOSAL V1
> Historical proposal snapshot (2026-03-03). Not canonical operating truth.
> Canonical agent/system truth lives in `CLAUDE.md`, `docs/CODEX_CONTEXT.md`, and `docs/_CANONICAL/CURSOR_CONSTITUTION.md`.

**Branch:** `refactor/architecture-stabilization-v1`
**Date:** 2026-03-03
**Status:** AWAITING APPROVAL — no code has changed
**Prerequisite:** `ARCHITECTURE_AUDIT_V1.md` (Phase 1, committed same branch)

---

## Guiding Principle

> **Stability first. No new features. No UI redesign. No premature optimization.**
> Every proposed change must reduce risk, reduce surface area, or eliminate confusion.
> If a change doesn't directly serve one of those goals, it is out of scope.

---

## What This Proposal Covers

1. Target folder structure (simplified)
2. Prompt Authority Layer consolidation
3. Clear layer separation (engine / UI / adapters / payments / agent)
4. Dependency cleanup plan
5. Phased execution order with risk ratings

**What this does NOT cover:**
- Maya vision / new features (CLAUDE.md has that locked)
- Email campaigns or content
- Stripe pricing changes
- Any database schema changes

---

## 1. Target Folder Structure

### Current state (abbreviated pain points)
```
lib/
  maya/               ← 40+ files, mixes prompts/chat/context/utilities
    prompt-authority.ts     ← 2,232 lines, FROZEN
    prompt-constructor.ts   ← 826 lines, separate builder
    prompt-generator.ts     ← 654 lines, another builder (PromptGenerator class)
    nano-banana-prompt-builder.ts
    pro/prompt-architecture.ts
    prompt-components/      ← component-based system
    prompt-templates/       ← template-based system
  feed-planner/       ← v1 library
  feed-planner-v2/    ← v2 library (both active)
  stripe/
    stripe-live-metrics.ts       ← current?
    stripe-live-metrics-optimized.ts
    stripe-live-metrics-simple.ts
    stripe-live-metrics-old.ts   ← dead
    stripe-live-metrics-old2.ts  ← dead
  alex/               ← incomplete extraction (2/35 tools)
  neon.ts             ← DB singleton #1
  db.ts               ← DB singleton #2
  db-singleton.ts     ← DB singleton #3
  credits.ts          ← creates its OWN neon connection (4th pattern)
```

### Proposed target structure
The goal is not to move files — it's to establish **clear ownership** of each concern.

```
lib/
  db/
    client.ts         ← THE single DB export (sql). Replaces neon.ts, db.ts, db-singleton.ts.
                        credits.ts, and all 244 direct @neondatabase imports migrate here.

  auth/
    server.ts         ← getAuthenticatedUser() + getUserByAuthId() (already exists in auth-helper.ts)
    with-auth.ts      ← NEW: withAuth(handler) wrapper (reduces 129 duplicate auth blocks)
    impersonation.ts  ← move simple-impersonation.ts here

  generation/
    classic/
      route-handler.ts  ← consolidation of generate-image/route.ts (406 lines)
    pro/
      route-handler.ts  ← consolidation of generate-studio-pro/route.ts + pro/generate-image/route.ts
    prompt/
      index.ts          ← single export: buildPrompt(context, mode) — the new authority
      classic.ts        ← Flux LoRA builder (extracted from prompt-authority + prompt-constructor)
      pro.ts            ← NanoBanana builder (extracted from nano-banana-prompt-builder)
      types.ts          ← shared PromptGenerationContext, PromptResult
      audit.ts          ← audit logging (extracted from authority)
    replicate.ts        ← move replicate-client.ts, replicate-polling.ts, replicate-helpers.ts here

  stripe/
    client.ts           ← keep existing getStripe() singleton
    metrics.ts          ← ONE metrics file (choose stripe-live-metrics.ts, delete the other 4)
    membership.ts       ← keep membership-subscription-filter.ts, subscription-amount.ts
    webhooks.ts         ← webhook handling helpers

  email/
    sender.ts           ← consolidate send-email.ts + transactional-sender.ts + marketing-sender.ts
    templates/          ← keep all templates (60+ files, don't touch yet)
    voice.ts            ← NEW: single brand voice layer applied at render time
    sequences/          ← move sequence definitions here (out of templates/)

  maya/
    chat.ts             ← keep chat-orchestrator.ts logic
    context.ts          ← keep get-user-context.ts
    personality.ts      ← keep core-personality.ts (READ-ONLY — defines Maya's voice)
    mode-adapters.ts    ← keep (already clean: MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG)
    auto-select.ts      ← keep auto-select-mode.ts

  stella/               ← THE admin agent (rename from split alex/stella)
    runtime.ts          ← already exists, 111 lines — KEEP AS-IS
    charter.ts          ← already exists — KEEP AS-IS
    email-queue.ts      ← already exists — KEEP AS-IS
    tools/              ← migrate lib/alex/tools/* into here (the 2 extracted tools)
    ← DELETE lib/alex/ entirely once tools are migrated

  feed/                 ← unified feed library
    planner.ts          ← merge lib/feed-planner/ and lib/feed-planner-v2/ into one
    types.ts
    generation.ts

  credits.ts            ← keep, but migrate to use lib/db/client.ts instead of own neon()
```

**Migration approach:** Files move incrementally. No flag day. Each file gets a redirect comment pointing to the new location until all callers are updated, then the old file is deleted.

---

## 2. Prompt Authority Layer — Consolidation Plan

### The problem
`prompt-authority.ts` is marked `🧊 FROZEN` in its own header. The comment says:
> "Feed Planner will bypass this."

This means the "authority" is already not authoritative. There are now at least two prompt pipelines running in parallel:
- **Maya path:** through `prompt-authority.ts` (frozen, routes to `prompt-constructor` + `nano-banana-prompt-builder`)
- **Feed Planner path:** directly through `scene-resolver.ts` + `prompt-shaper.ts` (bypasses authority)

### What the consolidation accomplishes
Not a rewrite. A **seam extraction** — pulling the routing logic out of the 2,232-line file into a thin router, so the builders themselves become independently testable and replaceable.

```
BEFORE:
  route.ts → prompt-authority.ts (2,232 lines, frozen, does routing + building + auditing + hashing)

AFTER:
  route.ts → lib/generation/prompt/index.ts (thin router, ~100 lines)
               → classic.ts (Flux LoRA builder — same logic as today's prompt-constructor)
               → pro.ts    (NanoBanana builder — same logic as today's nano-banana-prompt-builder)
               → audit.ts  (logging — same logic as today's audit functions)
```

### What does NOT change
- Prompt outputs are identical
- No model changes
- No behavior changes
- Feed Planner's bypass path is not touched
- `prompt-authority.ts` stays intact until all callers have been migrated

### Migration steps (Phase 3B)
1. Create `lib/generation/prompt/types.ts` — extract shared interfaces from prompt-authority.ts
2. Create `lib/generation/prompt/audit.ts` — extract `auditLogMayaChatGeneration`, `createAuthorityAudit`, `logAudit`
3. Create `lib/generation/prompt/classic.ts` — thin wrapper around `buildPrompt()` from prompt-constructor
4. Create `lib/generation/prompt/pro.ts` — thin wrapper around `buildNanaBananaPrompt()` from nano-banana-prompt-builder
5. Create `lib/generation/prompt/index.ts` — the new router (100 lines max)
6. Migrate callers one by one, verifying prompt output identity
7. After all callers migrated: delete `prompt-authority.ts` (with documentation in CHANGELOG)

---

## 3. Layer Separation

### The five layers and what belongs where

```
┌─────────────────────────────────────────────────────┐
│  UI LAYER                                           │
│  components/**  app/(pages)/**                      │
│  React components, pages, client hooks              │
│  Rules: no direct DB, no Stripe SDK, no AI SDK      │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (fetch)
┌─────────────────────▼───────────────────────────────┐
│  API LAYER                                          │
│  app/api/**  (route.ts files)                       │
│  HTTP handlers only. Auth check → call lib → return │
│  Rules: max ~50 lines per route (currently avg 200) │
│         use withAuth() wrapper                       │
│         no inline business logic                     │
└─────────────────────┬───────────────────────────────┘
                      │ function calls
┌─────────────────────▼───────────────────────────────┐
│  CORE ENGINE                                        │
│  lib/**                                             │
│  All business logic lives here. Server-only.        │
│  Subdivisions:                                      │
│    lib/generation/  ← image generation pipelines   │
│    lib/email/       ← email sending                 │
│    lib/credits.ts   ← credit balance system         │
│    lib/feed/        ← feed planner                  │
│    lib/onboarding/  ← onboarding state              │
└──────┬──────────────┬──────────────────┬────────────┘
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼───────────┐
│ DB ADAPTER  │ │ AI ADAPTER │ │ PAYMENT ADAPTER    │
│ lib/db/     │ │ lib/ai/    │ │ lib/stripe/        │
│ client.ts   │ │ Anthropic  │ │ client.ts          │
│ Single sql  │ │ Replicate  │ │ webhooks.ts        │
│ export      │ │ OpenAI(embed)│ │ metrics.ts         │
└─────────────┘ └────────────┘ └────────────────────┘
```

### Agent Orchestration (Stella) sits alongside the Core Engine

```
┌─────────────────────────────────────────────────────┐
│  AGENT ORCHESTRATION                                │
│  lib/stella/                                        │
│  Admin-only. Uses Core Engine tools.                │
│  runtime.ts → charter.ts + tools/                  │
│  NOT accessible to end users                        │
└─────────────────────────────────────────────────────┘
```

**Key rule:** UI layer never imports from DB adapter directly. API layer never contains business logic. These rules are enforced by code review, not by file structure alone.

---

## 4. Dependency Cleanup Plan

### 4A — Dead npm packages (remove immediately, no callers)

| Package | Action | Why safe |
|---------|--------|---------|
| `console` (0.7.2) | Remove | Node built-in; no import found |
| `fs` (0.0.1-security) | Remove | Node built-in; no import found |
| `path` (0.12.7) | Remove | Node built-in; no import found |
| `crypto` (latest) | Remove | Node built-in; no import found |
| `neon` (2.0.0 standalone) | Remove | Different from `@neondatabase/serverless`; no import found |
| `@stackframe/stack` | Remove | Zero imports in active code |
| `next-auth` | Remove | Codebase has a comment explicitly saying it is NOT used |
| `@auth/core` | Remove | Zero imports in active code |

**Execution:** Single `pnpm remove` command. Run `pnpm build` to confirm no breakage.

### 4B — Dead files (delete with git rm, message in commit)

| File | Action | Evidence |
|------|--------|---------|
| `lib/stripe/stripe-live-metrics-old.ts` | Delete | Named "old", 650 lines |
| `lib/stripe/stripe-live-metrics-old2.ts` | Delete | Named "old2", 387 lines |
| `app/api/maya/generate-classic/route.ts` | Delete | 3-line alias — update callers to use generate-image directly |
| `app/api/maya/generate-pro/route.ts` | Delete | 3-line alias — update callers to use generate-studio-pro directly |
| `app/api/.removed-endpoints/` | Delete | Already "removed" in name; history preserved in git |
| `app/api/cron/cold-reeducation-sequence/route.ts.disabled` | Delete | Explicitly disabled |
| `app/api/maya/pro/chat/route.ts.bak` | Delete | Backup file |
| `app/academy/success/page.tsx.bak` | Delete | Backup file |
| `lib/alex/` | Delete after migrating 2 extracted tools to `lib/stella/tools/` | Abandoned refactor |

**Before deleting any file:** verify zero imports with grep. Document in CHANGELOG.md.

### 4C — DB singleton consolidation (migrate, then delete)

**Target:** `lib/db/client.ts` (new file) exports `sql`. All 4 current patterns migrate to it.

**Migration order** (lowest risk first):
1. Update `lib/credits.ts` to import `sql` from `lib/db/client.ts` (currently creates its own connection)
2. Update `lib/neon.ts` to re-export from `lib/db/client.ts` (backwards-compatible redirect)
3. Update `lib/db-singleton.ts` to re-export from `lib/db/client.ts`
4. Update `lib/db.ts` to re-export from `lib/db/client.ts`
5. Migrate the 55 `@/lib/db` imports (batch, file by file)
6. Migrate the 244 direct `@neondatabase/serverless` imports (largest batch, do last)
7. Delete the 3 old singleton files

**Risk gate:** After step 1, run the production reconcile crons in staging. After step 4, run full test suite. Only proceed to step 5 after step 4 passes.

---

## 5. Phased Execution Plan

### Phase 3A — Zero-Risk Hygiene (no approval needed per file, just execute)
*Estimated effort: 2-4 hours. Zero risk of breakage.*

| Task | Command / Action |
|------|-----------------|
| Remove 8 dead npm packages | `pnpm remove console fs path crypto neon @stackframe/stack next-auth @auth/core` |
| Delete 2 old Stripe metrics | `git rm lib/stripe/stripe-live-metrics-old.ts lib/stripe/stripe-live-metrics-old2.ts` |
| Delete .bak files | `git rm app/api/maya/pro/chat/route.ts.bak app/academy/success/page.tsx.bak` |
| Delete .disabled cron | `git rm app/api/cron/cold-reeducation-sequence/route.ts.disabled` |
| Delete .removed-endpoints | `git rm -r app/api/.removed-endpoints/` |
| Delete generate-classic alias | Update callers → `git rm app/api/maya/generate-classic/route.ts` |
| Delete generate-pro alias | Update callers → `git rm app/api/maya/generate-pro/route.ts` |

**Gate:** `pnpm build` passes. No new TypeScript errors.

---

### Phase 3B — Structural Consolidations (low risk, medium effort)
*Execute after 3A is merged. Each step is independently committable.*

| Task | Files affected | Risk |
|------|---------------|------|
| Create `lib/db/client.ts`, migrate credits.ts | 2 files | Low |
| Migrate `lib/neon.ts` + `lib/db.ts` + `lib/db-singleton.ts` to re-exports | 3 files | Low |
| Migrate `lib/alex/` 2 extracted tools → `lib/stella/tools/` | 2 files | Low |
| Delete `lib/alex/` stubs | ~30 files | Low (stubs only) |
| Choose canonical Stripe metrics: confirm which is in use, delete other 2 | 3 files | Low |
| Create `withAuth()` wrapper, migrate 10 most common routes as pilot | 11 files | Medium |
| Migrate remaining DB `@/lib/db` imports (55) to `lib/db/client.ts` | 55 files | Medium |

**Gate:** After each step — `pnpm build`, `pnpm test`, manual smoke test on preview deployment.

---

### Phase 3C — Major Consolidations (medium risk, must be done carefully)
*Only after 3B is fully merged and verified on preview.*

**⚠️ These touch generation pipelines and the prompt layer. STOP for review if anything looks wrong.**

| Task | Complexity | Sacred path risk |
|------|-----------|-----------------|
| Extract `lib/generation/prompt/types.ts` from prompt-authority | Low | None (types only) |
| Extract `lib/generation/prompt/audit.ts` | Low | None (logging only) |
| Create `lib/generation/prompt/classic.ts` (thin wrapper) | Low | Classic generation |
| Create `lib/generation/prompt/pro.ts` (thin wrapper) | Low | Pro generation |
| Create `lib/generation/prompt/index.ts` (router) | Medium | Both generation paths |
| Migrate callers from prompt-authority to new index | Medium | Both generation paths |
| Migrate 244 direct @neondatabase imports to lib/db/client.ts | High | All DB operations |
| Delete prompt-authority.ts after full migration | Medium | After verification only |

**Sacred path protection:** Before ANY 3C change, the generation routes must have integration tests covering:
- Classic generation: request → Replicate → polling → image saved
- Pro generation: credit check → NanaBanana → image saved → credit deducted
- Maya chat: streaming response with [GENERATE_CONCEPTS] trigger

---

## 6. What We Are NOT Changing

To prevent scope creep, these items are explicitly out of scope for this stabilization sprint:

| Item | Reason |
|------|--------|
| Email templates (60+) | Functional, no bugs reported |
| Feed Planner v1/v2 split | Works in production, consolidation is Phase 4 |
| Maya chat system prompt | FROZEN by design |
| Cron route scheduling | Separate operational decision |
| Twin/agent-coordinator | Needs separate decision: keep or delete |
| Admin routes (200+) | No active issues reported |
| UI components (250) | No scope for redesign |
| Stripe pricing | Revenue-critical, Sandra decides |

---

## Approval Checklist

Before proceeding to Phase 3, confirm:

- [ ] Sandra has reviewed this proposal
- [ ] Phase 3A scope is approved (hygiene deletions)
- [ ] Phase 3B scope is approved (structural consolidations)
- [ ] Phase 3C scope is approved (prompt layer + DB migration) — can approve separately
- [ ] Preview deployment exists and is accessible for smoke testing
- [ ] `pnpm test` baseline is confirmed passing on `sprint/clean-architecture`

**Once you approve, Phase 3A begins. Phases 3B and 3C each need explicit approval before execution.**

---

*Generated: 2026-03-03 | Proposal branch: `refactor/architecture-stabilization-v1` | No code changed.*
