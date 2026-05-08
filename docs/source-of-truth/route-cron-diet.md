# Route And Cron Diet

Last updated: 2026-05-08

This file records the Phase 5 cleanup state. It is source-of-truth for cron ownership and route cleanup evidence until a later cleanup phase replaces it.

## Baseline

- `pnpm routes:inventory` before deletion: 461 API route handlers.
- `vercel.json` schedules 18 cron paths.
- `app/api/cron` had 27 route files before deletion.
- The old Maya dead-path map is stale. `app/api/maya/feed`, `feed-chat`, `feed-progress`, and `generate-all-feed-prompts` are already absent. `generate-feed` and `generate-feed-prompt` are live and must stay.

## Five Cron Bundles

| Bundle | Owns |
| --- | --- |
| `payment_resolution` | Pending payment settlement and checkout reconciliation. |
| `generation_reconciliation` | Maya generation status, generated files, and asset reconciliation. |
| `subscription_credits_reconciliation` | Studio subscriptions, membership state, and credit balance repair. |
| `lifecycle_email` | Customer onboarding, nurture, win-back, referrals, newsletters, and audience segments. |
| `health_reporting` | System health, funnel reporting, revenue reporting, Maya trend reports, and internal diagnostics. |

The machine-readable ownership map lives in `lib/cron/ownership.ts`. `pnpm routes:classify` prints current classification counts and the bundle summary.

## Deleted In Phase 5

These were disabled no-op cron routes, absent from `vercel.json`, and had no live `app`, `components`, `lib`, `hooks`, `scripts`, or admin caller references.

| Removed path | Current owner |
| --- | --- |
| `/api/cron/blueprint-email-sequence` | `/api/cron/blueprint-followup-sequence` |
| `/api/cron/welcome-back-sequence` | `/api/cron/win-back-sequence` |
| `/api/cron/welcome-sequence` | `/api/cron/onboarding-sequence` |

## Kept For Now

These cron routes are not scheduled in `vercel.json`, but they are retained as manual/internal diagnostics until production usage and admin workflows are reviewed in a later pass:

- `/api/cron/arpu-churn-weekly`
- `/api/cron/backfill-resend-audience`
- `/api/cron/cohort-delivery-load-weekly`
- `/api/cron/cohort-report-weekly`
- `/api/cron/product-qa-daily`
- `/api/cron/reindex-codebase`

## Customer And Maya Guardrails

Phase 5 tests now protect the canonical customer access ladder and live Maya generation routes from accidental route cleanup. The protected customer surfaces are Free Selfie Guide, Starter Kit, Masterclass, Studio, 1:1, Academy, checkout session creation, checkout session polling, and checkout user status. The protected Maya routes include classic and Pro feed/image generation plus generation polling.
