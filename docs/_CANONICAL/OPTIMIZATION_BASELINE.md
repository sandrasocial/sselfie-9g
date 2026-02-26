# Optimization Baseline (Wave 0 Freeze)

**Frozen:** 2026-02-25  
**Purpose:** Snapshot for comparison during Safe Aggressive Optimization Plan execution. Do not edit historical entries; append new baseline runs with date.

## 1. Automation evidence snapshot

- **Source:** `output/automation/`
- **Latest triage:** `output/automation/triage-2026-02-25-07.md` — No failed crons, no admin errors, no email sends in window.
- **Latest friction:** `output/automation/friction-digest-2026-02-25.md` — No active incidents, no cron failures, no webhook errors, no stuck generations.
- **Latest revenue audit:** `output/automation/revenue-audit-2026-02-25.md` — 80 active unresolved purchase linkage (30–90d: 32, >90d: 44); live 30d: 4 linked / 0 missing.
- **Latest subscription audit:** `output/automation/subscription-audit-2026-02-25.md` — 45 subscriptions missing Stripe id (22 test membership, 11 live paid_blueprint entitlement rows; 0 unresolved live membership).
- **Digest types in use:** triage-hourly, friction-digest, funnel-digest, support-digest, email-performance, revenue-audit, subscription-audit, db-inventory, brand-engine-launch-digest, cohorts-weekly, cleanup, arpu-churn-weekly, cohort-delivery-load.

## 2. Execution tracker snapshot

- **Source:** `docs/AI_PROGRESS_TRACKER.md`
- **Active lanes:** Monetization (M-04, M-09, M-10 In Progress; M-08, M-11, M-12, R-05 In Review), Reliability (R-01, R-02, R-03, R-04 In Progress), Voice (V-01 In Review).
- **KPIs in play:** 7-day cron success ≥98%, email failures <2%, metrics within 3% of Stripe/DB, churn intervention coverage, CTA split, Brand Engine queue SLA.

## 3. Canonical execution status snapshot

- **Source:** `docs/_CANONICAL/EXECUTION_STATUS.md`
- **Current phase:** Phase AO — Access Control Normalization (active).
- **Known risks:** Lint warnings (12963); Playwright E2E skipped in Vitest; cron reconcile-credits returns HTTP 400 in production (middleware/platform; STOP for critical-file change).
- **Gated endpoints:** Listed in EXECUTION_STATUS; default 410 without `ENABLE_UNUSED_ENDPOINTS`.

## 4. Baseline metrics (for gate comparison)

| Metric | Baseline value | Evidence path |
|--------|----------------|---------------|
| Cron failures (2h) | 0 | triage-*-07.md |
| Admin errors (2h) | 0 | triage-*-07.md |
| Unresolved purchase linkage (live) | 80 (30–90d: 32, >90d: 44) | revenue-audit-2026-02-25.md |
| Live active memberships missing Stripe id | 0 | subscription-audit-2026-02-25.md |
| Stuck generations | 0 | friction-digest-2026-02-25.md |
| Active incidents | 0 | friction-digest-2026-02-25.md |

## 5. Agent evidence

Classified as trusted vs stale in `docs/_CANONICAL/AGENT_EVIDENCE_CLASSIFICATION.md`. Baseline does not rely on agent manifest/chunk paths for file-level truth.

## 6. Reference links

- Optimization backlog: `docs/_CANONICAL/OPTIMIZATION_BACKLOG.md`
- Agent evidence: `docs/_CANONICAL/AGENT_EVIDENCE_CLASSIFICATION.md`
- Plan: Safe Aggressive Optimization Plan (Wave 0–4)
- Constitution: `docs/_CANONICAL/CURSOR_CONSTITUTION.md`
