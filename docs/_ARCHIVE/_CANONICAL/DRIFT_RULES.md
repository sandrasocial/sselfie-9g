# DRIFT RULES (Phase AO-1)

Last updated: 2026-01-16
Scope: Define drift categories and detection rules for live operations.

## Core Drift (must stop or roll back)
Changes that risk blocking users, payments, or entitlements:
- Any change that alters paid access or entitlements (membership, paid blueprint, credits).
- Any change that alters Stripe webhook handling or payment mapping.
- Any change that prevents free users from generating Brand Pillars or Preview Feed.
- Any change that breaks credit deduction or grants (duplicate free credits, missing deductions).
- Any change that blocks Studio membership features (training, generation, feed planner).
- Any change that prevents admin observability (cron health, webhook health, email control).

## Edge Drift (track but does not block)
Changes that affect UX but not access, credits, or payments:
- UI copy, layout, and spacing changes.
- Non-critical visual presentation or admin-only UI tweaks.
- Prompt text or AI system prompt refinements (non-access changes).

## Drift Detection (how to verify)
Use existing admin surfaces and lightweight checks first.

### Admin and API checks (preferred)
- `/admin` dashboard: user counts, MRR, revenue trends.
- `/admin/health`: E2E health status for auth, credits, generation config, cron sanity.
- `/admin/cron-health`: cron job success rates and recent failures.
- `/admin/webhook-diagnostics`: Stripe webhook endpoint reachability.
- `/admin/email-control`: email sending status and test mode.

### Database checks (requires DB access)
Run these only with DB access; results are required for entitlement correctness.
- Subscriptions by product type:
  - `SELECT product_type, status, COUNT(*) FROM subscriptions GROUP BY product_type, status;`
- Credit balances (sanity):
  - `SELECT MIN(balance), MAX(balance), AVG(balance) FROM user_credits;`
- Paid blueprint entitlement state:
  - `SELECT COUNT(*) FILTER (WHERE paid_blueprint_purchased = TRUE) AS paid_count, COUNT(*) AS total FROM blueprint_subscribers;`
- Free blueprint usage:
  - `SELECT COUNT(*) FILTER (WHERE free_grid_used_count > 0) AS used_count FROM blueprint_subscribers;`
- Email control flags:
  - `SELECT key, value FROM admin_feature_flags WHERE key IN ('email_sending_enabled','email_test_mode','pro_photoshoot_admin_only');`
- Migration tracking:
  - `SELECT * FROM schema_migrations ORDER BY applied_at DESC;`

### Automated tests (if configured)
- `npm run lint` (warnings-only mode is acceptable per Phase AO).
- `npm test` (Vitest; Playwright requires `npm run e2e`).
- `npm run build` to ensure deploy safety.

## Auto-Run Schema/Migrations (when allowed)
Allowed ONLY if all are true:
- Migration is idempotent (`IF NOT EXISTS` / safe checks).
- Migration does NOT touch entitlements/credits/payments tables.
- Migration is scoped to admin tooling, non-user-facing telemetry, or minor indexes.
- Migration records itself in `schema_migrations` when applicable.

## STOP Conditions (must request approval)
Stop and request human approval before proceeding if:
- Editing any critical files (`app/api/webhooks/stripe/route.ts`, `lib/credits.ts`, `lib/stripe.ts`, `lib/user-mapping.ts`, `lib/subscription.ts`, `middleware.ts`, `lib/db.ts`, `lib/auth-helper.ts`, `vercel.json`, `next.config.mjs`).
- Any schema change impacts entitlements, credits, payments, or user identity.
- A change could block paid users or disrupt free blueprint flows.
- A claim cannot be verified from code/config (require DB or prod checks).

## Drift Response (minimal, safe)
1. Identify the drift category (core vs edge).
2. Use existing admin health surfaces to confirm impact.
3. If core drift is confirmed, pause changes and request approval.
4. If edge drift, fix with minimal, reversible changes and update docs.
