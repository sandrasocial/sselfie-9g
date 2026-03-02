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

## Current focus areas (updated 2026-03-02)

- **Email system reboot**: `nurture-sequence` cron needs full rewrite for `freebie_brand_strategies` table (new freebie). New timing: Day 2/5/9/14/20. New templates: N1-N5. Task spec: `tasks/codex-EMAIL-SYSTEM-AUDIT-AND-REBOOT-2026-03-02.md`
- **Freebie funnel**: New freebie live at `/freebie/brand-strategy`. DB table: `freebie_brand_strategies`. Upsell fix SHIPPED commit `39bf931` — `?checkout=studio_membership` now correctly redirects. Source tag: `source=freebie-strategy` in Resend.
- **Agent V1** (Website Agent €27/mo): Spec at `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`. Waiting Sandra go/no-go.
- **Academy**: Monthly drops E2E blocked — no published rows in `academy_monthly_drops` table. Marked in STATUS.md commit `4b28007a`.
- **Reconciliation pipelines**: `reconcile-generations`, `reconcile-subscriptions`, `reconcile-feed-posts` — keep running and logging cleanly.
- **State + memory**: `CLAUDE.md` (root) is the single source of truth. `AGENTS.md` for Stella's rules. `docs/CODEX_CONTEXT.md` for tech context. North's SHARED_MEMORY.md and NORTH_TASK_QUEUE.md are RETIRED.

## File map (anchor points for future work)

| Area | Notes |
| --- | --- |
| `app/api/cron/*` | Vercel API routes that power daily/weekly automations, reconciliation, marketing sequences, email triggers, and diagnostics. |
| `lib/email/` | Marketing queue, marketing-runner, Resend integration (broadcasts + contact sync), email templates, and helper config. |
| `lib/cron-logger.ts`, `lib/admin-error-log.ts` | Shared logging helpers used by every cron; failures feed into `output/automation/*`. |
| `lib/cache.ts` | Upstash Redis lock + cache helpers – critical for handling Resend rate limits and marketing-runner locks. Make sure Upstash env vars exist in both env.local and Vercel production. |
| `output/automation/` | Automation outputs (health reports, triage, cleanup). Treat these as immutable logs; refer to them when diagnosing incidents. |
| `scripts/` | Diagnostic + onboarding scripts (Resend tests, automation instrumentation). Run them to double-check behavior before code changes. |
| `docs/` | Strategy + context docs (read `STRATEGIC_CLEANUP_RECOMMENDATION.md`, `MASTER_COMMAND_CENTER.md`, etc.) before altering automation flows. |
| `docs/features/` | **Per-feature source of truth** for research and implementation: `maya.md`, `feed-planner.md`, `gallery.md`, `academy.md`, `profile.md`, `admin.md`. **Research agents:** read the relevant feature doc, then fill "Current value / pain" and "Opportunities" using `output/automation/funnel-digest-*.md`, `output/automation/support-digest-*.md`, and feedback. See `docs/features/README.md` for how to use. |
| `docs/codex-tasks/` | **Implementation task list for Codex.** Read `RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md` for the current 11 prioritized tasks (A-01 → E-03). Start here for implementation work. |
| `docs/in-app-funnel/` | **Research deliverables for in-app journey + Academy funnel integration** (produced Feb 2026). Read these before implementing tasks A-01, C-01, C-02, C-03: `01-journey-map-2026-02-25.md` (4-stage funnel map), `02-content-copy-2026-02-25.md` (all CTAs, Maya system prompts, email copy), `03-designs-wireframes-2026-02-25.md` (mobile wireframes for Academy tab, post-purchase modal, Maya guided path), `04-prioritized-list-2026-02-25.md` (3-slice sprint plan + open questions for Sandra), `05-slice-1-verification-checklist.md` (QA checklist for Slice 1 tasks). |

## Current state — Research Sprint Feb 2026

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
5. **Worktrees & automations hygiene** – keep worktrees topic-specific (`worktree-{topic}`), avoid creating multiples unless needed, and archive/close automations only when fully resolved. Automation files (`$CODEX_HOME/automations`) remain read-only unless explicitly requested.

## Automation/Lock hygiene reminders

1. **Locking** – `marketing-runner` relies on Upstash locks; `MARKETING_REQUIRE_UPSTASH_LOCKS` defaults to true. If Upstash is unavailable, logs should show `Upstash KV lock required but not configured` and the run should bail without performing broadcasts.
2. **Resend rate limits** – respect 2 req/sec by spacing `syncMarketingContacts` requests (already uses `CONTACT_UPDATE_DELAY_MS`), but GraphQL + broadcast creation also need guardrails. Use `resendFetchWithRetry` and record `retry-after` headers when 429s happen.
3. **Cron failure logging** – Cron routes use `createCronLogger` and `logAdminError`. When a failure occurs, the `output/automation` logs capture error IDs. Always reference these before touching the underlying logic.

## Automation/State hygiene go-forward

- Keep `docs/CODEX_CONTEXT.md` updated with new automations, dev notes, and operating-procedure updates.
- When in doubt, run `scripts/check-production-status.ts` or the appropriate automation and cite the report in follow-ups.
- Every change touching cron logic should include a mention of the relevant automation file (`output/automation/...`) so we preserve traceability.
