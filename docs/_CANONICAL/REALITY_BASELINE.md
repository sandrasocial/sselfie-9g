# REALITY BASELINE (Phase AO-1)

Last updated: 2026-01-16
Scope: Code + config only. No database reads performed.

## Evidence Sources (primary)
- `lib/products.ts`
- `lib/subscription.ts`
- `lib/feed-planner/access-control.ts`
- `lib/admin-feature-flags.ts`
- `lib/email/email-control.ts`
- `scripts/00-create-all-tables.sql`
- `scripts/22-create-credit-system.sql`
- `scripts/create-blueprint-subscribers-table.sql`
- `scripts/migrations/add-user-id-to-blueprint-subscribers.sql`
- `scripts/migrations/add-blueprint-usage-tracking.sql`
- `scripts/migrations/add-paid-blueprint-tracking.sql`
- `scripts/migrations/add-paid-blueprint-email-columns.sql`
- `scripts/admin-migrations/20250106_create_admin_feature_flags.sql`
- `scripts/admin-migrations/20250106_create_admin_cron_runs.sql`
- `scripts/admin-migrations/20250106_create_admin_email_errors.sql`
- `vercel.json`
- `app/api/admin/dashboard/stats/route.ts`
- `app/api/admin/dashboard/webhook-health/route.ts`
- `app/api/admin/dashboard/email-metrics/route.ts`
- `app/api/admin/cron-health/route.ts`
- `app/api/admin/diagnostics/cron-status/route.ts`
- `app/api/admin/health/e2e/route.ts`

## Active Products & Entitlements (code-defined)
### Products (pricing config)
- `one_time_session` ("Starter Photoshoot"): $49, 50 credits (one-time).
- `sselfie_studio_membership` ("Creator Studio"): $97/month, 200 credits/month.
- `paid_blueprint` ("Brand Blueprint - Paid"): $47, 60 credits.
- Credit top-ups: 10 / 100 / 200 credit packages.
Source: `lib/products.ts`.

### Entitlement rules (runtime logic)
- **Free blueprint access**: implicit for all authenticated users.  
  Source: `hasFreeBlueprintAccess` in `lib/subscription.ts`.
- **Paid blueprint access**:
  - Primary: `blueprint_subscribers.paid_blueprint_purchased = true`.
  - Fallback: `subscriptions.product_type = 'paid_blueprint'` (legacy).
  - Admins auto-granted.  
  Source: `hasPaidBlueprint` in `lib/subscription.ts`.
- **Studio membership access**:
  - `hasStudioMembership` accepts `sselfie_studio_membership`, `brand_studio_membership`, `pro` with active status.  
  Source: `lib/subscription.ts`.
- **Full access**:
  - `hasFullAccess` accepts membership or `one_time_session` with active status.  
  Source: `lib/subscription.ts`.
- **One-time session**:
  - Deprecated for subscriptions: `hasOneTimeSession` returns false.  
  - Still included in `hasFullAccess` list and in pricing config.  
  Source: `lib/subscription.ts`, `lib/products.ts`.

## Feature Access Matrix (what tiers actually do)
Source of truth for Feed Planner access is `lib/feed-planner/access-control.ts`.

### Feed Planner / Gallery access
- **Free**:
  - Placeholder: single 9:16.
  - Generation buttons: disabled.
  - Gallery access: no.
  - Feed planner limit: unlimited (no paid cap, but generation disabled).
- **Paid blueprint**:
  - Placeholder: 3x3 grid.
  - Generation buttons: enabled.
  - Gallery access: yes.
  - Feed planner limit: 3 planners max.
- **Membership**:
  - Placeholder: 3x3 grid.
  - Generation buttons: enabled.
  - Gallery access: yes.
  - Feed planner limit: unlimited.
- **One-time session**:
  - Deprecated; treated as free for access control (isOneTime = false).

### Academy access
- Academy API requires `hasStudioMembership`, and expects product type `sselfie_studio_membership`.
- Paid blueprint does NOT grant Academy access.  
Source: `app/api/academy/courses/route.ts`, `lib/subscription.ts`.

