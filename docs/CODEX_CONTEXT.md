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

## Current focus areas

- **Marketing automation**: Resend segments + broadcast loops (restrictions: 2 req/sec, `marketing_send_queue`, Upstash locks). Fix 429s, missing segments, email performance reporting, and ensure daily funnel + weekly cohort automation outputs stay accurate.
- **Reconciliation pipelines**: `reconcile-generations`, `reconcile-subscriptions`, `reconcile-feed-posts` – ensure they log cleanly, handle Vercel Blob/Replicate transitions, and surface errors on the admin dashboard.
- **Executive visibility**: The dashboards under `app/(admin|diagnostics)` use cron output files; keep the instrumentation (funnel, cohort, triage) running and accurate.
- **Clawdbot / Stella**: Continue improving delegation rules, cost controls, and proactive monitoring; treat automation outputs as read-only unless requested.
- **State + memory**: Keep `docs/CODEX_CONTEXT.md`, `AGENTS.md`, and the new `State Summary Template` updated before branching.

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
