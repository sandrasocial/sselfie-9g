# Agent Verification Guardrails

**Purpose:** Recurring checks to keep agent truth chain and file references consistent and drift-free.  
**Owner:** Claude (Cowork) or North; run pre-session or on a daily/weekly cadence.  
**Source:** [docs/_CANONICAL/AGENT_TRUTH_MODEL.md](_CANONICAL/AGENT_TRUTH_MODEL.md).

---

## 1. Reference integrity check

**Goal:** Every file path referenced in agent prompts and authority docs exists (or is explicitly optional/legacy).

**Steps:**
1. Extract all referenced paths from: `sselfie-9g/CLAUDE.md`, `sselfie-9g/AGENTS.md`, `sselfie-9g/docs/CODEX_CONTEXT.md`, `sselfie-9g/.cursorrules`, `sselfie-9g/docs/_CANONICAL/CURSOR_CONSTITUTION.md`, `sselfie-9g/memory/context/*.md`, `sselfie-9g/docs/AGENT_FILE_AUTHORITY_MAP.md`, and `~/stella/AGENTS.md`, `~/stella/BOOTSTRAP.md`, `~/stella/SOUL.md`, `~/stella/MEMORY.md`, `~/stella/agents/*.md`, `~/stella/agents/north-email/*.md`.
2. For each path (resolving `~` to actual home and repo root): if path is a file, check file exists; if path is a directory, check directory exists; if glob (e.g. `ACTIVE/tasks/*.md`), check directory exists.
3. List missing paths as failures. Optional/legacy paths (e.g. "reports/REVENUE-IMPACT-*.md") may be "directory exists, no match" = warning only.

**Cadence:** Pre-session (manual or script) or weekly.  
**Output:** Pass / fail + list of missing paths. Fix missing refs or add to "optional" list in AGENT_FILE_AUTHORITY_MAP.md.

---

## 2. Authority conflict check

**Goal:** No retired file is described as authoritative (e.g. "source of truth", "check before adding tasks").

**Steps:**
1. Grep for "NORTH_TASK_QUEUE" and "BUSINESS_STATE" in all agent-facing docs (repo + stella).
2. Any line that says to "check", "read first", "source of truth", or "update" for these files (except "retired" / "do not use" / "stub") = failure.
3. Grep for "SHARED_MEMORY" in same set; any line that says "all agents read on session start" or "canonical" without "handoff only" = failure.

**Cadence:** After any edit to CLAUDE.md, memory/context, or stella AGENTS/BOOTSTRAP/SOUL.  
**Output:** Pass / fail + file:line of violations. Fix wording to match AGENT_TRUTH_MODEL.md.

---

## 3. Stale fact check (sensitive values)

**Goal:** Revenue, audience, and price numbers in docs are either (a) clearly "last verified DATE" or (b) "verify live (Stripe/Resend) before quoting."

**Steps:**
1. In CLAUDE.md and NORTH_ACTIVE.md, identify any hardcoded MRR, subscriber count, "28 paying", "15 Studio + 13 Blueprint", price IDs, audience IDs.
2. Ensure there is a nearby rule: "verify live before quoting" or "Last verified: YYYY-MM-DD".
3. If a number is stated as current with no verification rule or old date (> 30 days), flag as warning.

**Cadence:** Weekly or before any broadcast/decision that uses those numbers.  
**Output:** Pass / warn + list of unverified or old numbers. Prefer adding "verify live" and refresh NORTH_ACTIVE.

---

## 4. Handoff schema check

**Goal:** New handoff tooling or docs still require Result, Evidence, Confidence, Next, Source, Timestamp.

**Steps:**
1. Review any new script or doc that describes "handoff" or "submit to North".
2. Confirm it requires or produces the six fields from AGENT_TRUTH_MODEL.md § 3.
3. If a template omits any, add it.

**Cadence:** When adding or changing submit_handoff_to_north.sh, sync_shared_memory.sh, or handoff docs.  
**Output:** Pass / fail. Update template or doc.

---

## 5. Single truth chain check

**Goal:** CLAUDE.md, CODEX_CONTEXT.md, North AGENTS.md, BOOTSTRAP.md, SOUL.md, and memory/context/openclaw-protocol.md all state the same canonical order (CLAUDE → CODEX_CONTEXT → NORTH_ACTIVE → live/STATUS) and same task location (ACTIVE/tasks/).

**Steps:**
1. For each of the six files, extract the "read order" or "truth chain" section.
2. Compare: (1) first source = CLAUDE.md, (2) second = CODEX_CONTEXT.md, (3) third = NORTH_ACTIVE.md or live, (4) tasks = ACTIVE/tasks/ not NORTH_TASK_QUEUE.
3. Any file that contradicts = failure.

**Cadence:** After any change to truth chain in one file.  
**Output:** Pass / fail + which file disagrees. Align to AGENT_TRUTH_MODEL.md.

---

## 6. Automation / script location

- **Repo:** `sselfie-9g/scripts/agent-integrity-check.mjs` — runs reference-integrity check (1) for required repo and stella paths. Usage: `node scripts/agent-integrity-check.mjs` (optional: `STELLA_HOME=/path node scripts/agent-integrity-check.mjs`).
- **Stella:** Add to existing `sync_shared_memory.sh --read` or `enforce-memory-sync.sh check` to run authority-conflict (2) and single truth chain (5) for stella files only if desired.

No need to run 3 (stale fact) automatically; manual or weekly is enough. 4 is on change to handoff tooling.

---

## 7. Governance cadence

| Check | Cadence | Owner |
|-------|---------|--------|
| Reference integrity (1) | Weekly or pre-major agent change | North / Claude |
| Authority conflict (2) | On edit to CLAUDE, memory/context, stella prompts | Who edits |
| Stale fact (3) | Weekly or before broadcast | North / Claude |
| Handoff schema (4) | On change to handoff scripts/docs | Who edits |
| Single truth chain (5) | On change to any truth-chain doc | Who edits |

**Acceptance gate:** Before merging or committing changes to CLAUDE.md, AGENTS.md (repo or stella), CODEX_CONTEXT.md, memory/context, or BOOTSTRAP/SOUL: run 2 and 5; fix any failure.
