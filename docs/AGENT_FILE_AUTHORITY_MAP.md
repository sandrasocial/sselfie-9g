# Agent File Authority Map

**Purpose:** Single manifest of every file path each agent is instructed to read or write. Used for drift audits and governance.  
**Last built:** 2026-03-13 (Agent Truth Sync plan Phase 1).  
**Do not assume — this was extracted from current prompt/rule/script text.**

---

## 1. Repo: sselfie-9g

### 1.1 Cursor / Constitution (entry: `.cursorrules` → `docs/_CANONICAL/CURSOR_CONSTITUTION.md`)

| Role | Must read | Optional / reference | Write targets | Forbidden / retired |
|------|-----------|------------------------|---------------|---------------------|
| Cursor AI | `docs/_CANONICAL/CURSOR_CONSTITUTION.md` | (constitution lists) `docs/_CANONICAL/SYSTEM_REALITY.md`, `EXECUTION_STATUS.md`, `NEXT_PHASE.md`, `DRIFT_RULES.md` | `docs/_CANONICAL/EXECUTION_STATUS.md` (when updating system state) | — |

### 1.2 Stella / Codex (entry: `AGENTS.md`)

| Role | Must read | Optional / reference | Write targets | Forbidden / retired |
|------|-----------|------------------------|---------------|---------------------|
| Stella | `CLAUDE.md` (root), `docs/CODEX_CONTEXT.md` | `tasks/codex-*.md` (specs); for copy: `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md` | `tasks/`, codebase per spec | Create/update `SHARED_MEMORY.md`, `NORTH_TASK_QUEUE.md` (retired) |
| Stella key locations | — | `app/api/cron/`, `lib/email/templates/`, `vercel.json`, `freebie_brand_strategies`, `email_logs` | — | — |

### 1.3 CLAUDE.md (human + Claude Cowork)

References (read/check):
- `~/stella/NORTH_TASK_QUEUE.md` — **CONFLICT:** marked "check before adding tasks" but North's AGENTS.md says retired; use `~/stella/ACTIVE/tasks/` instead.
- `~/stella/SHARED_MEMORY.md` — described as "What ALL agents read on session start"; North/Stella say handoff-only, not canonical.
- `~/stella/` paths: `PIVOT-LOG-2026-02-28.md`, `reports/REVENUE-IMPACT-*.md`, `reports/EMAIL-HISTORY-AUDIT-*.md`, `reports/RESEND-NEON-AUDIT-*.md`, `drafts/`, `reports/FIX-01-VERIFICATION-2026-03-02.md`.
- Repo: `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`, `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`, `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md`, `skills/sselfie-maya-os/SKILL.md`.
- **Broken:** `memory/context/openclaw-protocol.md`, `memory/context/agents.md` — `agents.md` does not exist in repo (only `openclaw-protocol.md`, `business-context.md` exist under `memory/context/`).

### 1.4 CODEX_CONTEXT.md

References:
- `CLAUDE.md`, `AGENTS.md`, `docs/CODEX_CONTEXT.md`; North's `SHARED_MEMORY.md`, `BUSINESS_STATE.md`, `NORTH_TASK_QUEUE.md` (retired for canonical truth).
- `docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md`, `lib/maya/prompt-contract.ts`, `lib/maya/tab-scope.ts`, `lib/maya/tool-markers.ts`.
- `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`, `docs/codex-tasks/RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md`, `docs/in-app-funnel/*`, `docs/features/*`, `docs/features/README.md`, `docs/automation/SSELFIE_AUTOMATION_CORE_2026-03-10.md`, `output/automation/*`, `scripts/`, `skills/sselfie-maya-os/`.

---

## 2. North workspace: ~/stella

### 2.1 North orchestrator (AGENTS.md, BOOTSTRAP.md, SOUL.md, agents/main.md, agents/NORTH_SYSTEM.md)

| Role | Must read | Optional / reference | Write targets | Forbidden / retired |
|------|-----------|------------------------|---------------|---------------------|
| North | `/Users/MD760HA/sselfie-9g/CLAUDE.md`, `/Users/MD760HA/sselfie-9g/docs/CODEX_CONTEXT.md`, `~/stella/NORTH_ACTIVE.md` | `/Users/MD760HA/sselfie-9g/STATUS.md` (technical only); `~/stella/SHARED_MEMORY.md` (handoff only) | — | `BUSINESS_STATE.md`, `NORTH_TASK_QUEUE.md` as truth |
| North (SOUL) | Same + live Stripe/Resend when needed | `~/stella/CANONICAL_RUNTIME_BRIEF.md`, `~/stella/skills/sselfie-maya-os/references/user-journey.md`, `~/stella/skills/sselfie-maya-os/references/screen-map.md`, `~/stella/ACTIVE/tasks/`, `~/stella/ACTIVE/reports/` | — | — |

### 2.2 North subagents (current roster)

