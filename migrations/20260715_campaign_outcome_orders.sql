-- CAMPAIGN-OUTCOME-01: paid, guest-safe campaign orders.
-- One row is one $97 outcome. Access is by a high-entropy token; no account is required.

CREATE TABLE IF NOT EXISTS campaign_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  access_token TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  source_order_id BIGINT REFERENCES campaign_orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_intake'
    CHECK (status IN (
      'awaiting_intake',
      'inputs_ready',
      'generating',
      'needs_qa',
      'delivered',
      'generation_failed',
      'refunded'
    )),
  selfie_url TEXT,
  what_she_sells TEXT,
  promotion TEXT,
  platform TEXT,
  campaign_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_attempts INTEGER NOT NULL DEFAULT 0,
  generation_error TEXT,
  admin_notes TEXT,
  is_test_mode BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  intake_email_sent_at TIMESTAMPTZ,
  inputs_completed_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  qa_approved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_email_sent_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  published_answer BOOLEAN,
  published_confirmed_at TIMESTAMPTZ,
  day7_email_sent_at TIMESTAMPTZ,
  repeat_purchased_at TIMESTAMPTZ,
  repeat_attribution_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_orders_status_created
  ON campaign_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_orders_delivery_day7
  ON campaign_orders(delivered_at, day7_email_sent_at)
  WHERE status = 'delivered';

CREATE INDEX IF NOT EXISTS idx_campaign_orders_customer
  ON campaign_orders(LOWER(customer_email), created_at DESC);
