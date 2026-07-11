# CONTENT-BRIEF-UI-CLEANUP-01 — Remove the orphaned weekly-brief admin dashboard

**SHIPPED 2026-07-11** — commit `2878de8c`, deployed and READY in production. Deleted the 1,204-line
dashboard and its callerless admin API route; `/admin/content-brief` unchanged (still the three-tool
surface).

## Why

Found in the 2026-07-11 content-system audit, resolved by Claude (writing/product call, not a
technical bug): `components/admin/content-brief-client.tsx` was unmounted from
`/admin/content-brief` in the 2026-07-09 cleanup and has zero real importers left anywhere in the
codebase (verified by grep — the only other match for its name is a comment in
`lib/admin/safe-fetch-json.ts`, not an import). It was the only UI that could view a stored
`content_brief_weekly` report or queue a new one.

Decision: stay email-only. `weekly-content-brief-draft` (Claude Cowork, Mon 06:05) already reaches
Sandra reliably every week with a preview; there's no evidence she's ever needed to browse past
briefs, and `/admin/content-brief` was deliberately narrowed to Shoot Studio + the three generator
tools that day — restoring a fourth card there would undo that narrowing. Delete the dead code
instead of leaving it as unreachable clutter.

OWNER: codex

## Scope

- Delete `components/admin/content-brief-client.tsx`.
- Delete `app/api/admin/content-brief/route.ts` if, after deletion of the component above, it has
  no remaining live caller (check `app/api/cron/content-brief-jobs/route.ts` and anywhere else
  that references `api/admin/content-brief` first — do not delete if something still needs it).
- Do not touch `scripts/weekly-brief-prep.ts`, the `weekly-content-brief-draft` Cowork task, or the
  `content_brief_weekly` rows in `analytics_reports` — those stay exactly as they are, this is a
  dead-UI removal only.
- If `content-brief-jobs`'s cron route becomes fully unreachable as a result (nothing left to queue
  a job), note that in your PR summary rather than deleting the cron entry — that's covered by the
  separate `CONTENT-BRIEF-JOBS-GATE-01` task and the "Phase 2B content-engine deletion" held item
  in `tasks/README.md`.

## Acceptance

- `/admin/content-brief` renders identically to today (Shoot Studio, Carousel Kit, Story Sequences
  only) — this task removes dead code behind the scenes, it changes no visible behavior.
- `pnpm tsc` / build has no dangling references to the deleted files.
- Existing tests pass; no test currently covers the deleted component (confirmed — none found).
