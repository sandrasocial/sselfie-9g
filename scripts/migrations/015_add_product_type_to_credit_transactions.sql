-- Add product_type column to distinguish purchase types
-- This allows us to differentiate between one-time sessions and credit top-ups

ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_product_type
ON credit_transactions(product_type);

-- Update existing records (best effort - based on description)
UPDATE credit_transactions
SET product_type = 'one_time_session'
WHERE transaction_type = 'purchase'
AND product_type IS NULL
AND (
  description LIKE '%One-Time%'
  OR description LIKE '%one-time%'
  OR description LIKE '%Session%'
  OR description LIKE '%session%'
);

UPDATE credit_transactions
SET product_type = 'credit_topup'
WHERE transaction_type = 'purchase'
AND product_type IS NULL
AND (
  description LIKE '%top-up%'
  OR description LIKE '%Top-Up%'
  OR description LIKE '%topup%'
  OR description LIKE '%Credit top-up%'
);

-- Verify
SELECT
  product_type,
  COUNT(*) as count
FROM credit_transactions
WHERE transaction_type = 'purchase'
GROUP BY product_type;