| Agent | Must read | Optional / reference | Write targets | Forbidden / retired |
|-------|-----------|------------------------|---------------|---------------------|
| operator | CLAUDE.md, CODEX_CONTEXT.md, NORTH_ACTIVE.md; live Stripe/Resend/Neon | STATUS.md when technical context matters | ~/stella/ACTIVE/reports/, ~/stella/ACTIVE/tasks/ handoff notes | BUSINESS_STATE.md, NORTH_TASK_QUEUE.md as truth |
| builder | CLAUDE.md, CODEX_CONTEXT.md, NORTH_ACTIVE.md, STATUS.md, ACTIVE/tasks/ | deployment/provider dashboards | ~/stella/ACTIVE/tasks/*.md, ~/stella/ACTIVE/reports/tech-health-*.md, OUTCOME_LOG.md | direct edits in sselfie-9g app code without Codex run |

### 2.3 Bootstrap / memory / protocol

| File | Reads | Writes |
|------|-------|--------|
| BOOTSTRAP.md | sync_shared_memory.sh --read; CLAUDE.md; CODEX_CONTEXT.md; refresh_north_active.sh; NORTH_ACTIVE.md; STATUS.md (if needed); SHARED_MEMORY.md (handoffs) | sync_shared_memory.sh --write; log-learning.sh |
| MEMORY.md | enforce-memory-sync.sh check; CLAUDE.md; CODEX_CONTEXT.md; NORTH_ACTIVE.md; STATUS.md; ACTIVE/tasks/; ACTIVE/reports/ | sync_shared_memory.sh --write; log-learning.sh |
| TASK_UPDATE_PROTOCOL.md | — | ACTIVE/tasks/, ACTIVE/reports/, SHARED_MEMORY (handoff only); submit_handoff_to_north.sh |
| IDENTITY.md | AGENTS.md, NORTH_ACTIVE.md, ACTIVE/tasks/, ACTIVE/reports/ | — |

### 2.4 Scripts (read/write)

| Script | Reads | Writes |
|--------|-------|--------|
| sync_shared_memory.sh | NORTH_ACTIVE.md (via refresh), SHARED_MEMORY.md | SHARED_MEMORY.md; calls refresh_north_active.sh |
| refresh_north_active.sh | APP_REPO/CLAUDE.md, CODEX_CONTEXT.md, STATUS.md, ACTIVE/tasks, ACTIVE/reports, mcporter_stripe.sh | NORTH_ACTIVE.md |
| submit_handoff_to_north.sh | (args) | SHARED_MEMORY.md / handoff queue |
| log_outcome.sh | — | outcomes log |

### 2.5 Retired stubs (do not use as truth)

- `~/stella/NORTH_TASK_QUEUE.md` — stub points to ACTIVE/tasks/, ACTIVE/reports/, NORTH_ACTIVE.md, CLAUDE.md.
- `~/stella/BUSINESS_STATE.md` — stub points to CLAUDE.md, NORTH_ACTIVE.md, live Stripe/Resend.
- `~/stella/NORTH_TASK_QUEUE_FEB27_*.md` — historical; MEMORY.md says do not use.
- `~/stella/agents/north-revenue.md`, `north-email/*`, `north-audience.md`, `north-code.md`, `north-product.md`, `north-content.md`, `.north-inbox-config.json` — compatibility stubs only; use `operator` or `builder`.

### 2.6 Prompts and READMEs (truth order)

- ACTIVE/tasks/README.md, ACTIVE/reports/README.md, reports/README.md, content/calendar-current.md, prompts/*.md: canonical order = CLAUDE.md → CODEX_CONTEXT.md → NORTH_ACTIVE.md → live Stripe/Resend → STATUS.md (technical only). Do not use BUSINESS_STATE.md, NORTH_TASK_QUEUE.md.

---

## 3. Cross-repo canonical truth chain (target)

1. **Business direction / product frame:** `/Users/MD760HA/sselfie-9g/CLAUDE.md`
2. **Tech stack / constraints / file map:** `/Users/MD760HA/sselfie-9g/docs/CODEX_CONTEXT.md`
3. **Compact runtime snapshot:** `~/stella/NORTH_ACTIVE.md` (refreshed from live Stripe + ACTIVE)
4. **Technical / deploy truth only:** `/Users/MD760HA/sselfie-9g/STATUS.md`
5. **Handoff log (not business truth):** `~/stella/SHARED_MEMORY.md`

Live metrics: Stripe (revenue, subscriptions, prices), Resend (audience, broadcasts), Neon (funnel/entitlements) — verify when exact numbers matter; do not quote from docs.

---

## 4. Skills (sselfie-9g)

| Skill | Reads |
|-------|--------|
| skills/sselfie-maya-os/SKILL.md | references/user-journey.md, references/screen-map.md, references/scaling-playbook.md, references/qa-checklist.md |
| skills/repo-cartographer/SKILL.md | output/automation/repo-map-*.md (via pnpm audit:repo-map) |

---

*Next: Run Phase 2 contradiction and stale-reference audit against this map.*