### Other app areas (Maya, generation, training)
- The repo does not define an explicit tier matrix outside Feed Planner and Academy.
- Most generation endpoints are credit-gated and/or feature-flagged (see Feature Flags).  
Source: `lib/credits.ts`, `docs/_CANONICAL/EXECUTION_STATUS.md` (Phase Y/AA/AB notes).

## Active Feature Flags (code-defined)
### Admin feature flags (DB-backed)
- `admin_feature_flags`:
  - `email_sending_enabled` (global email kill switch).
  - `email_test_mode` (test-only sending).
  - `pro_photoshoot_admin_only` (checked by `isProPhotoshootEnabled`).
Source: `scripts/admin-migrations/20250106_create_admin_feature_flags.sql`, `lib/email/email-control.ts`, `lib/admin-feature-flags.ts`.

### Environment flags (request gating)
- `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY`:
  - Overrides pro photoshoot admin flag when set.  
  Source: `lib/admin-feature-flags.ts`.
- `ENABLE_TRAINING_AI`:
  - When false, training endpoint returns 410 unless `hasFullAccess`.  
  Source: `app/api/training/start-training/route.ts`.
- `ENABLE_STRATEGIST_AI`:
  - When false, strategist endpoints return 410 unless `hasFullAccess`.  
  Source: `app/api/personal-brand-strategist/strategy/route.ts`.
- `ENABLE_BLUEPRINT_GUEST`:
  - When false, guest blueprint concept generation is disabled (410).  
  Source: `app/api/blueprint/generate-concepts/route.ts`.
- `ENABLE_BLUEPRINT_PAID`:
  - When false, paid blueprint generation is disabled unless purchased or admin (410).  
  Source: `app/api/blueprint/generate-paid/route.ts`.
- `ENABLE_BLUEPRINT_CONCEPT_IMAGE`:
  - When false, blueprint concept image generation is disabled (410).  
  Source: `app/api/blueprint/generate-concept-image/route.ts`.
- `ENABLE_UNUSED_ENDPOINTS`:
  - Gates unused/legacy endpoints (Stripe, credits, quota, studio generate).  
  Source: `docs/_CANONICAL/EXECUTION_STATUS.md` (Phase C, Phase AD), `app/api/*` gated routes.

## Schema State (entitlements/credits/onboarding)
### Core user identity & onboarding
- `users` table (text id, email, stripe_customer_id, plan, role, onboarding_completed, timestamps).  
  Source: `scripts/00-create-all-tables.sql`.
- `user_profiles` table (profile fields, per-user).  
  Source: `scripts/00-create-all-tables.sql`.

### Subscriptions & payments
- `subscriptions` table exists with `plan_name`, `status`, `stripe_subscription_id`, etc.  
  Source: `scripts/00-create-all-tables.sql`.
- Code expects `subscriptions.product_type` and `status` for access checks.  
  Source: `lib/subscription.ts`.  
  Note: A migration script (`scripts/migrate-to-new-pricing.ts`) adds `product_type` if missing. Actual DB state is unverified.

### Credits
- `user_credits` table: `balance`, `total_purchased`, `total_used`.  
  Source: `scripts/22-create-credit-system.sql`.
- `credit_transactions` table: `amount`, `transaction_type`, `stripe_payment_id`, `balance_after`.  
  Source: `scripts/22-create-credit-system.sql`.
- `credit_transactions.product_type` appears in migration `015_add_product_type_to_credit_transactions.sql`.  
  Source: `scripts/migrations/015_add_product_type_to_credit_transactions.sql`.
- `subscription_credit_grants` exists but marked legacy in schema file.  
  Source: `scripts/22-create-credit-system.sql`.

### Blueprint entitlements (free + paid)
- `blueprint_subscribers` base table contains access token, form data, and lifecycle fields.  
  Source: `scripts/create-blueprint-subscribers-table.sql`.
