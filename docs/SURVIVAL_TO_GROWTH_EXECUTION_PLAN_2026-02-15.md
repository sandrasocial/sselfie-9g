# Survival to Growth Execution Plan (2026-02-15)

## Context

SSELFIE has strong audience reach but weak conversion and retention.
This plan is cash-first and reliability-safe.

## Objective (next 30 days)

1. Reduce membership churn from ~44% to <=25% in 4 weeks.
2. Increase email conversion from ~0.7% to >=1.5% in 4 weeks.
3. Fill Brand Engine cohort seats for March 16, 2026.
4. Keep reliability stable while launch traffic increases.

## Agreement with Claude strategy

The strategy is directionally correct.
Execution risk is high if too many changes ship at once.

We will run it with strict gates:
1. 72-hour survival sprint.
2. 7-day measurement checkpoint.
3. Only then expand into full sequence and scale moves.

## 72-hour sprint (Do now)

### Priority 1: Churn risk intervention

Owner: Codex + Sandra  
KPI: At-risk member contact coverage >=90% within 72 hours

Implementation:
1. Add Day 14 / Day 21 / Day 28 lifecycle emails to close the Day 7 to Day 30 gap.
2. Add one monthly usage recap email template.
3. Keep send mode draft-only for copy until Sandra approves.

Files:
- `/Users/MD760HA/sselfie-9g/lib/email/templates/welcome-sequence.ts`
- `/Users/MD760HA/sselfie-9g/lib/email/marketing-template-catalog.ts`
- `/Users/MD760HA/sselfie-9g/app/api/cron/welcome-sequence/route.ts`

Verification:
1. Run targeted cron dry run in staging/local.
2. Confirm logs in `output/automation/email-performance-*.md`.

Rollback:
1. Disable new day triggers in catalog flags.
2. Keep existing day-0/day-3/day-7 only.

### Priority 2: Free-to-paid CTA split

Owner: Codex  
KPI: Increase free-user click-to-checkout on first paid CTA

Implementation:
1. Keep hot intent routes pointing to membership.
2. Route cold/new free users to Starter first.
3. Keep post-Starter upsell to membership.

Files:
- `/Users/MD760HA/sselfie-9g/lib/email/cta-routing.ts`
- `/Users/MD760HA/sselfie-9g/lib/email/templates/upsell-freebie-membership.tsx`
- `/Users/MD760HA/sselfie-9g/app/bio/page.tsx`

Verification:
1. Validate tracked links include campaign and product context.
2. Confirm funnel reports show Starter pathway clicks.

Rollback:
1. Revert segment routing to current default membership flow.

### Priority 3: Earlier inactivity rescue

Owner: Codex  
KPI: Reduce users hitting late-stage reactivation without intervention

Implementation:
1. Move inactivity trigger from 30-day behavior to 14-day intervention path.
2. Ensure sequence mutual exclusion to avoid overlaps.

Files:
- `/Users/MD760HA/sselfie-9g/app/api/cron/reactivation-campaigns/route.ts`
- `/Users/MD760HA/sselfie-9g/lib/email/get-active-sequences.ts`
- `/Users/MD760HA/sselfie-9g/lib/email/segmentation.ts`

Verification:
1. Check no overlap conflicts in sequence resolver output.
2. Confirm daily reports do not show burst failure clusters.

Rollback:
1. Restore previous inactivity windows and sequence matching.

## 7-day checkpoint (Gate before expansion)

Date window: 2026-02-15 to 2026-02-22

Pass criteria:
1. Churn trend improves versus previous 7-day period.
2. Email failure rate remains under 2%.
3. Free-user activation and first paid CTA clicks increase.
4. No new P1 cron incident.

Decision:
1. If pass, proceed to full Phase 2 expansion.
2. If fail, freeze new growth experiments and fix reliability/churn root causes.

## Brand Engine launch execution guardrails

1. Keep one CTA per wave: "Apply for Cohort."
2. Daily queue SLA:
- qualified_queue -> call_booked same day when possible.
- call_booked -> offer_sent within 24h.
- offer_sent -> follow-up within 24h if no payment.
3. Track `cash_collected` per close in admin.

Evidence sources:
- `/Users/MD760HA/sselfie-9g/output/automation/brand-engine-launch-digest-*.md`
- `/Users/MD760HA/sselfie-9g/output/automation/funnel-digest-*.md`
- `/Users/MD760HA/sselfie-9g/output/automation/email-performance-*.md`
- `/Users/MD760HA/sselfie-9g/output/automation/triage-*.md`

## Manual vs automated operating model

Sandra manual:
1. Approve outbound launch copy.
2. Handle sales calls and closes.
3. Approve pricing changes and offer policy.

Codex automated:
1. Implement and verify code changes.
2. Maintain instrumentation and reports.
3. Keep tracker docs current.

Claude automated:
1. Produce copy drafts in Voice Bible style.
2. QA voice against rubric before Sandra approval.

Stella-Ops automated:
1. Run recurring diagnostics and digest reporting.
2. Escalate anomalies, no autonomous pricing or destructive writes.

## Beta discount policy (immediate)

1. Keep current beta users honored.
2. Stop creating new permanent 50% memberships.
3. Track blended ARPU weekly in progress tracker.

## Thread handoff format (State Summary Template)

Use this at start of each new thread:

```md
Context: [What we were looking at]
Last actions: [Commands/results plus purpose]
Files touched: [Absolute paths + reason]
Outstanding issues: [Open errors or KPI gaps]
Next steps: [Immediate next execution steps]
```

