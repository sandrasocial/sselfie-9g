# TASK V-01 — Full Product Audit
Priority: URGENT · Start immediately · Do before any new features
Estimated time: 2-3 hours
Assigned to: Codex

## Why this exists
Sandra is overwhelmed. The codebase has grown fast and now contains
features that are live, dead, half-built, or broken — and nobody has
a complete picture of what exists. Every time something new gets built,
something else breaks because the full map is missing.

This audit creates that map. Nothing new gets built until this is done.

---

## PART 1 — Feature Inventory

List every user-facing feature in the app. For each one, document:
- Name
- What it does (one sentence)
- Where it lives (route/component)
- Status: LIVE / BROKEN / DISABLED / HALF-BUILT / LEGACY
- Is it currently used by real users? (check DB/logs if possible)
- Dependencies (what does it rely on?)

Features to investigate (not exhaustive — find everything):
- Maya Classic Mode
- Maya Pro Mode (Nano Banana)
- Maya Feed Tab (reportedly disabled)
- Maya Prompt Builder
- Maya Studio Pro
- Feedplanner
- Feed Preview (2 welcome credits freebie)
- Academy
- Brand Engine application + pipeline
- Checkout / payment flow
- Credit system
- LoRA model training
- Photoshoot / generate-grid
- B-roll images
- Instagram tips
- Research mode
- User onboarding flow
- Subscription management
- Admin dashboard

---

## PART 2 — Database Audit

List every table in the database. For each one:
- Table name
- What it stores
- Last written to (check updated_at or created_at)
- Is it actively used by live features?
- Flag as: ACTIVE / STALE / ORPHANED / UNKNOWN

Special attention to:
- Any tables with 0 rows or last updated > 60 days ago
- Any tables referenced in code but not in migrations
- Any tables in migrations but not referenced in code

---

## PART 3 — Route Audit

List every API route in /app/api. For each:
- Route path
- What it does
- Last called (check logs if possible)
- Status: ACTIVE / UNUSED / BROKEN

Flag any routes that:
- Are never called by the frontend
- Have no authentication
- Duplicate functionality of another route

---

## PART 4 — Credit System Audit

Map the complete credit system:
- How are credits assigned? (signup, subscription, manual)
- How are credits consumed? (which actions cost credits)
- Current credit costs per action
- Are there free actions that cost Sandra money (API calls)?
- What happens when a user runs out of credits?
- Is the 2 welcome credit freebie working as intended?

---

## PART 5 — User Journey Simulation

Simulate these three user journeys and document exactly what happens
at each step, including any errors, dead ends, or confusing moments:

Journey 1 — New free user
1. Land on homepage
2. Sign up
3. First experience (what do they see?)
4. Try to use Maya
5. Run out of credits
6. Upgrade prompt (does it appear? is it clear?)
7. Upgrade to membership

Journey 2 — Paid member (Classic Mode)
1. Log in
2. Train LoRA model
3. Open Maya Classic
4. Ask Maya: "Here is my content calendar for this week, create visuals for each post"
5. Generate images
6. Access Feedplanner
7. Access Academy

Journey 3 — Paid member (Pro Mode)
1. Log in
2. Open Maya Pro
3. Upload reference images
4. Ask Maya: "Here is my content calendar for this week, create visuals for each post"
5. Generate images
6. What happens if they ask Maya something she can't do?

For each journey document:
- What works
- What breaks or errors
- What's confusing
- What's missing
- Dead ends (user gets stuck with no clear next step)

---

## PART 6 — Maya Intelligence Audit

Specifically test Maya's conversational ability:
- Send Maya: "Here is my content calendar, I need visuals for these posts: Monday - motivational quote about resilience, Wednesday - product showcase, Friday - behind the scenes"
- Document exactly what Maya responds
- Does she understand and execute? Or does she fall back to generic responses?
- Test in both Classic and Pro mode
- Test on the Feed tab if accessible

Also audit:
- What model is Maya currently using for chat? (Claude version?)
- What is the full system prompt Maya receives?
- Are there any recent changes to Maya's system prompt that might explain degraded performance?
- How does Maya handle requests she can't fulfil?

---

## PART 7 — What's Half-Built

Find any features that were started but never finished:
- Components that exist but aren't connected to routes
- Routes that exist but aren't called from the frontend
- Database columns that exist but are never written to
- TODOs or FIXMEs in the codebase (grep for these)
- Commented-out code blocks that suggest abandoned features

---

## PART 8 — Cost Audit

For each AI/API integration, estimate the cost per user action:
- Replicate: LoRA training cost per model
- Replicate: Classic mode generation cost per image
- Replicate: Pro mode (Nano Banana) cost per image
- Anthropic: Maya chat cost per message
- Resend: Email cost per send
- Vercel: Any usage-based costs

Then calculate:
- Cost to serve one free user (2 welcome credits)
- Cost to serve one paying member per month
- Current margin per member at current pricing

---

## Deliverable

One markdown file: docs/audits/PRODUCT-AUDIT-2026-02-18.md

Structure it clearly with all 8 parts.
Use tables where helpful.
Be direct about what's broken or abandoned — no sugarcoating.
This document will be used by Sandra and Claude to make product decisions.
It needs to be honest and complete.

---

## Out of scope
- Do NOT fix anything during this audit
- Do NOT refactor any code
- Do NOT delete anything
- Do NOT change any database schemas
- ONLY read, test, and document

## Acceptance criteria
- [ ] All 8 parts completed
- [ ] Every live feature documented with status
- [ ] All three user journeys simulated and documented
- [ ] Maya calendar request tested in both modes
- [ ] Cost per user calculated
- [ ] Delivered to docs/audits/PRODUCT-AUDIT-2026-02-18.md
- [ ] Report back to Sandra with summary of biggest findings
