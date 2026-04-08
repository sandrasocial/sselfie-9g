# Optimization Backlog (Authoritative)

**Created:** 2026-02-25  
**Purpose:** Single backlog for Safe Aggressive Optimization Plan. Every item has: user impact, risk, owner, rollback, verification.

## Format

| ID | Item | User impact | Risk | Owner | Rollback | Verification |
|----|------|-------------|------|-------|----------|---------------|
| (see below) | | | | | | |

## Critical

| ID | Item | User impact | Risk | Owner | Rollback | Verification |
|----|------|-------------|------|-------|----------|---------------|
| O-01 | Resolve purchase linkage backlog (80 unresolved; 30–90d and >90d) | Revenue reconciliation gaps; possible refund/entitlement disputes | High | Codex | Revert backfill script; restore DB snapshot if needed | revenue-audit shows reduced unresolved count; no regression in live 30d linkage |
| O-02 | Classify revenue/subscription report rows: entitlement vs true unresolved | Fewer false alarms in dashboards; clearer ops decisions | Medium | Codex | Doc-only; revert report changes | revenue-audit and subscription-audit show explicit classification; R-03 variance unchanged |
| O-03 | Validate cron auth/runtime (reconcile-credits 400 in prod) | Credits reconciliation may not run; welcome/monthly grants at risk | High | Codex | Middleware/vercel revert; re-deploy | GET /api/cron/reconcile-credits returns 200 with CRON_SECRET in prod or documented platform fix |

## High

| ID | Item | User impact | Risk | Owner | Rollback | Verification |
|----|------|-------------|------|-------|----------|---------------|
| O-04 | Proof-first dead code cleanup (knip, ts-prune, references) | Smaller surface area; faster builds/iteration | Low | Codex | Restore from git; ledger of deletions | Build and tests pass; no broken imports |
| O-05 | Automation output retention (hot window + archive) | Cleaner disk; same evidence for recent window | Low | Codex | Restore from archive; adjust retention script | Latest triage/digest/audit still generated; archive exists for older files |
| O-06 | First-value UX: first generation path, credit clarity, onboarding continuation | Higher activation; fewer drop-offs before first output | Medium | Codex | Revert UI/copy changes | Funnel digest shows stable or improved first-output activation; no support spike |
| O-07 | Standardize error envelope and log metadata in cron/email paths | Faster debugging; consistent ops visibility | Low | Codex | Revert logging changes | Same behavior; logs include structured metadata |
| O-08 | Idempotency/retry limits for email and long-running jobs | Fewer stuck campaigns; predictable failure handling | Medium | Codex | Revert campaign/cron changes | email-performance and triage show no new failure mode; retry limits documented |

## Medium

| ID | Item | User impact | Risk | Owner | Rollback | Verification |
|----|------|-------------|------|-------|----------|---------------|
| O-09 | Consolidate duplicate TS/MJS script pairs where ownership clear | Less drift; single source of truth for scripts | Low | Codex | Restore .mjs or .ts; fix callers | Automation still runs same scripts; package.json scripts unchanged |
| O-10 | Backup/artifact cleanup (.backups, output/agents stale indexing) | Cleaner repo; agents not biased by backup content | Low | Codex | Restore dirs from git | knip/codebase-indexer exclude list still correct; no refs to deleted paths |
| O-11 | Weekly KPI gate review and AI Progress Tracker evidence links | Clear go/no-go for next wave; audit trail | Low | Codex | Doc-only | Tracker updated with evidence paths; weekly summary template used |

## Low

| ID | Item | User impact | Risk | Owner | Rollback | Verification |
|----|------|-------------|------|-------|----------|---------------|
| O-12 | Agent evidence classification (trusted vs stale) | Backlog only includes validated findings | Low | Codex | Revert OPTIMIZATION_BACKLOG changes | OPTIMIZATION_BASELINE or backlog notes which agent outputs are trusted |

## Dependencies

- O-01, O-02, O-03 support Safety Gate: Paid-flow (Stripe + credits).
- O-04, O-05, O-09, O-10 are Wave 2 cleanup; do after or in parallel with O-01–O-03.
- O-06 is Wave 3; gate by ConversionAndSupport (first-output activation, support errors).
- O-07, O-08 are Wave 4; gate by LatencyAndReliability.
- O-11, O-12 support weekly governance and baseline consistency.

## Agent evidence

Classified in `docs/_CANONICAL/AGENT_EVIDENCE_CLASSIFICATION.md`. Only trusted themes (revalidated against current code) are reflected in this backlog.

## Change log

| Date | Change |
|------|--------|
| 2026-02-25 | Initial backlog from Safe Aggressive Optimization Plan. |
| 2026-02-25 | Agent evidence classification added; O-12 satisfied by AGENT_EVIDENCE_CLASSIFICATION.md. |
| 2026-02-25 | O-07, O-08: Error envelope + idempotency/retry limits implemented; see SCALE_HARDENING_CHECKLIST.md. |