- Entitlement tracking columns:
  - `user_id` (link to `users`)  
    Source: `scripts/migrations/add-user-id-to-blueprint-subscribers.sql`.
  - `free_grid_used_at`, `free_grid_used_count`, `paid_grids_generated`  
    Source: `scripts/migrations/add-blueprint-usage-tracking.sql`.
  - `paid_blueprint_purchased`, `paid_blueprint_purchased_at`, `paid_blueprint_stripe_payment_id`, `paid_blueprint_photo_urls`, `paid_blueprint_generated`, `paid_blueprint_generated_at`  
    Source: `scripts/migrations/add-paid-blueprint-tracking.sql`.
  - Paid blueprint email followups: `day_1_paid_email_sent`, `day_3_paid_email_sent`, `day_7_paid_email_sent` (+ timestamps).  
    Source: `scripts/migrations/add-paid-blueprint-email-columns.sql`.

### Admin observability tables
- `admin_feature_flags`, `admin_cron_runs`, `admin_email_errors` are defined in admin migrations.  
  Source: `scripts/admin-migrations/20250106_create_admin_feature_flags.sql`, `scripts/admin-migrations/20250106_create_admin_cron_runs.sql`, `scripts/admin-migrations/20250106_create_admin_email_errors.sql`.
- Cron health endpoints query views/tables: `cron_job_health_dashboard`, `cron_job_recent_failures`, `cron_job_summary`, `cron_job_logs`.  
  Definitions are not found in repo; DB verification required.  
  Source: `app/api/admin/cron-health/route.ts`.

## Migration Status (applied vs pending)
**Cannot be verified without DB access.** The repo includes:
- `schema_migrations` table usage in blueprint migrations (tracks applied migrations).
- Admin migrations for cron/email/error tracking tables.
- Pricing migration scripts that adjust `subscriptions.product_type`.
Repo note: `scripts/README.md` claims schema is current; treat as informational only until DB verified.

## Cron Jobs (configured)
Source: `vercel.json`.

- `/api/cron/sync-audience-segments` — daily 02:00
- `/api/cron/refresh-segments` — daily 03:00
- `/api/cron/send-blueprint-followups` — daily 10:00
- `/api/cron/nurture-sequence` — daily 11:00
- `/api/cron/reactivation-campaigns` — daily 11:00
- `/api/cron/blueprint-discovery-funnel` — daily 12:00
- `/api/cron/reengagement-campaigns` — daily 12:00
- `/api/cron/send-scheduled-campaigns` — every 15 min
- `/api/cron/welcome-sequence` — daily 10:00
- `/api/cron/referral-rewards` — daily 13:00
- `/api/cron/milestone-bonuses` — daily 14:00
- `/api/cron/upsell-campaigns` — daily 10:00
- `/api/cron/admin-alerts` — daily 07:00
- `/api/health/e2e` — daily 06:00
- `/api/cron/reindex-codebase` — weekly Sunday 03:00
- `/api/cron/resolve-pending-payments` — every 5 min

## Admin Health Surfaces (what they reflect)
### Admin dashboard (`/admin`)
- Uses:
  - `/api/admin/dashboard/stats` for user counts, subscription counts, MRR, revenue.
  - `/api/admin/dashboard/webhook-health` for webhook error stats.
  - `/api/admin/dashboard/email-metrics` for email delivery stats.
  - `/api/admin/cron-health` for cron job health summaries.
  - `/api/admin/diagnostics/cron-status` for per-job last run + errors.
Source: `components/admin/admin-dashboard.tsx`, API routes above.

### System health (`/admin/health`)
- Uses `/api/admin/health/e2e` to run internal checks (auth, credits, generation config, cron sanity).  
Source: `app/admin/health/page.tsx`, `app/api/admin/health/e2e/route.ts`.

### Cron health (`/admin/cron-health`)
- Uses `/api/admin/cron-health` for job health, failures, performance history.  
Source: `app/admin/cron-health/page.tsx`, `app/api/admin/cron-health/route.ts`.

### Webhook diagnostics (`/admin/webhook-diagnostics`)
- Manual Stripe webhook troubleshooting UI (test endpoint, setup steps).  
Source: `app/admin/webhook-diagnostics/page.tsx`.
