# Phase 4: Documentation Cleanup

**Date:** February 2026  
**Scope:** All `.md` files (excluding `.backups` and `node_modules`)  
**Total:** 1,062 files, ~350K lines

---

## Summary

| Category | Description | Action |
|----------|-------------|--------|
| **Documents features that exist** | Align with current code (Blueprint, Feed Planner, Studio, Maya, Stripe, Admin, Brand Engine, Email) | **KEEP** |
| **Documents features never built or removed** | Alex (admin chat), Composition system, some Gumloop flows, old admin pages | **ARCHIVE** |
| **Outdated API docs or changelogs** | api-routes.md (references removed Alex routes), PR-* verification packs, phase completion reports | **ARCHIVE or UPDATE** |
| **AI-generated boilerplate** | Point-in-time "COMPLETE" summaries, "VERIFICATION" packs, duplicate audits | **ARCHIVE** |

---

## 1. Documents That Document Features That EXIST

These describe current, live functionality. **Keep.**

### Canonical / rules (single source of truth)

- **docs/_CANONICAL/CURSOR_CONSTITUTION.md** — Cursor AI rules; referenced by .cursorrules.
- **docs/_CANONICAL/PROMPT_AUTHORITY_POLICY.md** — Prompt pipeline policy.
- **docs/_CANONICAL/SAFE_MODE_POLICY.md** — Safe mode / incidents.
- **docs/_CANONICAL/SYSTEM_REALITY.md** — System reality baseline (trim if redundant with COMPLETE_USER_JOURNEY_MAP).
- **docs/_CANONICAL/ADMIN_SYSTEM.md** — Admin system overview (align with current admin pages).
- **docs/_CANONICAL/EMAIL_SENDING_AUDIT.md** — Email sending (align with Resend/Flodesk in use).

### User journey and product

- **docs/COMPLETE_USER_JOURNEY_MAP.md** — Master user journey (Free Blueprint, Paid Blueprint, Creator Studio). **Primary product doc.**
- **docs/PRODUCT_FLOWS_CANONICAL.md** — Product flows; keep if not fully superseded by COMPLETE_USER_JOURNEY_MAP.
- **docs/E2E_CORE_FLOWS.md** — E2E health-check flows (auth, credits, checkout, etc.). **Keep.**
- **docs/high-ticket-offer-strategy.md** — Strategy; keep for product context.
- **docs/waitlist-launch-announcements.md** — Launch copy; keep if still relevant.

### Blueprint (free + paid)

- **docs/PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md** — Implementation plan; keep as reference (or archive if fully done).
- **docs/PAID_BLUEPRINT_LANDING_IMPLEMENTATION_PLAN.md** — Landing flow.
- **docs/BLUEPRINT_FUNNEL_COMPREHENSIVE_AUDIT.md** — Funnel audit; keep one canonical funnel doc.
- **docs/STEP-1-PAID-BLUEPRINT-LAUNCH-PLAN.md** — Launch plan.
- **docs/ONBOARDING_EXPERIENCE_DESIGN_PLAN.md** — Onboarding wizard (unified-onboarding-wizard).
- **docs/UNIFIED_WIZARD_IMPLEMENTATION_PLAN.md** — Wizard implementation.

### Feed Planner

- **docs/feed-planner/FEED_PLANNER_ARCHITECTURE_MASTER.md** — Architecture; keep one master.
- **docs/FEED-IMAGE-GENERATION-FLOW.md** — Image generation flow.
- **docs/FEED-WORKFLOW-ANALYSIS.md** — Workflow.
- **docs/FEED_LAYOUT_ARCHITECTURE.md** (and root duplicate if same) — Layout; keep one.

### Maya / Pro / Studio

