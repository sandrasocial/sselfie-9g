# In-app user journey + Academy funnel integration

**Purpose:** Single brief for making the **new funnel** and **Academy mini products** part of the **in-app user journey**, with everything working together and more **AI / interactive / conversational** use. Clarifies who does what: **subagents** = research, content, designs; **implementation** (Codex) = code only.

**Audience:** Sandra, subagents (North / research), and the implementation agent. Read this before proposing or building in-app funnel/Academy flows.

---

## 1. What’s already researched and listed

### Funnel and mini products (planning)

| Doc | Contents | Status |
|-----|----------|--------|
| `docs/MINI-PRODUCTS-EXECUTIVE-SUMMARY.md` | 6 mini products (Starter Photoshoot, Paid Blueprint, Credit Boosters, 9-Post Feed, Bio Glow-Up, Rebrand Reset); 90-day rollout; revenue targets | Planning only |
| `docs/MINI-PRODUCT-MONETIZATION-AUDIT.md` | Full audit, PR-sized tasks, risk, metrics | Planning only |
| `docs/MINI-PRODUCTS-CHECKLIST.md` | Week-by-week checklist | Planning only |
| `docs/PAID-BLUEPRINT-AND-MINI-PRODUCTS-STATUS.md` | Paid Blueprint ~70% done; mini products 0% implemented (except where below) | Status snapshot Jan 2026 |

### Academy mini products (Maria Wendt model)

| Doc | Contents | Status |
|-----|----------|--------|
| `docs/codex-tasks/ACADEMY-MINI-PRODUCTS-AUDIT.md` | Academy as multi-product engine; per-product access; 6 products (Selfie Queen, Caption Pack, Flatlay, Content Calendar, Brand Blueprint, Masterclass); tasks A-01–A-10 | Strategy + task list |
| `tasks/ACADEMY-02-CODEX-SPEC.md` | Checkout API, webhook extension, post-purchase email, `/academy` + success + product pages | **Implementation spec (partially built)** |

### What’s already live in the app

- **Public Academy mini products:** `/academy` landing, checkout (`/api/academy/checkout`), Stripe webhook granting access, `academy_course_purchases` + `user_tags`, `/academy/success`, `/academy/products/[productId]`. Products (e.g. What To Say, Show Up, Get Paid) are purchasable; access is per product.
- **In-app Academy tab:** `AcademyScreen` in Studio: courses, templates, monthly drops, flatlays. Gated by **Studio membership** (all-or-nothing). No per-product purchase inside the app yet — that’s on the **public** `/academy` page.
- **User journey doc:** `docs/COMPLETE_USER_JOURNEY_MAP.md` — Free → Paid Blueprint → Creator Studio; Feed Planner as Blueprint funnel; no in-app “next step” or AI handoffs yet.

---

## 2. The gap: in-app journey + AI / interactive / conversational

**Goal:** The funnel and Academy mini products should feel **inside the app**, not only on a separate landing/checkout. Everything should **work together** and use **more AI intelligence and interactive, conversational** flows.

Concretely:

1. **In-app journey**
   - After a user buys an Academy mini product (or completes a step), the **next step** is clear **inside the app** (Academy tab, Maya, Feed Planner, or Gallery).
   - Entry from Studio: e.g. Academy tab surfaces “you have X / get Y next” and deep links to Maya or Feed Planner when that’s the logical next step.
   - No dead ends: purchase → clear “go here next” in-app (and in email).

2. **Everything works together**
   - Academy ↔ Maya ↔ Feed Planner ↔ Gallery: cross-links and CTAs (e.g. “You bought What To Say — create your first captions in Feed Planner” or “Maya can help you plan the week”).
   - Funnel stage (free / paid blueprint / member / academy buyer) drives what’s shown and what’s suggested.

3. **More AI and interactive / conversational**
   - **Maya:** Can reference what the user bought or completed (e.g. “You have What To Say — want me to help you plan your first week of captions?”). Might use tags/purchases in system context.
   - **Interactive:** In-app prompts, checklists, or “next best action” (e.g. “Create your first feed” in Feed Planner, “Start lesson 1” in Academy).
   - **Conversational:** Short, guided flows or Maya-driven next steps instead of only static CTAs.

**What is out of scope for this brief:** Rebuilding Maya’s core chat, re‑engineering Feed Planner’s generation pipeline, or changing payment/webhook logic. Scope is **surfacing** funnel + Academy inside the app and **adding** AI/interactive/conversational touchpoints.

---

## 3. What subagents should do (research, content, designs)

Subagents **do not write code**. They produce **research, content, and designs** that implementation uses.

### 3.1 Research

- **Journey map (in-app):** For each funnel stage (free, paid blueprint, member, academy mini-product buyer), document:
  - Where the user lands after signup, purchase, or key action.
  - Where they **should** land next in the app (Academy tab, Maya, Feed Planner, Gallery).
  - Gaps: e.g. “After buying What To Say there is no in-app next step.”
- **Evidence:** Use `output/automation/funnel-digest-*.md`, `support-digest-*.md`, and feature docs (`docs/features/academy.md`, `feed-planner.md`, `maya.md`). Note drop-off or confusion points.
- **Deliverable:** A short “In-app journey map” doc or section (per stage: current state → desired next step + suggested surface).

### 3.2 Content

- **Copy for in-app CTAs:** e.g. “You have access to [Product]. Start here →”, “Create your first feed”, “Ask Maya to plan your captions”.
- **Maya prompts / system-context notes:** Suggested first message or system-prompt additions for “user just bought X” or “user completed Y” (so Maya can offer relevant next steps). No API or code — just copy and rules (e.g. “If tag = bought_what_to_say, suggest caption planning in Feed Planner or Maya”).
- **Email + in-app alignment:** Post-purchase email says “Open the app and go to Academy / Maya / Feed Planner” with a clear in-app destination; subagents propose that copy and flow.
- **Deliverable:** A “Content and copy” doc (or section) with exact strings and when they’re used.

