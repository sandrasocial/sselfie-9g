# AI Operations Execution Board (14-Day Sprint)

## Window

- Start: 2026-02-13
- End: 2026-02-26
- Owner: Sandra (final decision authority)
- Implementor: Codex
- Strategy/Design: Claude app
- Automation Orchestrator: Stella-Ops (Clawdbot production profile)
- Sandbox Agent: North-Lab (experimental only, no production writes)

## Sprint objectives (must be true by day 14)

1. Data trust restored: admin metrics align with source-of-truth (Stripe/DB) within 3% variance.
2. Reliability stabilized: cron success stays above 98% over rolling 7 days.
3. Email pipeline stable: lifecycle email failures below 2% for active sends.
4. Agent governance active: North-Lab and Stella-Ops fully separated with clear permissions.
5. Growth execution active: at least one activation experiment live with measurable KPI.

## Day-by-day milestones

| Day | Date | Milestone | Owner | Exit criteria |
| --- | --- | --- | --- | --- |
| 1 | 2026-02-13 | Governance kickoff + baseline truth snapshot | Codex + Sandra | Baseline report produced and approved priorities selected |
| 2 | 2026-02-14 | Agent boundary lock (Lab vs Ops) | Codex | Separate runtime profiles and tool policies documented |
| 3 | 2026-02-15 | Data linkage remediation plan | Codex | Subscription/purchase linkage root-cause map completed |
| 4 | 2026-02-16 | Data trust patch set A | Codex | First linkage fixes merged with tests |
| 5 | 2026-02-17 | Dashboard trust validation | Codex | Variance check under 3% for key admin metrics |
| 6 | 2026-02-18 | Email reliability pass A | Codex | Stuck/queued and follow-up failure root causes fixed |
| 7 | 2026-02-19 | Email reliability pass B | Codex + Stella-Ops | Delivery/failure trend stable for 24h |
| 8 | 2026-02-20 | Activation experiment design approval | Sandra + Claude | One approved brief with KPI and stop conditions |
| 9 | 2026-02-21 | Activation experiment implementation | Codex | Feature + instrumentation shipped behind safe controls |
| 10 | 2026-02-22 | Experiment tracking verification | Codex | End-to-end event integrity confirmed |
| 11 | 2026-02-23 | AI Ops command center v1 | Codex | Admin view for runs/incidents/approvals live |
| 12 | 2026-02-24 | Operating dry-run day | All | No unresolved P1 incidents >4h |
| 13 | 2026-02-25 | Consolidation + documentation | Codex | Runbook and ownership model finalized |
| 14 | 2026-02-26 | Executive review and next 30-day plan | Sandra | Keep/Kill/Scale decisions and next sprint approved |

## Day 1 execution checklist

| ID | Task | Owner | Status | Evidence |
| --- | --- | --- | --- | --- |
| D1-01 | Run baseline diagnostics (triage, friction, email, funnel, cohorts, billing audits) | Codex | Done | `output/automation/triage-2026-02-12-14.md` and related reports |
| D1-02 | Produce governance board with roles, milestones, and gating rules | Codex | Done | `docs/AI_OPERATIONS_EXECUTION_BOARD.md` |
| D1-03 | Confirm current production risk posture from latest reports | Codex | Done | `output/automation/day1-kickoff-2026-02-12.md` |
| D1-04 | Select top 3 priorities for next implementation block | Sandra | Pending | Decision required from Sandra |
| D1-05 | Approve agent naming and split (`Stella-Ops` and `North-Lab`) | Sandra | Pending | Decision required from Sandra |
| D1-06 | Approve hosting move for Stella-Ops runtime (VPS only for agent runtime) | Sandra | Pending | Decision required from Sandra |

## Execution update (2026-02-12)

1. Baseline diagnostics rerun and refreshed:
   - `output/automation/triage-2026-02-12-15.md`
   - `output/automation/email-performance-2026-02-12.md`
   - `output/automation/friction-digest-2026-02-12.md`
2. Email reliability patch set applied in code:
   - Fixed missing `subject` in upsell templates that caused `marketing-runner:metadata` failures.
   - Improved pending marketing run scheduling to process more unique runs per cron window.
3. Validation completed:
   - Targeted regression tests pass (`tests/email-upsell-subjects.test.ts`, routing + identifier tests).
   - `pnpm build` succeeds locally.
4. Remaining operational follow-up:
   - Continue monitoring pending `syncing` runs for `nurture` + `blueprint-discovery` until queue reaches zero.
   - Confirm no new `marketing-runner:metadata` errors after next `upsell-campaigns` cron execution.

## Operating rules (to avoid confusion and over-engineering)

1. One implementation lane: only Codex writes production code.
2. One strategy lane: Claude app produces briefs; no direct production edits.
3. One orchestration lane: Stella-Ops monitors, summarizes, and routes tasks.
4. North-Lab remains isolated from production systems.
5. No broad refactors unless explicitly approved by Sandra.
6. Every task must include KPI, owner, due date, and rollback path.
7. Max three active priorities at any time.

## Daily accountability rhythm

1. 09:00 (Europe/Oslo): Stella-Ops morning brief with top 3 actions.
2. 12:00: Sandra decision checkpoint (approve/reject/defer).
3. 17:00: End-of-day summary with done/blocked/next.

## Progress tracking format (mandatory for all tasks)

Use this row format in updates:

`[Task ID] [Owner] [Status] [KPI] [Risk] [Next step] [ETA]`

Example:

`[D3-02] [Codex] [In Progress] [Stripe linkage coverage] [Medium] [Patch purchase write path] [2026-02-15 18:00 UTC]`
