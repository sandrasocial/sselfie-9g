CREATE TABLE IF NOT EXISTS stripe_payment_adjustments (
  id BIGSERIAL PRIMARY KEY,
  livemode BOOLEAN NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('refund', 'dispute')),
  stripe_adjustment_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,
  local_payment_id BIGINT,
  product_type TEXT,
  object_status TEXT NOT NULL,
  review_state TEXT NOT NULL CHECK (review_state IN ('matched', 'unmatched', 'ambiguous')),
  review_reason TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL,
  charge_fully_refunded BOOLEAN,
  reason_code TEXT,
  source_event_id TEXT NOT NULL,
  source_event_type TEXT NOT NULL,
  snapshot_observed_at TIMESTAMPTZ NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (livemode, adjustment_type, stripe_adjustment_id)
);

CREATE TABLE IF NOT EXISTS stripe_payment_adjustment_movements (
  id BIGSERIAL PRIMARY KEY,
  livemode BOOLEAN NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('refund', 'dispute')),
  stripe_adjustment_id TEXT NOT NULL,
  stripe_balance_transaction_id TEXT NOT NULL,
  source_role TEXT NOT NULL CHECK (source_role IN ('refund', 'refund_failure', 'dispute')),
  balance_transaction_type TEXT NOT NULL,
  reporting_category TEXT NOT NULL,
  balance_status TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL,
  net_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (livemode, stripe_balance_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_adjustments_review
  ON stripe_payment_adjustments (livemode, review_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_adjustment_movements_currency
  ON stripe_payment_adjustment_movements (livemode, currency, occurred_at DESC);
