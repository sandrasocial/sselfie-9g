# Agent Truth Model — Canonical Hierarchy and Handoff Contract

**Status:** Authoritative for agent memory, handoff, and file authority.  
**Version:** 1.0 — 2026-03-13 (Agent Truth Sync).  
**Do not override:** All agent prompts and protocol docs must align with this model.

---

## 1. Canonical truth chain (order of precedence)

Agents must resolve business and product facts in this order. Later steps override earlier only when explicitly "live" (see below).

| Order | Source | Scope | When to use |
|-------|--------|--------|-------------|
| 1 | `sselfie-9g/CLAUDE.md` | Business direction, active products, operating rules, known issues, constants (URLs, IDs), dead-code map | Every session start; never skip. |
| 2 | `sselfie-9g/docs/CODEX_CONTEXT.md` | Tech stack, constraints, file map, current focus areas, automation/cron context | Session start; before implementation or automation changes. |
| 3 | `~/stella/NORTH_ACTIVE.md` | Compact runtime snapshot (refreshed from live Stripe + ACTIVE artifacts) | When needing "current" task/report list or product frame; do not treat as source for revenue/audience counts. |
| 4 | Live systems | Stripe (revenue, subscriptions, prices), Resend (audience, broadcasts), Neon (funnel/entitlements) | When an exact number or current state matters; always cite source and timestamp. |
| 5 | `sselfie-9g/STATUS.md` | Technical and deploy truth only (last task, deploy state, verification notes) | When app/runtime/deploy state is relevant; not for business metrics. |

**Rule:** If a fact is time-sensitive or numeric, prefer live systems over docs. If docs and live conflict, say "Unknown (needs verification)" and run the next check.

---

## 2. Memory tiers

| Tier | Purpose | Examples | Writable by | Trust level |
|------|---------|----------|-------------|-------------|
| **Canonical** | Single source of truth for direction and rules | CLAUDE.md, CODEX_CONTEXT.md, this file | Sandra / Claude (Cowork) / designated owner | Authoritative |
| **Runtime snapshot** | Compact, refreshable view of current work and product frame | NORTH_ACTIVE.md | refresh_north_active.sh (from Stripe + ACTIVE) | Authoritative for "what's active now"; not for historical metrics |
| **Handoff log** | Blockers, completions, decisions that other agents need this session | SHARED_MEMORY.md | sync_shared_memory.sh, submit_handoff_to_north.sh | Supplemental only; never use for revenue/audience/product truth |
| **Active work** | Current task briefs and execution evidence | ACTIVE/tasks/, ACTIVE/reports/ | North, north-code, Claude, Stella (per role) | Authoritative for "what we're doing"; evidence only after verification |
| **Retired** | No longer used for truth; stub or historical only | NORTH_TASK_QUEUE.md, BUSINESS_STATE.md, NORTH_TASK_QUEUE_FEB27_*.md | None (read-only stubs) | Do not read for business decisions; do not write |

---

## 3. Handoff schema contract

Every agent-to-agent or agent-to-human handoff must include (when applicable):

| Field | Required | Description |
|-------|----------|-------------|
| **Result** | Yes | One sentence: what was done or decided. |
| **Evidence** | Yes | Where to verify (file path, URL, script output, or "live Stripe/Resend"). |
| **Confidence** | Yes | High / Medium / Low; if Low, state what would raise it. |
| **Next** | Yes (0–2 items) | Concrete next actions or "None." |
| **Source** | Yes | Agent or human ID (e.g. north-code, Claude, Sandra). |
| **Timestamp** | Yes | ISO or "YYYY-MM-DD HH:MM TZ". |

**Tooling:** Use `submit_handoff_to_north.sh` for structured handoffs into the handoff queue. Use `sync_shared_memory.sh --write` for session-end handoff notes. Do not put business metrics (MRR, subscriber counts, prices) into SHARED_MEMORY.md; use NORTH_ACTIVE.md refresh or live checks.

---

## 4. Task and report locations (current)

| What | Location | Retired / do not use |
|------|----------|----------------------|
| Active task briefs and specs | `~/stella/ACTIVE/tasks/` | NORTH_TASK_QUEUE.md |
| Execution reports and evidence | `~/stella/ACTIVE/reports/` | BUSINESS_STATE.md |
| Drafts (content, email) | `~/stella/ACTIVE/drafts/` (prefer) or `~/stella/drafts/` | — |
| Stella/Codex task specs (repo) | `sselfie-9g/tasks/codex-*.md` | — |

**Rule:** Before adding a task, check `~/stella/ACTIVE/tasks/` and `~/stella/NORTH_ACTIVE.md`. Do not create or update NORTH_TASK_QUEUE.md or BUSINESS_STATE.md.

---

## 5. Drift controls

- **Reference integrity:** Every file path referenced in agent prompts or this model must exist (or be clearly marked "optional" / "legacy"). Broken links are P0 fixes.
- **Authority conflict:** No retired file may be described as "source of truth" or "check before adding tasks." Retired = stub + pointer to replacement only.
- **Stale fact check:** Revenue, audience, and price numbers in docs are "last verified" only; when in doubt, run live Stripe/Resend and cite.
- **Single chain:** CLAUDE.md, CODEX_CONTEXT.md, North prompts (AGENTS.md, BOOTSTRAP.md, SOUL.md, agents/*.md), and memory/context/openclaw-protocol.md must all state the same truth chain and the same handoff/task locations.

---

## 6. Change governance

- **Owner:** Sandra; Claude (Cowork) and North maintain alignment.
- **Review:** When adding or changing an agent-facing file (prompts, CLAUDE.md, CODEX_CONTEXT.md, memory/context, stella AGENTS.md/BOOTSTRAP/SOUL), ensure (1) no new reference to retired files as authoritative, (2) handoff schema and task locations match this doc, (3) reference-integrity check still passes.
- **Rollback:** Keep retired stubs (NORTH_TASK_QUEUE.md, BUSINESS_STATE.md) as redirect-only; do not delete until no prompt references them. After full sync, remove or update any remaining references, then optionally archive stubs.

---

*See also: [AGENT_FILE_AUTHORITY_MAP.md](../AGENT_FILE_AUTHORITY_MAP.md), [AGENT_DRIFT_REPORT_2026-03-13.md](../AGENT_DRIFT_REPORT_2026-03-13.md).*