### 3.3 Designs

- **Wireframes or UI notes** for:
  - Academy tab (in-app): how “you have X / get Y next” and “Start” / “Buy” are shown; how a “next step” (e.g. Maya, Feed Planner) is surfaced.
  - Post-purchase in-app moment: e.g. modal or banner after checkout redirect: “You’re in. Next: [Start What To Say] or [Plan with Maya].”
  - Maya: where a “suggested next step” (e.g. “Plan your first week of captions”) appears (first message, sidebar, or card) — no backend logic, just placement and wording.
- **Design system:** Follow existing SSELFIE design tokens; no new systems. Note: mobile-first, existing components where possible.
- **Deliverable:** Wireframes or a short “UI spec” (screens + copy + links) that implementation can follow.

### 3.4 Prioritization

- Subagents recommend **order of work**: e.g. “First: in-app post-purchase next step + Academy tab ‘you have X’. Second: Maya context for academy buyers. Third: Feed Planner ↔ Academy cross-promo.”
- **Deliverable:** A prioritized list (with rationale) in the same doc or a “Prioritized in-app funnel” section.

---

## 4. What implementation needs before coding

Implementation (Codex) **only does code**. It needs from subagents:

1. **In-app journey map** — per stage: current entry + desired next step + where it’s shown (Academy tab, Maya, Feed Planner, etc.).
2. **Content and copy** — exact strings and when they’re used (including Maya suggestions and CTAs).
3. **UI spec or wireframes** — screens and components (Academy tab, post-purchase, Maya “next step”) so we know what to build.
4. **Prioritized list** — what to build first so we can scope a first slice (e.g. “post-purchase redirect + Academy tab ‘you have X’ + one Maya prompt”).

Without these, implementation can only guess at flows and copy; with them, we can implement step by step and keep the app consistent with the funnel and Academy strategy.

---

## 5. Deliverables received (2026-02-25)

Subagents delivered all four items. **Implementation (Codex) has everything needed to start.**

| # | Deliverable | Location | Notes |
|---|-------------|----------|--------|
| 1 | In-app journey map | `docs/in-app-funnel/01-journey-map-2026-02-25.md` | 4 funnel stages, current → desired next step, gaps, suggested surface; anchored to 0/14 activation |
| 2 | Content and copy | `docs/in-app-funnel/02-content-copy-2026-02-25.md` | Ready-to-ship strings: “You have access” cards, Maya first-message rules per product tag, post-purchase CTAs, email openers, upgrade headline |
| 3 | Designs / wireframes | `docs/in-app-funnel/03-designs-wireframes-2026-02-25.md` | ASCII wireframes (mobile 375px): Academy “You Have Access” row, post-purchase modal, Maya next-step card, Maya 3-step guided flow; design tokens applied |
| 4 | Prioritized list | `docs/in-app-funnel/04-prioritized-list-2026-02-25.md` | 3 slices: Week 1 (activation), Weeks 2–3 (Academy + Maya context + Gallery/Profile/Prompts), Week 4 (upgrade + mode clarity); defer list; 5 open questions for Sandra |

**Implementation task list:** `docs/codex-tasks/RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md` — 11 tasks (A-01, A-02, B-01–B-03, C-01–C-03, D-01, D-02) plus quick wins (E-01–E-03). Recommended order and file pointers are in that doc and in the prioritized list (§4 above).

**Before starting Slice 1:** Review the 5 open questions in `04-prioritized-list-2026-02-25.md`; implement only after Sandra confirms or defers.

---

## 6. References

| Topic | Doc / location |
|-------|----------------|
| **Research deliverables (handoff)** | **`docs/in-app-funnel/`** — 01 journey map, 02 content-copy, 03 designs-wireframes, 04 prioritized-list (all 2026-02-25) |
| Implementation tasks | `docs/codex-tasks/RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md` |
| Full user journey (three tiers) | `docs/COMPLETE_USER_JOURNEY_MAP.md` |
| Maya (scope, Feed tab disabled) | `docs/features/maya.md` |
| Feed Planner (Blueprint funnel, manual) | `docs/features/feed-planner.md` |
| Academy (in-app + public mini products) | `docs/features/academy.md` |
| Mini products (6-product funnel) | `docs/MINI-PRODUCTS-EXECUTIVE-SUMMARY.md`, `docs/PAID-BLUEPRINT-AND-MINI-PRODUCTS-STATUS.md` |
| Academy mini products (Maria Wendt, tasks) | `docs/codex-tasks/ACADEMY-MINI-PRODUCTS-AUDIT.md`, `tasks/ACADEMY-02-CODEX-SPEC.md` |
| Feature docs index | `docs/features/README.md` |

---

## 6. Summary

- **Already done:** Funnel and Academy mini-product **strategy and planning**; **public** Academy checkout and product access are live; in-app Academy tab is membership-gated.
- **Gap:** Funnel and Academy are not yet **part of the in-app journey** with clear next steps and **AI / interactive / conversational** touchpoints.
- **Subagents:** Produce **in-app journey map**, **content/copy**, **designs/wireframes**, and **prioritization**.
- **Implementation:** Implements **only after** those deliverables exist; no code from subagents.

When subagents deliver the four items in §4, implementation can integrate the funnel and Academy into the in-app journey and add the first AI/interactive/conversational steps.
