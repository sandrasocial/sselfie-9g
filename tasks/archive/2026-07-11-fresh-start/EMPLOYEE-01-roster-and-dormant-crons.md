# EMPLOYEE-01 — Wake the dormant employees + make the team visible

Date: 2026-07-08
Owner: Codex
Priority: 2

## Problem (verified by audit 2026-07-08)

Sandra has ~25 live automated systems but can't see them working, and several built systems
never got scheduled or read:

1. `app/api/cron/product-qa-daily/route.ts` (daily bug/reliability report: failed crons, admin
   errors, email bounces, stuck generations, topRisks) is NOT in `vercel.json` and its output in
   `analytics_reports` is read by nothing. A bug-catcher employee that was hired and never given
   a desk.
2. `app/api/admin/diagnostics/cron-status/route.ts` and `app/api/admin/diagnostics/errors/route.ts`
   work but no admin page consumes them.
3. Resend bounce/complaint webhook (`app/api/webhooks/resend/route.ts`) logs to `email_logs` but
   never alerts anyone.
4. **The DM bridge has captured ZERO messages all-time** (`ig_conversations` and `ig_messages`
   both empty as of 2026-07-08; no Sentry errors for the route). ManyChat's Default Reply flow is
   evidently not POSTing to `/api/webhooks/manychat-inbound`. Nothing surfaced this silence for
   a month.
5. Prod env value `IG_AGENT_AUTO_SEND_ENABLED` is `"false\n"` (newline-poisoned, same class as
   the June APP_V3_PORTRAIT_SIZE incident). Harmless today (intended false) but the env-boolean
   read pattern is fragile.

## Scope

### A. Schedule + surface product-qa-daily

- Add `/api/cron/product-qa-daily` to `vercel.json` (run ~05:55, before the 06:15 briefing).
- Daily Sandra Briefing (`lib/admin/daily-sandra-briefing.ts`): add a compact "System health"
  section reading the latest product-qa report from `analytics_reports` — top risks only, plain
  language, max 3 lines, omit the section entirely when healthy. Source label per Admin Data
  Contract.

### B. Wire diagnostics into the existing admin Tools surface

- Admin Data Contract rule 5 (no new page without removing one): add a "Team" panel to the
  EXISTING `/admin` tools area, consuming the two existing diagnostics APIs. Per system: name,
  role, last run, last result, output destination. Include a "DM bridge" row whose value is
  messages captured last 7 days (currently 0 — that silence must be visible).

### C. Alert on deliverability damage

- In the Resend webhook handler: when bounces+complaints in the trailing 24h exceed a threshold
  (env `EMAIL_BOUNCE_ALERT_THRESHOLD`, default 10) send ONE admin alert email (reuse
  `admin_alert_sent` cooldown pattern from cron-health-check). Alert-only, per the one-daily-email
  rule.

### D. Env-boolean hardening

- Add a tiny `envFlag(name, default)` helper that trims whitespace/newlines before comparing to
  "true"/"false"; migrate the automation flags found in the audit (`IG_AGENT_AUTO_SEND_ENABLED`,
  `IG_AGENT_AI_DRAFTS_ENABLED`, `*_NURTURE_ENABLED`, `*_RECOVERY_ENABLED`,
  `DAILY_SANDRA_BRIEFING_ENABLED`, `CONTENT_BRIEF_ENABLED`, `SUITE_HABIT_EMAILS_ENABLED`,
  `SUBSCRIBER_WINBACK_ENABLED`, etc.) to it. Also ask Sandra/Claude to re-save the poisoned
  Vercel value (ops step, note in PR description).

### E. Leave dormant-by-choice things dormant

`reindex-codebase`, `refresh-segments`, `sync-audience-segments`, `backfill-resend-audience`,
`referral-bonus-notifications`, `maya-instagram-trends-weekly` stay unscheduled for now — list
them in the Team panel as "paused" so they're at least visible. Do not schedule them in this task.

## NOT in scope (Sandra-attended, separate)

Re-wiring ManyChat's Default Reply → bridge webhook. That's a ManyChat UI task requiring
Sandra's logged-in session; the Team panel just has to make the silence visible until it's done.

## Acceptance

- product-qa-daily appears in vercel.json and its topRisks reach the daily briefing (test with a
  seeded analytics_reports row).
- Team panel renders live data from both diagnostics endpoints incl. the DM-bridge zero-row truth.
- Bounce-spike alert fires once with cooldown (test).
- `envFlag` helper covered by tests incl. trailing-newline values; all listed flags migrated.
- Full suite green before merge.
