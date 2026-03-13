# CODEX_CONTEXT

## Purpose

- Record the live stack so every new thread can start from a shared, trusted memory vault.
- Surface the operational constraints (Vercel-only, live users, low budget) and current priorities (marketing automation, email reliability, monitoring).
- Offer a reusable "State Summary Template" so future threads can quickly resume context without rereading every message.

## Tech stack overview

- **Frontend**: Next.js 16, React 19, Sonner for notifications, Recharts for charts, Tailwind + custom typography.
- **Backend**: Edge API routes on Vercel, Neon Postgres (via `@neondatabase/serverless`), Stripe for billing, Resend for email, Replicate/Upstash for AI and caching, Vercel Blob for media.
- **AI agents**: Claude/Clawdbot + Stella (via plugins), Codex Desktop, OpenAI/Anthropic APIs, Replicate for Maya, Gumloop/Loops integrations for automations.
- **Tooling**: pnpm, tsx for scripts, Vitest/Playwright/Super + email scripts under `scripts/` for diagnostics, `knip.ts` cleanup configs.

## Key constraints / guardrails

1. **Vercel-only hosting** – no alternative infra; deployments go through the `main` branch + automatic Vercel deploys.
2. **Live users** – minimize blast radius: use read-only inspections before writes, keep cron secrets protected, never run `git reset --hard` or revert unexpected changes.
3. **Budget-tight** – API and cron cost control matters (prompt caching, Upstash locks, limited replicate usage). Avoid expensive broad rebuilds unless absolutely necessary.
4. **Test-first mindset** – for bugfixes write a repro or failing test before patching. If automated tests don't exist, document the manual steps and regressions.
5. **No broad refactors** without explicit ask; focus on localized changes that support diagnostics, automations, or reliability.

## Current focus areas (updated 2026-03-11)

- **V-02 funnel hardening**: Paid Selfie Guide + Brand Strategy flow is the live acquisition ladder. `/freebie/*` routes redirect to paid pages, `brand_strategy_pack` uses post-payment setup tokens, and the Selfie Guide checkout now offers Brand Strategy as a Stripe optional item.
- **Email system cleanup**: Live lifecycle paths are `onboarding-sequence`, `nurture-sequence`, and `win-back-sequence`. The old manual/scheduled campaign catalog, archived cron copies, and dead funnel templates were removed on 2026-03-09 to reduce agent confusion.
- **Maya UX stabilization**: Shipped 2026-03-11 (commit `b950f1db`). Source of truth: `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`. Locked surface: `Photos`, `Videos`, `Train` tabs only — no Feed tab, no new top tabs. Mode toggle (`MY MODEL / SELFIE`) is now visible to all Photos tab users. Mode-aware quick prompts live in `lib/maya/prompt-contract.ts`. Maya's system prompt always receives a `CURRENT GENERATION MODE` block so she can guide users to the toggle. Pro concept card JSONB save now passes `chatId` as fallback. Do not add new Maya tabs or `chat_type` values without DB migration + load/save/new-chat/renderer/test coverage. Still open: Videos tab full Maya-guided flow rebuild; chat tab prompt-scope cleanup.
- **Automation layer**: Codex Desktop automations were rebuilt on 2026-03-10 into 7 engine loops: Product Health, User Journey, Maya Quality, Brand Consistency, Growth Intelligence, Code Stability, and Revenue Intelligence. Legacy report-only automations were archived out of the active folder. The User Journey Engine now runs a repo-owned Playwright smoke (`pnpm automation:journey-smoke`) before deeper diagnosis and a filtered activation check (`node scripts/product-qa-digest.mjs`) for `signup -> first Maya output`. The Maya Quality Engine runs `pnpm audit:maya-quality`, and the Brand Consistency Engine runs `pnpm audit:brand-consistency`. Source of truth: `docs/automation/SSELFIE_AUTOMATION_CORE_2026-03-10.md`.
- **Agent V1** (Website Agent €27/mo): Spec at `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`. Waiting Sandra go/no-go.
- **Academy**: Monthly drops E2E blocked — no published rows in `academy_monthly_drops` table. Marked in STATUS.md commit `4b28007a`.
- **Reconciliation pipelines**: `reconcile-generations`, `reconcile-subscriptions`, `reconcile-feed-posts` — keep running and logging cleanly.
- **State + memory**: `CLAUDE.md` (root) is the single source of truth for business direction, active products, and operating rules. `AGENTS.md` holds Stella's rules. `docs/CODEX_CONTEXT.md` holds tech context. Dynamic metrics such as MRR, subscriber counts, active paying totals, discount cohorts, and current prices must come from live Stripe, Resend, Neon, or production checks, not from documentation. North's canonical chain: CLAUDE.md → CODEX_CONTEXT.md → NORTH_ACTIVE.md → STATUS.md (technical only). Task list: `~/stella/ACTIVE/tasks/`. `SHARED_MEMORY.md` is handoff-only; `BUSINESS_STATE.md` and `NORTH_TASK_QUEUE.md` are retired. See `docs/_CANONICAL/AGENT_TRUTH_MODEL.md` for full authority and handoff contract.

