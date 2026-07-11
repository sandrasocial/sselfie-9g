# CONTENT-BRIEF-JOBS-GATE-01 — Gate the content-brief-jobs cron

**SHIPPED 2026-07-11** — commit `9dfb08df`, deployed and READY in production.

## Why

Found in the 2026-07-11 content-system audit. `app/api/cron/content-brief-weekly/route.ts` is
correctly gated off via `envFlag("CONTENT_BRIEF_ENABLED")` (confirmed `false` in Vercel prod), but
its sibling `app/api/cron/content-brief-jobs/route.ts` (runs every 5 minutes per `vercel.json`) has
no such gate at all. It currently no-ops only because nothing can queue a `content_brief_jobs` row
— the one UI button that could (`components/admin/content-brief-client.tsx`, "Queue this week's
brief") was unmounted from `/admin/content-brief` in the 2026-07-09 cleanup and is not reachable
from any nav. That makes this a live, unguarded code path sitting behind a currently-unreachable
trigger — a landmine if that UI ever comes back without this fix landing first.

`weekly-content-brief-draft` (Claude Cowork scheduled task, Mon 06:05) is the replacement system
for this whole pipeline and is not affected by this change.

OWNER: codex

## Scope

- Add the same `envFlag("CONTENT_BRIEF_ENABLED")` gate used in `content-brief-weekly/route.ts` to
  `app/api/cron/content-brief-jobs/route.ts`, short-circuiting the same way
  (`{ generated: false, skipped: "disabled" }` or equivalent — match the existing pattern exactly).
- Do not touch `lib/content-engine/brief-jobs.ts` or the underlying pipeline logic — this is a gate
  only, not a rewrite.
- Do not remove the cron entry from `vercel.json` — that's part of the separate "Phase 2B
  content-engine deletion" held item in `tasks/README.md`, not this task.

## Acceptance

- `content-brief-jobs` short-circuits identically to `content-brief-weekly` when
  `CONTENT_BRIEF_ENABLED` is unset or `false`.
- No behavior change when the flag is `true` (dev/local testing unaffected).
- Existing tests pass; add one test asserting the gate short-circuits, mirroring however
  `content-brief-weekly`'s gate is tested if a test exists for it.
