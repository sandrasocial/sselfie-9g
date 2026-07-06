-- Tracked DDL for webhook_events_needs_review. The table already exists in production
-- (created out-of-band); this file records its real schema so the repo has a committed
-- source of truth. Column names verified against Neon information_schema 2026-07-06.
-- Consumers: lib/payments/lifecycle/checkout-session-completed.ts (flagForReview),
-- app/api/cron/resolve-pending-payments, app/api/admin/webhook-review,
-- lib/admin/home-report.ts (needsMe.webhookReviews).
CREATE TABLE IF NOT EXISTS webhook_events_needs_review (
  id SERIAL PRIMARY KEY,
  stripe_event_id TEXT,
  customer_email TEXT,
  product_type TEXT,
  amount_cents INTEGER,
  flag_reason TEXT,
  raw_metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
