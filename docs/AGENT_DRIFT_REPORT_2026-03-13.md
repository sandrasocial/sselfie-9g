# Agent Drift Report — 2026-03-13

**Scope:** Contradictions and stale references across sselfie-9g and ~/stella agent-facing files.  
**Source:** [docs/AGENT_FILE_AUTHORITY_MAP.md](AGENT_FILE_AUTHORITY_MAP.md) + grep audit.  
**Severity:** P0 = business/revenue risk, P1 = workflow/handoff conflict, P2 = confusion/duplication, P3 = cleanup/nice-to-have.

---

## P0 — Fix first (can mislead business or product decisions)

| ID | Location | Issue | Current text / behavior | Required fix |
|----|----------|--------|---------------------------|--------------|
| P0-1 | [CLAUDE.md](CLAUDE.md) § Key Files | NORTH_TASK_QUEUE.md described as "North's active task list — check before adding tasks" | Agents may add tasks to retired file or treat it as source of truth | Replace with: ACTIVE/tasks/ is the active task list; check ~/stella/ACTIVE/tasks/ before adding tasks. Remove NORTH_TASK_QUEUE.md from "Key Files" table or mark RETIRED, point to ACTIVE/tasks/ |
| P0-2 | [CLAUDE.md](CLAUDE.md) § Key Files | SHARED_MEMORY.md described as "What ALL agents read on session start" | Overstates role; North/Stella use it as handoff-only. Can cause agents to treat handoff log as business truth | Change to: "Handoff log only — use for blockers/completions; not canonical business truth. Canonical: CLAUDE.md → CODEX_CONTEXT.md → NORTH_ACTIVE.md → STATUS.md (technical only)." |
| P0-3 | [CLAUDE.md](CLAUDE.md) § Protocol | "Check North's task queue (`~/stella/NORTH_TASK_QUEUE.md`) before adding new tasks" | Directs Claude to retired file | Replace with: "Check ~/stella/ACTIVE/tasks/ (and NORTH_ACTIVE.md) before adding new tasks." |
| P0-4 | [CLAUDE.md](CLAUDE.md) § Protocol | "Corrections go via terminal — don't let wrong info propagate to SHARED_MEMORY.md" | Implies SHARED_MEMORY is primary; contradicts handoff-only | Rephrase to: "Corrections go via terminal; do not write business metrics or product truth into SHARED_MEMORY.md (handoff log only)." |
| P0-5 | [CLAUDE.md](CLAUDE.md) footer | "→ Agent details: `memory/context/agents.md`" | **File does not exist** in repo (only openclaw-protocol.md, business-context.md in memory/context/) | Remove line or create agents.md with current agent roster + truth rules; if removed, keep "→ Deep context: memory/context/openclaw-protocol.md" only |

---

## P1 — Workflow / handoff conflicts

| ID | Location | Issue | Required fix |
|----|----------|--------|--------------|
| P1-1 | [memory/context/openclaw-protocol.md](memory/context/openclaw-protocol.md) | Tells users to "Tell North to update NORTH_TASK_QUEUE.md" and "update SHARED_MEMORY.md for decisions ALL agents need to know"; diagram shows NORTH_TASK_QUEUE as "Active tasks" | Align with North: task updates go to ACTIVE/tasks/; SHARED_MEMORY for handoffs/blockers only. Update protocol text and diagram |
| P1-2 | [docs/codex-tasks/MASTER-PLAN-2026-02-28.md](docs/codex-tasks/MASTER-PLAN-2026-02-28.md) | "Read ~/stella/NORTH_TASK_QUEUE.md and ~/stella/SHARED_MEMORY.md first"; "Updates SHARED_MEMORY.md with result"; "Update SHARED_MEMORY.md after each completes" | Add note at top: "Legacy doc. For current task/handoff: use ACTIVE/tasks/, ACTIVE/reports/, NORTH_ACTIVE.md; SHARED_MEMORY handoff-only." Or replace refs with ACTIVE paths |
| P1-3 | [docs/codex-tasks/MAYA-CHAT-FIRST-SPRINT-SPEC-2026-03-02.md](docs/codex-tasks/MAYA-CHAT-FIRST-SPRINT-SPEC-2026-03-02.md) | "already queued in NORTH_TASK_QUEUE.md" | Replace with ACTIVE/tasks/ or "current task list" |
| P1-4 | [docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md](docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md) | Lists SHARED_MEMORY.md as infra dependency | Keep as "handoff/coordination" not "canonical state"; one-line clarification |
| P1-5 | [docs/AGENT-SYSTEM-MASTER-PLAN-2026-03-02.md](docs/AGENT-SYSTEM-MASTER-PLAN-2026-03-02.md) | Already marks SHARED_MEMORY and NORTH_TASK_QUEUE as RETIRED; suggests "Active task list (replaces NORTH_TASK_QUEUE)" | No change; use as reference. Ensure CLAUDE.md and openclaw-protocol match this |
| P1-6 | [docs/SSELFIE-DESIGN-VOICE-MASTER-GUIDE.md](docs/SSELFIE-DESIGN-VOICE-MASTER-GUIDE.md) | "cat ~/stella/SHARED_MEMORY.md → check last deploy state" | Clarify: "handoff/deploy notes only; for deploy truth use STATUS.md and NORTH_ACTIVE.md" |

