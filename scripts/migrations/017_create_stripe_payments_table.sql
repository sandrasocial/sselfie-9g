-- Migration 017: Create comprehensive stripe_payments table
-- Stores ALL revenue data from Stripe (subscriptions, one-time, credits, etc.)

CREATE TABLE IF NOT EXISTS stripe_payments (
  id SERIAL PRIMARY KEY,
  stripe_payment_id TEXT UNIQUE NOT NULL, -- payment_intent_id, charge_id, or invoice_id
  stripe_invoice_id TEXT, -- For subscription payments
  stripe_subscription_id TEXT, -- For subscription payments
  stripe_customer_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Payment Details
  amount_cents INTEGER NOT NULL, -- Payment amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- succeeded, pending, failed, refunded
  payment_type TEXT NOT NULL, -- subscription, one_time_session, credit_topup, refund
  product_type TEXT, -- sselfie_studio_membership, one_time_session, credit_topup
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  payment_date TIMESTAMPTZ NOT NULL, -- When payment was made
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Test Mode
  is_test_mode BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  CONSTRAINT stripe_payments_payment_id_unique UNIQUE (stripe_payment_id)
);

-- Indexes for fast revenue queries
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user_id ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_type ON stripe_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_product_type ON stripe_payments(product_type);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_date ON stripe_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_test_mode ON stripe_payments(is_test_mode);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_subscription_id ON stripe_payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_invoice_id ON stripe_payments(stripe_invoice_id);

-- Composite index for revenue queries
CREATE INDEX IF NOT EXISTS idx_stripe_payments_revenue_query 
ON stripe_payments(status, payment_type, is_test_mode, payment_date) 
WHERE status = 'succeeded' AND is_test_mode = FALSE;

COMMENT ON TABLE stripe_payments IS 'Comprehensive table storing ALL Stripe payments (subscriptions, one-time, credits). Updated automatically by webhooks.';
COMMENT ON COLUMN stripe_payments.amount_cents IS 'Payment amount in cents. Use this for all revenue calculations.';
COMMENT ON COLUMN stripe_payments.payment_type IS 'Type of payment: subscription, one_time_session, credit_topup, refund';
COMMENT ON COLUMN stripe_payments.status IS 'Payment status from Stripe: succeeded, pending, failed, refunded';