- **docs/PRO_PHOTOSHOOT_DOCUMENTATION.md** — Pro Photoshoot (exists in admin).
- **docs/PRO_PHOTOSHOOT_IMPLEMENTATION_PLAN.md**, **PRO_PHOTOSHOOT_VERIFICATION_REPORT.md** — Implementation/verification; keep or merge into one.
- **docs/maya/PROMPTING_FILES_COMPLETE_MAP.md** — Prompting files map.
- **docs/maya/IMPLEMENTATION_STATUS.md** — Maya implementation status.
- **docs/MAYA-PRO-MODE-STEP-BY-STEP-PROMPTS.md** — Pro mode prompts.
- **docs/_CANONICAL/NANO_BANANA_PROMPT_AUDIT_2026.md** — Nano Banana / Pro prompts.
- **docs/_CANONICAL/SCENE_COMPOSER_V1_DESIGN.md** — Scene composer (if still in use); otherwise archive.

### Stripe / billing / credits

- **docs/_CANONICAL/STRIPE_LIVE_VERIFICATION_AND_FIX.md** — Stripe verification.
- **docs/_CANONICAL/STRIPE_CHARGES_FORENSIC_AUDIT.md** — Forensic audit; keep for reference.
- **docs/STRIPE_DATA_ANALYSIS.md** — Data analysis.
- **docs/STRIPE_IMPLEMENTATION_REVIEW.md** — Implementation review.
- **docs/CREDIT-COST-AUDIT.md** — Credit costs.
- **docs/MINI-PRODUCTS-SYSTEM-DIAGRAM.md** — Products/pricing.

### Admin

- **docs/ADMIN_FEATURES_AND_TOOLS.md** — Admin features; **update** to match current admin pages (remove references to diagnostics/system and diagnostics/errors if pages don’t exist).
- **docs/PROJECT_TRACKER_SHARED_BRAIN.md** — Project tracker (admin).
- **docs/HOW_BRAND_ENGINE_WORKS.md** — Brand Engine (apply flow).
- **docs/BRAND_ENGINE_SETUP_FOR_SANDRA.md** — Setup guide.
- **docs/BRAND_ENGINE_PRODUCTION_READY.md** — Production readiness.

### Email

- **docs/EMAIL_SYSTEM_STATUS.md** — Email system status.
- **docs/EMAIL-SYSTEM-EXPLAINED.md** — Email explained.
- **docs/ALL_EMAIL_AUTOMATIONS_MASTER_LIST.md** — Cron/automations list; **update** to match app/api/cron and Resend/Flodesk.
- **docs/email-editing-flow.md** — **Archive:** describes “Alex” email editing; Alex (admin chat) was removed. If email editing exists elsewhere, document that instead.

### Schema / DB / API

- **docs/schema.md** — DB schema; keep current.
- **docs/database/DATABASE_SCHEMA.md** — DB schema (duplicate? keep one).
- **docs/api-routes.md** — **UPDATE:** Remove or mark as deprecated all `/api/admin/alex/*` and any other removed routes; align with app/api.

### Tests and ops

- **docs/HOW_TO_READ_E2E_LOGS.md** — E2E logs.
- **docs/feature-flags-and-cron.md** — Feature flags and cron.
- **docs/CRON-HEALTH-DASHBOARD.md** — Cron health.
- **docs/PRODUCTION-ENV-VARS-CHECK.md** — Env vars.
- **README.md** — Project README; keep.

### Recent audits (still useful)

- **docs/PHASE2_SYSTEMATIC_AUDIT.md** — Phase 2 route/component/API audit. **Keep.**
- **docs/PHASE4_DOCUMENTATION_CLEANUP.md** — This doc. **Keep.**

---

## 2. Documents That Document Features That Were NEVER BUILT or Were REMOVED

**Archive** (move to `docs/_ARCHIVE/phase4-docs-never-built-or-removed/` or similar).

### Alex (admin chat — removed; code in .backups only)

