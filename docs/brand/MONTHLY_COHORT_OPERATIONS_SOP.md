# Monthly Cohort Operations SOP

## Purpose

Run each cohort launch as a repeatable cycle with no reinvention:
- one offer
- one CTA
- one queue workflow
- one weekly KPI review

This SOP is optimized for draft-first operations and low admin overhead.

## Core rules

1. Single CTA everywhere: `Apply for Cohort`.
2. All leads land in `/apply/brand-engine` with source tags.
3. All queue actions happen in `/admin/brand-engine-applications`.
4. Every close logs `cash_collected` same day.
5. Do not change pricing mid-cycle unless seats are below pace in final week.

## System command center

- Launch queue: `/admin/brand-engine-applications`
- KPI + audits: `/admin/analytics`
- Marketing reliability: `/admin/marketing`
- Daily launch digest cron: `/api/cron/brand-engine-launch-digest`
- Weekly ARPU/churn cron: `/api/cron/arpu-churn-weekly`
- Weekly delivery-load cron: `/api/cron/cohort-delivery-load-weekly`

## Monthly cycle (copy/paste)

### Week -2 (prep)

1. Confirm cohort date, seat cap, and call target/day in `lib/brand-engine/launch-config.ts`.
2. Verify form and pipeline work:
   - submit test application on `/apply/brand-engine`
   - confirm it appears on `/admin/brand-engine-applications`
3. Run reports manually in `/admin/analytics`:
   - Funnel
   - Cohorts
   - Launch ops
   - ARPU/churn
4. Confirm DM bridge tags:
   - ManyChat links include `sourceChannel` + `sourceDetail` + UTM.
   - Quick-add source dropdown used correctly (`manual`, `instagram_dm`, `manychat_dm`).

### Week -1 (warmup)

1. Publish warmup content (no hard sell).
2. Send one warmup email to list.
3. Review qualified queue daily and pre-tag hot leads for follow-up.

### Launch week (7 days)

1. Daily CTA wave:
   - IG Stories: CTA to apply link
   - Email: CTA to apply link
2. Work queue in this order:
   - `qualified_queue`
   - `call_booked`
   - `offer_sent`
   - `closed_won`
3. SLA:
   - 3 calls/day target
   - send offers same day as completed calls
   - follow up all open offers within 24h
4. End-of-day update:
   - update stages
   - log `cash_collected`
   - check launch digest and next-day gap

### Delivery month (post-close)

1. Log delivery blocks (live + async) in `/admin/analytics`.
2. Keep async ratio >= 60% over rolling 30 days.
3. Collect proof artifacts weekly:
   - wins
   - outcomes
   - objections handled
4. Feed wins into next launch copy.

## Daily checklist (execution)

1. Open launch queue and clear `qualified_queue`.
2. Book/confirm calls until daily target is met.
3. Advance every lead stage with no stale records.
4. Log follow-up notes on each open lead.
5. Log closed-won cash same day.
6. Review marketing + analytics health.

## Weekly checklist (owner review)

1. Run ARPU/churn weekly report.
2. Verify discounted membership count did not increase.
3. Review churn and new memberships (30d).
4. Review cohort delivery async/live ratio.
5. Decide one optimization for next week only.

## Roles and responsibility

- Sandra:
  - publish CTA content daily
  - run calls and close leads
  - approve outbound draft copy
- Codex:
  - maintain pipeline logic, metrics, and dashboards
  - keep cron/reporting stable
  - ship reliability fixes and SOP updates
- Claude:
  - produce draft creative assets in Sandra voice
  - support CTA distribution packs and messaging variants

## Escalation triggers

Escalate same day if any of these happen:

1. Cron failures > 0 on launch-critical routes.
2. Queue stage mismatch (leads missing route/action tags).
3. Churn (30d) > 15%.
4. Discounted membership count increases unexpectedly.
5. Async ratio falls below 50% for two consecutive weeks.
