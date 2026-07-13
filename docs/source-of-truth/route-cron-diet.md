# Route and cron ownership — superseded

Last updated: 2026-07-13

This May 2026 inventory is no longer an operating source. Its duplicate TypeScript ownership
registry drifted away from the deployed configuration and was removed.

Use only:

- `vercel.json` for the exact routes Vercel schedules;
- `docs/AUTOMATION_ROSTER.md` for purpose, ownership, status, and cross-layer automation rules;
- `tests/growth-machine-cron-shutdown.test.ts` and repository verification for protected and
  retired schedule guardrails.

Do not recreate a second hand-maintained cron registry. The live Maya
`app/api/maya/generate-feed-prompt/` route is shared with Feed Planner and must not be removed.