- **docs/email-editing-flow.md** — “Email Editing Flow in Alex Chat”; Alex removed.
- **docs/alex/** — All Alex audits, guides, checklists (ALEX_*, alex-tool-development-guide.md, etc.).
- **docs/EMAIL-AGENT-IMPLEMENTATION-CHECKLIST.md** — If it refers to Alex email agent only.
- **api-routes.md** — Sections listing `/api/admin/alex/*` (remove or mark deprecated; routes don’t exist in app/api).

### Composition system (removed; COMPOSITION-* in backup-before-cleanup)

- Any doc whose **primary** subject is “Composition” builder/analytics/integration (e.g. backup-before-cleanup/docs/COMPOSITION-*.md already in backup; do not re-archive same file).
- **docs/_CANONICAL/V1_PROMPTING_ARCHIVE_PLAN.md** — If it only describes composition/V1 prompting archive; else keep for prompt history.
- **docs/_CANONICAL/SCENE_COMPOSER_V1_DESIGN.md** — If Scene Composer was fully replaced/removed; else keep.

### Gumloop (partial; admin/agents uses Gumloop API, but many “Gumloop flow” docs are aspirational or outdated)

- **Root-level GUMLOOP_*.md** — GUMLOOP_AUTOMATION_SYSTEM, GUMLOOP_CONNECTION_GUIDE, GUMLOOP_EMAIL_INTEGRATION_PLAN, GUMLOOP_SETUP_GUIDE, GUMLOOP_AGENT_SETUP_GUIDE, GUMLOOP_FLOW_PROMPTS, etc. **Archive** if they describe flows that were never built; **keep** one short “Gumloop integration (admin agents)” doc if still relevant.
- **GUMLOOP_EMAIL_INTEGRATION_PLAN.md**, **GUMLOOP_EMAIL_INTEGRATION_PLAN** (duplicate?) — Archive or merge into one “current” note.

### Old admin pages (e.g. diagnostics/system, diagnostics/errors as pages)

- Docs that **only** describe admin pages that no longer exist (e.g. full “diagnostics system” UX that referred to removed pages). Prefer updating ADMIN_FEATURES_AND_TOOLS and admin dashboard links (see Phase 2) over keeping obsolete docs.

### Other “never shipped” or retired

- **docs/COMPOSITION-SYSTEM-REMOVAL-SUMMARY.md** — Removal summary; can archive.
- **docs/GROWTH-DASHBOARD-IMPLEMENTATION.md** — If growth dashboard was never built or was replaced; else keep.
- **docs/MASTER_COMMAND_CENTER.md**, **LAUNCH-TODAY.md**, **BUILD_AGENT_1_NOW.md**, **SIMPLE_ACTION_PLAN.md** — One-off command/launch docs; archive when no longer actionable.
- **docs/IMPLEMENTATION_ROADMAP.md** — Archive if superseded by COMPLETE_USER_JOURNEY_MAP and current backlog.

---

## 3. Outdated API Docs or Changelogs

**Update or archive.**

### API routes

- **docs/api-routes.md** — **UPDATE:** Remove or mark deprecated: `/api/admin/alex/*` (chat, chats, load-chat, new-chat, suggestions). Align remaining list with `app/api` (e.g. no admin/email/* in current app; only admin/email-campaigns, etc.). Add a “Last verified: YYYY-MM-DD” line.

### PR-* and phase completion reports (point-in-time)

- **docs/PR-*.md** — All PR-1 through PR-9 verification packs, summaries, hotfix docs. **Archive** to `docs/_ARCHIVE/phase4-pr-and-phase-reports/` (they are changelog/verification snapshots, not current how-to).
- **docs/PHASE_*.md** (e.g. PHASE_1C_COHERENCE_FIX_REPORT, PHASE_2D_CLEANUP_REPORT, PHASE_3A_P0_*_MIGRATION_REPORT, PHASE_6A_SAFE_MODE_AND_INCIDENTS_REPORT, etc.) — **Archive** same folder unless a specific phase doc is still the canonical “how we do X” (then keep one and archive the rest).
- **docs/phases/** — PHASE1_*, PHASE2_*, etc. **Archive** implementation completion reports; keep only if one file is the designated “current implementation plan” for an active initiative.

### Changelog-style “COMPLETE” / “VERIFICATION” / “SUMMARY”

- **docs/*_COMPLETE.md**, **docs/*_VERIFICATION_*.md**, **docs/*_SUMMARY.md** (e.g. CLEANUP_COMPLETE_SUMMARY, EMBEDDED_CHECKOUT_CLEANUP_SUMMARY, INTEGRATION_COMPLETE, PHASE2_EMAIL_OPTIMIZATION_COMPLETE, CTA_ROUTING_AUDIT_COMPLETE, etc.) — **Archive** to `docs/_ARCHIVE/phase4-complete-and-summaries/` unless the doc is the single ongoing reference for a live system (e.g. EMAIL_AUDIT_COMPLETE → keep one “email audit” reference if still used).
- **Root-level *_COMPLETE.md**, **DELETION_COMPLETE.md**, **NEW_ADMIN_COMPLETE.md**, **CLEANUP_COMPLETE_SUMMARY.md**, **BUILD_VERIFICATION_REPORT.md**, etc. — **Archive** (point-in-time completion reports).

---

## 4. AI-Generated Boilerplate That Adds No Value

**Archive** to `docs/_ARCHIVE/phase4-boilerplate/` (or one “phase4-low-value” folder).

### Duplicate or near-duplicate audits

- Multiple “FEED_PLANNER_*_AUDIT” or “FEED_PLANNER_*_PLAN” with overlapping content — Keep **one** per topic (e.g. one architecture, one implementation plan); archive the rest.
- Multiple “MAYA-PRO-MODE-*” audits / analyses — Keep one “Maya Pro mode” reference; archive the rest.
- Multiple “STRIPE_*” / “BILLING_*” fix summaries — Keep one Stripe verification/remediation reference; archive the rest.
- **docs/archive/** — Already in archive; leave as-is or move into phase4 archive for consistency.
- **docs/root-archive/** — Same.
- **docs/feed-planner/archive/** — Same.
- **docs/blueprint-funnel/archive/** — Same.

### Generic “analysis” or “audit” with no actionable outcome

- Docs that are purely “we ran an audit and here are findings” with no follow-up plan or link to current behavior — **Archive** (or merge key findings into one canonical doc and archive the rest).
- **docs/DOCUMENTATION_TRUTH_ALIGNMENT_REPORT.md** — Keep only if actively used to align docs; else archive.
- **docs/FULL_APP_CODE_AUDIT_DEPLOYMENT_READINESS_REPORT.md** — Point-in-time; archive unless it’s the single “readiness” checklist.

### Boilerplate templates

- Any doc that is mostly headings and “TBD” or generic bullets with no project-specific content — **Archive** or delete.

---

## 5. KEEP List (concise)

**Keep these (and only these) at top level or in clear “canonical” locations.**

### Root

- **README.md**
- **ARCHITECTURE.md** (if current)
- **docs/COMPLETE_USER_JOURNEY_MAP.md**
- **docs/E2E_CORE_FLOWS.md**
- **docs/PHASE2_SYSTEMATIC_AUDIT.md**
- **docs/PHASE4_DOCUMENTATION_CLEANUP.md**

### docs/_CANONICAL

- **CURSOR_CONSTITUTION.md**
- **PROMPT_AUTHORITY_POLICY.md**
- **SAFE_MODE_POLICY.md**
- **SYSTEM_REALITY.md** (or merge into COMPLETE_USER_JOURNEY_MAP)
- **ADMIN_SYSTEM.md**
- **EMAIL_SENDING_AUDIT.md**
- **STRIPE_LIVE_VERIFICATION_AND_FIX.md**, **STRIPE_CHARGES_FORENSIC_AUDIT.md** (one Stripe reference)
- **NANO_BANANA_PROMPT_AUDIT_2026.md**
- **FEED_PLANNER_*.md** (keep one set: audit + phase docs that are still “how we do it”)
- **PROMPT_PIPELINE_AUDIT_2026.md**, **PROMPT_SURFACE_MAP.md**
- **INTERNAL_API_CALLING.md** (if still accurate)
- **REALITY_BASELINE.md**
- **BETA_PROGRAM_CLOSURE_AUDIT.md**, **BETA_PRICING_LIFETIME_VERIFICATION.md** (if beta logic still relevant)

### docs/ (top-level, one per concern)

- **PRODUCT_FLOWS_CANONICAL.md**
- **high-ticket-offer-strategy.md**
- **waitlist-launch-announcements.md**
- **PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md** (or single “Paid Blueprint” doc)
- **ONBOARDING_EXPERIENCE_DESIGN_PLAN.md**
- **UNIFIED_WIZARD_IMPLEMENTATION_PLAN.md**
- **feed-planner/FEED_PLANNER_ARCHITECTURE_MASTER.md**
- **FEED-IMAGE-GENERATION-FLOW.md**, **FEED-WORKFLOW-ANALYSIS.md**
- **FEED_LAYOUT_ARCHITECTURE.md** (one copy)
- **PRO_PHOTOSHOOT_DOCUMENTATION.md**
- **maya/PROMPTING_FILES_COMPLETE_MAP.md**, **maya/IMPLEMENTATION_STATUS.md**
- **MAYA-PRO-MODE-STEP-BY-STEP-PROMPTS.md**
- **STRIPE_DATA_ANALYSIS.md**, **STRIPE_IMPLEMENTATION_REVIEW.md**
- **CREDIT-COST-AUDIT.md**, **MINI-PRODUCTS-SYSTEM-DIAGRAM.md**
- **ADMIN_FEATURES_AND_TOOLS.md** (update links)
- **PROJECT_TRACKER_SHARED_BRAIN.md**
- **HOW_BRAND_ENGINE_WORKS.md**, **BRAND_ENGINE_SETUP_FOR_SANDRA.md**, **BRAND_ENGINE_PRODUCTION_READY.md**
- **EMAIL_SYSTEM_STATUS.md**, **EMAIL-SYSTEM-EXPLAINED.md**
- **ALL_EMAIL_AUTOMATIONS_MASTER_LIST.md** (update to current cron)
- **schema.md** or **database/DATABASE_SCHEMA.md** (one)
- **api-routes.md** (after update: remove Alex, align with app/api)
- **HOW_TO_READ_E2E_LOGS.md**
- **feature-flags-and-cron.md**
- **CRON-HEALTH-DASHBOARD.md**
- **PRODUCTION-ENV-VARS-CHECK.md**

### docs/fixes, docs/implementation

- Keep only if a specific fix/implementation doc is the **current** reference for a live behavior (e.g. a critical fix that’s still the source of truth). Otherwise **archive** with other phase/PR reports.

---

## 6. ARCHIVE List (by category)

Move to `docs/_ARCHIVE/phase4-archive/` (or subfolders) rather than delete, so you can search history if needed.

### 6.1 Features never built or removed

- **docs/email-editing-flow.md**
- **docs/alex/** (entire folder)
- **docs/EMAIL-AGENT-IMPLEMENTATION-CHECKLIST.md** (if Alex-only)
- **docs/COMPOSITION-SYSTEM-REMOVAL-SUMMARY.md**
- Root: **GUMLOOP_*.md** (or all but one “Gumloop integration” note)
- **docs/MASTER_COMMAND_CENTER.md**, **LAUNCH-TODAY.md**, **BUILD_AGENT_1_NOW.md**, **SIMPLE_ACTION_PLAN.md**, **IMPLEMENTATION_ROADMAP.md** (if superseded)

### 6.2 Outdated API / changelog / PR / phase reports

- **docs/api-routes.md** — Only after creating an **updated** version (then archive old copy).
- **docs/PR-*.md** (all)
- **docs/PHASE_*_*.md** (completion/migration/fix reports)
- **docs/phases/** (implementation completion reports)
- **docs/*_COMPLETE.md**, **docs/*_VERIFICATION_*.md**, **docs/*_SUMMARY.md** (point-in-time)
- Root: **DELETION_COMPLETE.md**, **NEW_ADMIN_COMPLETE.md**, **CLEANUP_COMPLETE_SUMMARY.md**, **BUILD_VERIFICATION_REPORT.md**, **READY_TO_TEST.md**, **FINAL_ADMIN_STRUCTURE.md**, **DELETE_CHECKLIST.md**, **CLEANUP_COMPLETE_SUMMARY.md**, **STRATEGIC_CLEANUP_RECOMMENDATION.md**, **PARALLEL_EXECUTION_GUIDE.md**, **ADMIN_AUDIT_REPORT.md**, **CLEAN_ADMIN_ARCHITECTURE.md**, **INTEGRATION_SETUP_GUIDE.md**, **FLOW_BUILD_CHECKLIST.md**, **BUILD_AGENT_1_NOW.md**, **IMPLEMENTATION-NEXT-STEPS.md**, **DELETE_OLD_AGENT_CODE.md**, etc.

### 6.3 Already-archived (no move needed, or move into phase4-archive for consistency)

- **docs/archive/** (89+ files)
- **docs/_ARCHIVE/** (implementation-reports, cursor-rules, strategic-docs)
- **docs/root-archive/** (14 files)
- **docs/feed-planner/archive/**
- **docs/blueprint-funnel/archive/**

### 6.4 Duplicate audits / low-value boilerplate

- Extra **FEED_PLANNER_*_AUDIT** / **FEED_PLANNER_*_PLAN** beyond the one kept per topic.
- Extra **MAYA-PRO-MODE-*** audits beyond the one kept.
- Extra **STRIPE_*** fix summaries beyond the one kept.
- **docs/DOCUMENTATION_TRUTH_ALIGNMENT_REPORT.md**
- **docs/FULL_APP_CODE_AUDIT_DEPLOYMENT_READINESS_REPORT.md**
- **docs/audits/** — Keep only audits that are still the canonical “how we built X” or “current status of Y”; archive the rest to **docs/_ARCHIVE/phase4-archive/audits/**.
- **docs/fixes/** — Same: keep only current reference fixes; archive the rest.
- **docs/implementation/** — Same: keep only current reference; archive the rest.

---

## 7. Recommended Next Steps

1. **Create archive folder:** `docs/_ARCHIVE/phase4-archive/` with subfolders e.g. `never-built-or-removed/`, `pr-and-phase-reports/`, `complete-and-summaries/`, `boilerplate-and-duplicates/`.
2. **Update and keep:**  
   - **docs/api-routes.md** — Remove Alex routes; align with app/api; add “Last verified” date.  
   - **docs/ADMIN_FEATURES_AND_TOOLS.md** — Fix diagnostics links (or add missing admin diagnostics pages per Phase 2).  
   - **docs/ALL_EMAIL_AUTOMATIONS_MASTER_LIST.md** — Align with app/api/cron and current Resend/Flodesk.
3. **Move (don’t delete):** All “Archive” list items into `docs/_ARCHIVE/phase4-archive/` (and subfolders). Use a script or manual move so git history is clear.
4. **Trim _CANONICAL:** Keep only the canonical files listed in §5; move the rest to phase4-archive (e.g. old phase completion logs, duplicate Stripe reports).
5. **Single “current” doc per area:** For Feed Planner, Maya Pro, Stripe, Email, Admin, keep **one** “architecture” or “status” doc per area and archive the rest.
6. **Re-run scan:** After moves, run `find . -name "*.md" -not -path "./.backups/*" -not -path "./node_modules/*" | wc -l` and update this doc with new count and any changes to keep/archive lists.

---

**Summary:** ~350K lines across 1,062 .md files. Most are point-in-time audits, PR/phase reports, or docs for removed features (Alex, Composition) or outdated API. **Keep** ~50–80 canonical docs (journey, E2E, constitution, one-per-area architecture/status, schema, api-routes after update). **Archive** the rest under `docs/_ARCHIVE/phase4-archive/` for searchability without clutter.