## File map (anchor points for future work)

| Area | Notes |
| --- | --- |
| `app/api/cron/*` | Vercel API routes that power daily/weekly automations, reconciliation, marketing sequences, email triggers, and diagnostics. |
| `lib/email/` | Marketing queue, marketing-runner, Resend integration (broadcasts + contact sync), email templates, and helper config. |
| `lib/cron-logger.ts`, `lib/admin-error-log.ts` | Shared logging helpers used by every cron; failures feed into `output/automation/*`. |
| `lib/cache.ts` | Upstash Redis lock + cache helpers – critical for handling Resend rate limits and marketing-runner locks. Make sure Upstash env vars exist in both env.local and Vercel production. |
| `output/automation/` | Automation outputs (health reports, triage, cleanup). Treat these as immutable logs; refer to them when diagnosing incidents. |
| `scripts/` | Diagnostic + onboarding scripts (Resend tests, automation instrumentation). Includes `user-journey-smoke.ts` for headless public funnel validation, `maya-quality-audit.ts` for Maya prompt/tool drift, `brand-consistency-audit.ts` for voice/design drift, and `verify-onboarding-segment-env.ts` for real Resend segment drift checks. Run them to double-check behavior before code changes. |
| `docs/` | Strategy + context docs (e.g. `docs/automation/`, `docs/features/`, `docs/_CANONICAL/`). Archived strategy docs in `docs/archive/root-cleanup-2026-02-20/` if needed. |
| `docs/features/` | **Per-feature source of truth** for research and implementation: `maya.md`, `feed-planner.md`, `gallery.md`, `academy.md`, `profile.md`, `admin.md`. **Research agents:** read the relevant feature doc, then fill "Current value / pain" and "Opportunities" using `output/automation/funnel-digest-*.md`, `output/automation/support-digest-*.md`, and feedback. See `docs/features/README.md` for how to use. |
| `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md` | Current Maya stabilization and UX recovery program. Read before changing Maya tabs, chat types, quick prompts, or handoff behavior. |
| `lib/maya/prompt-contract.ts` | **Single source of truth for Maya quick prompts and input placeholder.** Mode-aware: prompts differ by `proMode` and `hasTrainedModel`. Edit here when changing chips or placeholder copy — do not hardcode prompts in components. |
| `lib/maya/tab-scope.ts` | Tab-scoped chat type resolution and cross-tab intent detection (`resolveMayaTabHandoff`). Controls `isMayaTabScopedChatEnabled` feature flag. |
| `lib/maya/tool-markers.ts` | Parser/stripper for Maya inline tool markers (`[GENERATE_CONCEPTS]`, `[CREATE_ASSET]`, `[MAYA_GAP_OFFER]`, `[SWITCH_MAYA_TAB]`, etc.). Add new markers here. |
| `docs/codex-tasks/` | **Implementation task list for Codex.** Read `RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md` for the current 11 prioritized tasks (A-01 → E-03). Start here for implementation work. |
| `docs/in-app-funnel/` | **Research deliverables for in-app journey + Academy funnel integration** (produced Feb 2026). Read these before implementing tasks A-01, C-01, C-02, C-03: `01-journey-map-2026-02-25.md` (4-stage funnel map), `02-content-copy-2026-02-25.md` (all CTAs, Maya system prompts, email copy), `03-designs-wireframes-2026-02-25.md` (mobile wireframes for Academy tab, post-purchase modal, Maya guided path), `04-prioritized-list-2026-02-25.md` (3-slice sprint plan + open questions for Sandra), `05-slice-1-verification-checklist.md` (QA checklist for Slice 1 tasks). |
| `docs/automation/` | Automation operating model and engine inventory. Read `SSELFIE_AUTOMATION_CORE_2026-03-10.md` before changing Codex Desktop automations or platform maintenance loops. |
| `skills/sselfie-maya-os/` | **Shared agent skill for Maya-first operating model.** Contains canonical user journey, screen map, scaling playbook, and QA checklist for funnel/frontend changes. |

