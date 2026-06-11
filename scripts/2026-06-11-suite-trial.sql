-- BRIDGE-01 Phase D — SUITE 7-day trial (applied to Neon 2026-06-11).
-- Trial = a subscriptions row with product_type='suite_trial' so it NEVER counts as a
-- member (member counts filter on membership product types; see Admin Data Contract).
-- trial_ends_at is only used by suite_trial rows.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_product_status
  ON subscriptions (product_type, status);

-- Trial credit lifecycle needs two new transaction types.
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'purchase'::text,
    'subscription_grant'::text,
    'training'::text,
    'image'::text,
    'animation'::text,
    'refund'::text,
    'bonus'::text,
    'trial_grant'::text,
    'trial_expiry'::text
  ]));
