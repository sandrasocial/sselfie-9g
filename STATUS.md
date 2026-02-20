# 📍 SSELFIE STATUS — Shared Handover File
**Protocol:** Codex updates this at the end of every session. Claude reads this at the start of every conversation.

---

## Last Updated
2026-02-20 15:06 CET — Updated by Codex (CLEANUP-01 complete)

## Last Task Completed
CLEANUP-01 complete

## What's Confirmed Live in Production
- All email crons paused (except reconcile/payment jobs):
- /api/cron/resolve-pending-payments
- /api/cron/reconcile-credits
- /api/cron/cron-health-check
- /api/cron/reconcile-feed-posts
- /api/cron/reconcile-ai-images
- /api/cron/reconcile-pro-photoshoot-grids
- /api/cron/reconcile-generations
- /api/cron/reconcile-subscriptions
- E-02 status: fixed/verified. `.env.local` and Vercel production both use `RESEND_AUDIENCE_ID=762d7ab8-7a72-40d1-8f26-9ddfcff52e73` (no mismatch found)
- Flodesk + Loops removed. Resend is the only email platform
- [x] Placeholder admin pages deleted
- Root docs archived to `docs/archive/root-cleanup-2026-02-20/` (38 root markdown files moved)

## What's Broken / Unconfirmed
- E-01: Subscriber count logic (DB shows 479 vs Resend 3,021) — not yet resolved
- E-03: 1,965 hard bounces in subscriber list — not yet cleaned
- Admin dashboard still contains links/redirects to removed pages (`/admin/project-tracker`, `/admin/feed-styles-v2`); pages are removed, links were not changed in CLEANUP-01 by scope

## Currently In Progress
- Nothing — awaiting next task from Claude

## Blocked On Sandra
- Nothing

## Next Task
CLEANUP-02 will cover Maya component audit (which header is live?)
Feed planner audit
Dead API route removal
