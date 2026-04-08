# TASK V-05 — Database Cleanup (Orphaned Tables)
Priority: Low · Do after V-02 and V-03 are complete
Estimated time: 2-3 hours across multiple small PRs
Context: Audit found 153 orphaned tables out of 284 total.
This is dead weight increasing maintenance risk and confusion.

## Problem
54% of the database is orphaned — zero rows, no active code references.
This makes the codebase harder to understand and maintain.
Every new developer or AI agent reading the schema gets confused by ghost tables.

## Goal
Safely remove orphaned tables with zero rows and no code references.
Reduce database to only what is actually used.

## Rules — READ CAREFULLY

### Safety first
- NEVER drop a table that has rows (even 1 row = keep it)
- NEVER drop a table without checking ALL code references first
- ALWAYS create a migration file (never raw SQL drops in production)
- ALWAYS do this in small batches of 10-15 tables maximum per PR
- ALWAYS test locally before deploying

### Process for each table
1. Confirm rows = 0
2. Search entire codebase for table name (grep -r "table_name" .)
3. If zero code references found → safe to drop
4. If any code reference found → mark as REVIEW NEEDED, skip for now
5. Add to migration file with comment explaining why it was dropped

### Start with these confirmed zero-row orphaned tables
(From audit — all have 0 rows and are flagged ORPHANED)
- abandoned_checkouts
- academy_certificates
- academy_exercise_submissions
- academy_exercises
- academy_monthly_drops
- admin_agent_feedback
- admin_automation_rules
- admin_business_insights
- admin_competitor_analyses_ai
- admin_content_performance
- admin_email_templates_ai
- admin_memory
- apa_activity_log
- apa_log
- behavior_loop_log
- blueprint_signals
- brand_engine_competitors
- brand_engine_daily_plans
- brand_engine_experiments
- brand_engine_insights
- brand_engine_performance
- brand_engine_runs
- brand_engine_signals
- brand_engine_weekly_briefs
- brand_evolution
- brand_onboarding
- carousel_posts
- cohort_delivery_load_logs
- competitor_content_analysis
- competitor_snapshots

## Deliverable
- One migration file per batch
- Migration naming: `YYYYMMDD_drop_orphaned_tables_batch_N.sql`
- Summary report after each batch: tables dropped, tables skipped and why

## Do NOT touch
- Any table with rows > 0
- Any table in the ACTIVE list from the audit
- Any table referenced in currently used API routes
- Payment, subscription, or user tables of any kind
- brand_engine_applications (has active pipeline code)

## Acceptance criteria
- [ ] Each batch done as separate PR
- [ ] No active tables accidentally dropped
- [ ] Migration files created for all drops
- [ ] Codebase grep check documented for each table
- [ ] Summary report delivered after each batch
- [ ] Database still fully functional after each batch
