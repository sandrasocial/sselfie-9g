# Feature documentation for agents & product (Sandra)

**Goal:** Document every user-facing feature (Maya, Feed Planner, Gallery, Academy, Profile, Admin) from end to end — frontend, backend, and all logic — so subagents and North can:

1. **Understand exactly** how each feature and screen works from start to finish.
2. **Research** what your audience needs and wants.
3. **Propose** how to rebuild each feature for more value and 300+ happy recurring members.
4. **Use** the newest AI technologies where they fit.

---

## How we do this

### Step 1: One canonical doc per feature

Each feature has **one doc** in `docs/features/` following the same **template** (`docs/features/TEMPLATE.md`):

| Feature        | Doc                | Status   |
|----------------|--------------------|----------|
| Maya           | `maya.md`          | Done (canonical product intent + pipeline map Feb 2026) |
| Feed Planner   | `feed-planner.md`  | Done (canonical history + Blueprint funnel Feb 2026) |
| Gallery        | `gallery.md`       | Done     |
| Academy        | `academy.md`       | Done     |
| Profile/Account| `profile.md`       | Done     |
| Admin          | `admin.md`         | Done     |

**Cross-feature:** For **in-app user journey + Academy funnel integration** (funnel and mini products inside the app, AI/interactive/conversational), see **`docs/features/IN-APP-JOURNEY-AND-ACADEMY-FUNNEL.md`** — it defines what subagents research and deliver vs what implementation builds.

**Research deliverables (produced Feb 2026):** The subagents assigned to `IN-APP-JOURNEY-AND-ACADEMY-FUNNEL.md` produced 5 ready-to-use implementation files in **`docs/in-app-funnel/`**: journey map, content/copy, wireframes, prioritized sprint list, and QA checklist. Codex reads these before implementing tasks A-01, C-01, C-02, C-03.

Research agents: **Maya** and **Feed Planner** have the most detailed product history and intent; use them as the primary reference for those features. For all features, use `output/automation/funnel-digest-*.md` and `support-digest-*.md` to fill "Current value / pain" and "Opportunities."

- **User journey** — screens and steps from first entry to exit.
- **Frontend** — routes, main components, key UI state and navigation.
- **Backend** — API routes, server actions, cron/webhooks if relevant.
- **Logic** — credits, entitlements, access control, data flow.
- **Code links** — file paths so agents know exactly where to look.
- **Current value / pain** — to be filled from research and funnel/support evidence.

### Step 2: How subagents and North use the docs

- **Research (audience needs):** Use funnel digests, support digests, and feedback to fill “Current value / pain” and “Opportunities” in each feature doc. No code changes — evidence and hypotheses only.
- **Proposals (rebuild for value):** Agents read the feature doc to know the current flow and code locations; then propose changes (copy, flows, AI upgrades) that align with the doc and the 300+ recurring members goal.
- **Implementation:** Any change stays within constitution rules (critical-file policy, no broad refactors without approval). The doc is the source of truth for “how it works today.”

### Step 3: Filling the docs

- **All six features** are documented (Maya, Feed Planner, Gallery, Academy, Profile, Admin) from a full codebase audit (North). See the table in Step 1.
- **Research layer:** Research agents (or North) can now add “Audience evidence” and “Opportunities” to each doc using `output/automation/funnel-digest-*.md`, `support-digest-*.md`, and other feedback.

### Step 4: Keeping docs current

- When you or an agent ships a big change to a feature, update the corresponding feature doc in the same PR (or immediately after).
- Weekly or before a “North” research run: quick check that entry points and main flows in the doc still match the app.

---

## What you get

- **Agents** know exactly how each feature works (frontend + backend + logic) and where to look in the repo.
- **North / subagents** can research audience needs per feature and propose smarter, higher-value rebuilds using the latest AI.
- **You** have one place per feature to see the full picture and tie it to the 300+ recurring membership goal.
- **Stability** is preserved: docs are read-first; implementation still follows the constitution and safety gates.

---

## Quick reference

- **Template:** `docs/features/TEMPLATE.md`
- **Example:** `docs/features/maya.md`
- **This plan:** `docs/features/README.md`
- **Governance:** `docs/_CANONICAL/CURSOR_CONSTITUTION.md`, `docs/AI_PROGRESS_TRACKER.md`
