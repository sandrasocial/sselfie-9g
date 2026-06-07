-- Add durable revenue attribution columns to stripe_payments.
-- These columns let guest-checkout payments be joined back to checkout sessions,
-- email recovery, buyer suppression, and upgrade-credit eligibility.

ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS checkout_source TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS cta_keyword TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS entry_post_slug TEXT;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS buyer_stage TEXT;

CREATE INDEX IF NOT EXISTS stripe_payments_customer_email_idx
  ON stripe_payments (LOWER(customer_email), payment_date DESC);

CREATE INDEX IF NOT EXISTS stripe_payments_checkout_session_idx
  ON stripe_payments (checkout_session_id);