## Current state — Research Sprint Feb 2026

Historical sprint snapshot below. Do not treat numeric values in this section as current business truth; verify live before quoting in decisions.

```
Context: Research sprint completed 2026-02-25. All 6 feature docs now have §7 and §8 filled.
  11 Codex implementation tasks created. 4 in-app funnel research deliverables produced.
Last actions:
  - 6 parallel subagents filled §7 (Current value/pain) + §8 (Opportunities) in maya.md,
    feed-planner.md, gallery.md, academy.md, profile.md, admin.md using funnel/support digests.
  - Created docs/codex-tasks/RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md with 11 tasks
    (A-01 to E-03), prioritized by impact.
  - Created docs/in-app-funnel/ with 5 files: journey map, content/copy, wireframes,
    prioritized sprint plan, and Slice 1 QA checklist.
Files touched: docs/features/*.md (§7/§8 only), docs/codex-tasks/*, docs/in-app-funnel/*
Outstanding issues:
  - 0% first-output activation (0/14 new users generated; 3 days in a row)
  - Feed Planner wizard: 1 "Continue" click in 3 days — wizard is the activation cliff
  - Academy mini-products not surfaced in-app after purchase
  - 80 unresolved credit_transaction rows missing stripe_payment_id (historical)
  - B-03 (Prompts Tab) blocked until Sandra approves a list of 10–15 Nano Banana Pro prompts
  - 5 open questions for Sandra in docs/in-app-funnel/04-prioritized-list-2026-02-25.md §6
Next steps: Codex implements tasks in order: A-01 → A-02 → B-01 → E-01/02/03 → B-02 → B-03 → C-01 → C-02 → C-03 → D-01 → D-02. Read docs/in-app-funnel/ before A-01, C-01, C-02, C-03.
```

## Operating procedure for Codex + Sandra

1. **Ask vs assume** – if the request references files or behavior not already in context, ask for the minimal additional file(s) needed instead of blindly loading an entire tree.
2. **Scope tasks** – keep each turn focused on a single topic. Limit touched files to those directly impacted by the requested change or investigation.
3. **Plan → Implement → Test → Summarize loop**:
   - Plan: Outline goal + steps before coding.
   - Implement: Apply targeted edits (using `apply_patch` / scripts). Keep individual commits small.
   - Test: Run targeted lint/test commands (even manual POST requests) and log results.
   - Summarize: Share what changed, tests run, and next steps in the final message.
4. **State Summary Template** – include this block at the start of every new thread/request you open:
   ```
   Context: [What we were looking at]
   Last actions: [Commands/run results plus their purpose]
   Files touched: [List of files + short reason]
   Outstanding issues: [Known metrics failing / errors still open]
   Next steps: [What will happen next]
   ```
   Mention this template in new threads and keep it synchronized with `docs/CODEX_CONTEXT.md`.
5. **Worktrees & automations hygiene** – keep worktrees topic-specific (`worktree-{topic}`), avoid creating multiples unless needed, and archive/close automations only when fully resolved. Automation files (`$CODEX_HOME/automations`) are operational config and should only be edited on explicit automation requests.

## Automation/Lock hygiene reminders

1. **Locking** – `marketing-runner` relies on Upstash locks; `MARKETING_REQUIRE_UPSTASH_LOCKS` defaults to true. If Upstash is unavailable, logs should show `Upstash KV lock required but not configured` and the run should bail without performing broadcasts.
2. **Resend rate limits** – respect 2 req/sec by spacing `syncMarketingContacts` requests (already uses `CONTACT_UPDATE_DELAY_MS`), but GraphQL + broadcast creation also need guardrails. Use `resendFetchWithRetry` and record `retry-after` headers when 429s happen.
3. **Cron failure logging** – Cron routes use `createCronLogger` and `logAdminError`. When a failure occurs, the `output/automation` logs capture error IDs. Always reference these before touching the underlying logic.

## Automation/State hygiene go-forward

- Keep `docs/CODEX_CONTEXT.md` updated with new automations, dev notes, and operating-procedure updates.
- When in doubt, run `scripts/check-production-status.ts` or the appropriate automation and cite the report in follow-ups.
- Every change touching cron logic should include a mention of the relevant automation file (`output/automation/...`) so we preserve traceability.
