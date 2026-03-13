# Agent Remediation Batches — 2026-03-13

**Purpose:** Per-file actions to remove drift and align all agent-facing content to [docs/_CANONICAL/AGENT_TRUTH_MODEL.md](_CANONICAL/AGENT_TRUTH_MODEL.md).  
**Source:** [AGENT_DRIFT_REPORT_2026-03-13.md](AGENT_DRIFT_REPORT_2026-03-13.md).

---

## P0 — Execute first (business/product risk)

| File | Action | Detail |
|------|--------|--------|
| `sselfie-9g/CLAUDE.md` | **Rewrite** | § Key Files: Replace NORTH_TASK_QUEUE row with "ACTIVE/tasks/ — active task list; check before adding tasks." Replace SHARED_MEMORY row with "Handoff log only (blockers/completions); not canonical truth. Canonical: CLAUDE.md → CODEX_CONTEXT.md → NORTH_ACTIVE.md → STATUS.md (technical only)." § Protocol step 1: "Check ~/stella/ACTIVE/tasks/ and NORTH_ACTIVE.md before adding new tasks." Step 4: "Corrections via terminal; do not write business metrics or product truth into SHARED_MEMORY.md (handoff log only)." Remove footer line "→ Agent details: memory/context/agents.md" (file missing). Keep "→ Deep context: memory/context/openclaw-protocol.md". |
| `sselfie-9g/memory/context/agents.md` | **Create or remove ref** | Option A: Create minimal agents.md with agent roster + pointer to CLAUDE.md truth chain. Option B: Remove reference from CLAUDE.md only (chosen in P0 above). |

---

## P1 — Workflow / handoff alignment

| File | Action | Detail |
|------|--------|--------|
| `sselfie-9g/memory/context/openclaw-protocol.md` | **Rewrite** | Replace "Tell North to update NORTH_TASK_QUEUE.md" with "Tell North to update ACTIVE/tasks/ (or add task file there)." Replace "update SHARED_MEMORY.md for decisions ALL agents need to know" with "use SHARED_MEMORY.md for handoffs/blockers only (sync_shared_memory.sh or submit_handoff_to_north.sh)." Update diagram: "Active tasks" → ACTIVE/tasks/; "All-agent shared context" → "Handoff log only (not business truth)." |
| `sselfie-9g/docs/codex-tasks/MASTER-PLAN-2026-02-28.md` | **Add notice** | At top after title: "**Current protocol:** For task list and handoff, use ~/stella/ACTIVE/tasks/, ~/stella/ACTIVE/reports/, and NORTH_ACTIVE.md; SHARED_MEMORY.md is handoff-only. This doc is legacy; follow AGENT_TRUTH_MODEL.md for current paths." |
| `sselfie-9g/docs/codex-tasks/MAYA-CHAT-FIRST-SPRINT-SPEC-2026-03-02.md` | **Replace** | "already queued in NORTH_TASK_QUEUE.md" → "already in current task list (ACTIVE/tasks/)." |
| `sselfie-9g/docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md` | **Add one line** | In infra dependency list: "SHARED_MEMORY.md: handoff/coordination only, not canonical state." |
| `sselfie-9g/docs/SSELFIE-DESIGN-VOICE-MASTER-GUIDE.md` | **Clarify** | "cat ~/stella/SHARED_MEMORY.md → check last deploy state" → "For handoff/deploy notes only; for deploy truth use STATUS.md and NORTH_ACTIVE.md." |

---

## P2 — Historical / confusion cleanup

| File | Action | Detail |
|------|--------|--------|
| `~/stella/reports/content-status-today.md` | **Add header** | "Historical report. For current truth use CLAUDE.md, NORTH_ACTIVE.md, live Stripe/Resend." |
| `~/stella/ACTIVE/reports/email-strategy.md` | **Add header** | Same as above; do not remove BUSINESS_STATE reference inside (historical). |
| `~/stella/ACTIVE/reports/app-map-2026-02-24.md`, `app-endpoint-inventory-2026-02-24.md` | **Add header** | "Historical report. Current task/source: ACTIVE/tasks/, CLAUDE.md, NORTH_ACTIVE.md." |
| `~/stella/OUTCOME_LOG.md` | **Add note** | At top: "Older entries may reference retired files (NORTH_TASK_QUEUE, BUSINESS_STATE); current protocol: ACTIVE/tasks/, ACTIVE/reports/, SHARED_MEMORY handoff-only." |
| `~/stella/ACTIVE/reports/OPENCLAW-BUSINESS-INTEGRATION-GUIDE.md`, MEMORY-COORDINATION-*.md, OPENCLAW-*.md | **Add box** | Short "Current protocol" box: canonical = CLAUDE → CODEX_CONTEXT → NORTH_ACTIVE → STATUS; SHARED_MEMORY = handoff only; tasks = ACTIVE/tasks/. |
| `~/stella/HEARTBEAT.md` | **Clarify** | "Do not update BUSINESS_STATE.md (retired). SHARED_MEMORY.md may be updated for handoffs only via sync_shared_memory.sh; do not write business metrics there." |

