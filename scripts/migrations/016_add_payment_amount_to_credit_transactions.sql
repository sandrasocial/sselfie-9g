-- Migration 016: Add payment_amount_cents to credit_transactions
-- This allows us to calculate revenue from database without querying Stripe API

-- Add payment_amount_cents column (stores actual payment amount in cents)
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER;

-- Add index for revenue queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_amount 
ON credit_transactions(payment_amount_cents) 
WHERE payment_amount_cents IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN credit_transactions.payment_amount_cents IS 
'Actual payment amount in cents (from Stripe). NULL for non-purchase transactions. Used for revenue calculations.';

