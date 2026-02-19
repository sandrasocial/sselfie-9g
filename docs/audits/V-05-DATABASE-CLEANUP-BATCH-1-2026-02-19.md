# V-05 Database Cleanup — Batch 1 (2026-02-19)

## State Summary Template
- Context: V-05 orphaned table cleanup with safety-first constraints.
- Last actions: verified production row counts, grep-checked code references, prepared one migration batch.
- Files touched: `migrations/20260219_drop_orphaned_tables_batch_1.sql`.
- Outstanding issues: most candidate tables still have active code references and are skipped.
- Next steps: remove code references first, then create additional drop batches.

## Safety checks executed
1. Verified each candidate table has `0` rows in production.
2. Searched active code paths for table-name references:
   - `app/**`
   - `lib/**`
   - `components/**`
   - `scripts/**`
   - `tests/**`
3. Only tables with zero rows AND zero references were included.

## Tables dropped in Batch 1
- `apa_activity_log`
- `apa_log`
- `behavior_loop_log`
- `blueprint_signals`

Migration: `migrations/20260219_drop_orphaned_tables_batch_1.sql`

## Skipped tables (reason)
All skipped tables had one or more active code references in app/lib/components/scripts/tests:

- `abandoned_checkouts` (8 refs)
- `academy_certificates` (4 refs)
- `academy_exercise_submissions` (3 refs)
- `academy_exercises` (4 refs)
- `academy_monthly_drops` (10 refs)
- `admin_agent_feedback` (9 refs)
- `admin_automation_rules` (4 refs)
- `admin_business_insights` (20 refs)
- `admin_competitor_analyses_ai` (3 refs)
- `admin_content_performance` (18 refs)
- `admin_email_templates_ai` (2 refs)
- `admin_memory` (18 refs)
- `brand_engine_competitors` (6 refs)
- `brand_engine_daily_plans` (4 refs)
- `brand_engine_experiments` (7 refs)
- `brand_engine_insights` (6 refs)
- `brand_engine_performance` (9 refs)
- `brand_engine_runs` (11 refs)
- `brand_engine_signals` (9 refs)
- `brand_engine_weekly_briefs` (6 refs)
- `brand_evolution` (12 refs)
- `brand_onboarding` (10 refs)
- `carousel_posts` (15 refs)
- `cohort_delivery_load_logs` (7 refs)
- `competitor_content_analysis` (19 refs)
- `competitor_snapshots` (10 refs)

## Verification notes
- This batch is intentionally small to minimize risk.
- No active/user/payment/subscription tables were included.
- Next batches should only include tables after references are removed or confirmed dead.