---

## P3 — Nice-to-have / consistency

| File | Action | Detail |
|------|--------|--------|
| `sselfie-9g/CLAUDE.md` | **Edit** | "App codebase:" → "App codebase: sselfie-9g repo (path may vary by workspace; e.g. Sandra's folder)." |
| `sselfie-9g/docs/CODEX_CONTEXT.md` | **Verify** | Confirm STRATEGIC_CLEANUP_RECOMMENDATION.md, MASTER_COMMAND_CENTER.md exist under docs/; if not, remove or replace with existing doc names. |
| `~/stella/agents/CODE_SYSTEM.md` | **Align** | Ensure write paths are ACTIVE/tasks/ and ACTIVE/reports/ (not top-level tasks/ or reports/). |

---

## Cleanup ledger (post-execution)

| Date | File(s) | Action | Reason |
|------|---------|--------|--------|
| 2026-03-13 | CLAUDE.md | Updated Key Files table, Protocol, footer, app codebase wording | P0-1–P0-5, P3-1 |
| 2026-03-13 | memory/context/openclaw-protocol.md | Updated task/handoff instructions and diagram | P1-1 |
| 2026-03-13 | docs/codex-tasks/MASTER-PLAN-2026-02-28.md | Added current-protocol notice | P1-2 |
| 2026-03-13 | docs/codex-tasks/MAYA-CHAT-FIRST-SPRINT-SPEC-2026-03-02.md | NORTH_TASK_QUEUE → ACTIVE/tasks/ | P1-3 |
| 2026-03-13 | docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md | SHARED_MEMORY handoff-only clarification | P1-4 |
| 2026-03-13 | docs/SSELFIE-DESIGN-VOICE-MASTER-GUIDE.md | SHARED_MEMORY vs deploy truth | P1-6 |
| 2026-03-13 | ~/stella/reports/content-status-today.md | Historical header | P2 |
| 2026-03-13 | ~/stella/ACTIVE/reports/email-strategy.md | Historical header | P2 |
| 2026-03-13 | ~/stella/ACTIVE/reports/app-map-2026-02-24.md, app-endpoint-inventory-2026-02-24.md | Historical header | P2 |
| 2026-03-13 | ~/stella/OUTCOME_LOG.md | Protocol note (retired files) | P2 |
| 2026-03-13 | ~/stella/HEARTBEAT.md | BUSINESS_STATE/SHARED_MEMORY clarification | P2 |
| 2026-03-13 | ~/stella/ACTIVE/reports/OPENCLAW-*.md, MEMORY-COORDINATION-*.md | Current protocol box | P2 |
| 2026-03-13 | docs/CODEX_CONTEXT.md | Replaced missing doc refs with docs/automation, features, _CANONICAL, archive path | P3-2 |
| 2026-03-13 | ~/stella/agents/CODE_SYSTEM.md | Write paths → ACTIVE/tasks/, ACTIVE/reports/ | P3-3 |
| 2026-03-13 | CLAUDE.md | Removed stale hardcoded customer/subscriber counts, added verify-live rules + audience composition context, added Claude vs North matrix, collapsed roster references | Phase 1 + Phase 3 |
| 2026-03-13 | docs/AGENT_FILE_AUTHORITY_MAP.md | Updated North subagent roster to Operator/Builder and marked retired stubs | Phase 1 + Phase 2 |
| 2026-03-13 | ~/stella/AGENTS.md, SOUL.md, BOOTSTRAP.md, agents/main.md, agents/NORTH_SYSTEM.md | Collapsed active team to North/Operator/Builder/Stella and updated delegation/routing | Phase 2 |
| 2026-03-13 | ~/stella/agents/operator.md, builder.md | Created merged operator + builder prompt files | Phase 2 |
| 2026-03-13 | ~/stella/agents/north-revenue.md, north-audience.md, north-code.md, north-content.md, north-email/*, north-product.md, .north-inbox-config.json | Converted retired roles to compatibility stubs with replacement pointers | Phase 2 |
| 2026-03-13 | memory/context/openclaw-protocol.md | Added Claude vs North use-case matrix, replaced old architecture with North + Operator + Builder model | Phase 3 |
| 2026-03-13 | CLAUDE.md | Tightened stale-metric phrasing (live verification baseline wording) and refreshed update stamp | Cleanup follow-up |
| 2026-03-13 | ARCHITECTURE_PROPOSAL_V1.md, ARCHITECTURE_AUDIT_V1.md, DECISIONS.md | Added historical/non-canonical guard banners to prevent agent drift | Retired-doc cleanup |
| 2026-03-13 | ~/stella/agents/CONTENT_SYSTEM.md, REVENUE_SYSTEM.md, STELLA_BRIDGE_SYSTEM.md, TEMPLATE-USAGE.md | Converted legacy prompt/docs to explicit retired compatibility references | Retired-doc cleanup |

---

*After remediation: run reference-integrity check (all referenced paths exist) and re-read AGENT_DRIFT_REPORT to close fixed items.*
