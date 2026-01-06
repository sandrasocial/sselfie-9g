-- Credit System for Usage-Based Billing

-- User credit balances
CREATE TABLE IF NOT EXISTS user_credits (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0, -- Current credit balance
  total_purchased INTEGER DEFAULT 0, -- Lifetime credits purchased
  total_used INTEGER DEFAULT 0, -- Lifetime credits used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions (purchases and usage)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id CHARACTER VARYING REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for purchases, negative for usage
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'subscription_grant', 'training', 'image', 'animation', 'refund', 'bonus')),
  description TEXT, -- e.g., "Training: Model XYZ", "Monthly subscription grant"
  reference_id TEXT, -- Link to related entity (training_id, image_id, etc.)
  stripe_payment_id TEXT, -- For purchases
  balance_after INTEGER NOT NULL, -- Balance after this transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription tier credit allocations
-- NOTE: This table defines a 3-tier system (starter, pro, elite) that is LEGACY and no longer used.
-- Current system uses: sselfie_studio_membership (200 credits/month) and one_time_session (50 credits one-time)
-- This table may be kept for historical data or removed if confirmed unused
CREATE TABLE IF NOT EXISTS subscription_credit_grants (
  id SERIAL PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')),
  monthly_credits INTEGER NOT NULL, -- Credits granted per month
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credit allocations (LEGACY - 3-tier system no longer in use)
INSERT INTO subscription_credit_grants (tier, monthly_credits) VALUES
  ('starter', 100),
  ('pro', 250),
  ('elite', 600)
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
