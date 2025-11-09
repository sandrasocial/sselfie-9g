-- IMPORTANT: Run this script before launch to clean all test data
-- This script will:
-- 1. Add is_test_mode tracking columns
-- 2. Mark all existing data as test mode
-- 3. Delete all test transactions and subscriptions
-- 4. Reset revenue to $0 for production launch

-- Step 1: Add is_test_mode column to credit_transactions
ALTER TABLE credit_transactions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_test_mode ON credit_transactions(is_test_mode);

-- Step 2: Mark ALL existing credit transactions as test mode
-- This assumes everything before launch is test data
UPDATE credit_transactions
SET is_test_mode = TRUE
WHERE is_test_mode IS NULL OR is_test_mode = FALSE;

-- Step 3: Add is_test_mode to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_test_mode ON subscriptions(is_test_mode);

-- Step 4: Mark ALL existing subscriptions as test mode
UPDATE subscriptions
SET is_test_mode = TRUE
WHERE is_test_mode IS NULL OR is_test_mode = FALSE;

-- Step 5: DELETE all test transactions (optional - comment out if you want to keep for reference)
-- DELETE FROM credit_transactions WHERE is_test_mode = TRUE;
-- DELETE FROM subscriptions WHERE is_test_mode = TRUE;

-- Step 6: Verification queries
SELECT 
  'Credit Transactions' as table_name,
  COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_count,
  COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_count,
  COUNT(*) as total_count
FROM credit_transactions;

SELECT 
  'Subscriptions' as table_name,
  COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_count,
  COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_count,
  COUNT(*) as total_count
FROM subscriptions;

-- After running this script, all new transactions from Stripe webhooks will automatically
-- track test mode correctly, and your admin dashboard will show $0 revenue.
