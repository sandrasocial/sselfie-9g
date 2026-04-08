# Docs map — what’s current vs archive

This file is the **map of project documentation**. Use it to know what is maintained as current vs historical reference.

**Canonical rules for Cursor and agents:** `docs/_CANONICAL/CURSOR_CONSTITUTION.md` and repo-root `AGENTS.md`. Read those first for behavior and doc authority.

---

## Active / current

These folders and areas are treated as **current** (updated and used for decisions and implementation):

| Area | Purpose |
|------|--------|
| **`_CANONICAL/`** | Cursor constitution, system reality, execution status, drift rules — **authoritative**. |
| **`features/`** | Feature specs (Maya, Feed Planner, Academy, Gallery, etc.). |
| **`in-app-funnel/`** | In-app journey, Academy funnel, content/copy, wireframes, prioritized list. |
| **`codex-tasks/`** | Codex/agent task briefs and reports. |
| **`brand/`** | Voice Bible, DO_DONT, MESSAGING_PILLARS, cohort launch, content studio, ManyChat, etc. |
| **`setup/`** | Setup and environment docs. |
| **`database/`** | Schema and DB reference. |
| **`email/`** | Email automation and templates. |
| **`ui/`** | UI and design notes. |
| **`audits/`** | Code/UX audits (reference). |
| **`fixes/`** | Fix writeups (reference). |
| **`maya/`** | Maya-specific docs. |
| **`alex/`** | Alex (admin chat) docs. |
| **`blueprint-funnel/`** | Blueprint funnel. |
| **`content-engine/`** | Content engine. |
| **`phases/`** | Phase planning. |
| **`feed-planner/`** | Feed planner (non-archive). |

Repo-root **`tasks/`** holds active task specs (e.g. ACADEMY-02, UX-01). Root **`STATUS.md`**, **`docs/MASTER_BRIEF.md`**, **`docs/AI_PROGRESS_TRACKER.md`** are current.

---

## Archive / reference

Treat as **historical context only** — not current spec. Do not rely on these for up-to-date behavior or product decisions:

- **`docs/archive/`**
- **`docs/root-archive/`**
- **`docs/feed-planner/archive/`**
- **`docs/_ARCHIVE/`**
- **`docs/implementation/`** (implementation reports and old plans)
- Any path under `docs/` that contains **`archive`** or **`_ARCHIVE`**

---

## Entry points for agents

1. **Cursor rules and doc authority:** `docs/_CANONICAL/CURSOR_CONSTITUTION.md` and **`AGENTS.md`**.
2. **State and execution:** `docs/CODEX_CONTEXT.md`, `docs/_CANONICAL/EXECUTION_STATUS.md`, `docs/AI_PROGRESS_TRACKER.md`.
3. **Product and funnel:** `docs/MASTER_BRIEF.md`, `docs/features/`, `docs/in-app-funnel/`.

Generated outputs (e.g. `output/automation/*`, `output/agents/*`) are **not** canonical docs; use for logs and evidence only.