---

## P2 — Confusion / duplication / retired refs

| ID | Location | Issue | Required fix |
|----|----------|--------|--------------|
| P2-1 | ~/stella/reports/content-status-today.md, ACTIVE/reports/email-strategy.md, app-map-2026-02-24.md, app-endpoint-inventory-2026-02-24.md | Reference BUSINESS_STATE.md or NORTH_TASK_QUEUE as source | Add header or one-line: "Historical report. For current truth use CLAUDE.md, NORTH_ACTIVE.md, live Stripe/Resend." Do not delete; mark historical |
| P2-2 | ~/stella/OUTCOME_LOG.md, ACTIVE/reports/* (multiple handoff/sync reports) | Historical entries that say "Updated NORTH_TASK_QUEUE.md, SHARED_MEMORY.md, BUSINESS_STATE.md" | Leave as historical record; optionally add one-line note at top of OUTCOME_LOG: "Older entries may reference retired files; current protocol: ACTIVE/tasks/, ACTIVE/reports/, SHARED_MEMORY handoff-only." |
| P2-3 | ~/stella/ACTIVE/reports/OPENCLAW-BUSINESS-INTEGRATION-GUIDE.md, MEMORY-COORDINATION-*.md, OPENCLAW-*.md | Describe SHARED_MEMORY / NORTH_TASK_QUEUE as primary or "update SHARED_MEMORY" without handoff-only caveat | Add short "Current protocol" box: canonical = CLAUDE → CODEX_CONTEXT → NORTH_ACTIVE → STATUS; SHARED_MEMORY = handoff only; tasks = ACTIVE/tasks/ |
| P2-4 | ~/stella/HEARTBEAT.md | "Do not update SHARED_MEMORY.md, BUSINESS_STATE.md, or app files" | Clarify: "Do not update BUSINESS_STATE.md (retired). SHARED_MEMORY.md may be updated for handoffs only via sync_shared_memory.sh; do not write business metrics there." |

---

## P3 — Structure / consistency (no business risk)

| ID | Location | Issue | Required fix |
|----|----------|--------|--------------|
| P3-1 | CLAUDE.md **App codebase** | Path `/sessions/nifty-serene-bardeen/mnt/sselfie-9g/` is session-specific | Prefer "sselfie-9g repo (e.g. workspace path varies)" or Sandra's actual repo path; avoid hardcoding session IDs |
| P3-2 | docs/CODEX_CONTEXT.md | References "STRATEGIC_CLEANUP_RECOMMENDATION.md", "MASTER_COMMAND_CENTER.md" in docs/ | Verify these exist; if missing, remove or replace with existing strategy doc names |
| P3-3 | docs/AGENT_FILE_AUTHORITY_MAP.md | Typo "CODEX_CONTEXT" in one table header (CODEX_CONTEXT) | Ensure consistent path docs/CODEX_CONTEXT.md |
| P3-4 | North CODE_SYSTEM.md (stella/agents) | Writes to ~/stella/tasks/ and ~/stella/reports/ | Confirm: North agents write to ACTIVE/tasks/ and ACTIVE/reports/ per BOOTSTRAP; if CODE_SYSTEM says tasks/ not ACTIVE/tasks/, align to ACTIVE/ |

---

## Summary

- **P0:** 5 items — all in CLAUDE.md (task queue description, SHARED_MEMORY description, protocol steps, broken agents.md link).
- **P1:** 6 items — openclaw-protocol, codex-tasks specs, design guide.
- **P2:** 4 items — historical reports and guides in ~/stella that still reference retired files.
- **P3:** 4 items — path consistency, doc existence, write-path alignment.

**Next:** Apply P0 fixes in CLAUDE.md; then P1 in memory/context and codex-tasks; then P2/P3 as time allows. After edits, run reference-integrity check (all linked paths exist).
