-- Step 1: Add is_test_mode column to credit_transactions
ALTER TABLE credit_transactions 
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_test_mode ON credit_transactions(is_test_mode);

-- Step 3: Mark all existing transactions with stripe_payment_id starting with 'pi_test_' as test mode
-- Stripe test payment IDs always start with these prefixes:
-- pi_test_ for payment intents
-- ch_test_ for charges
-- py_test_ for payouts
UPDATE credit_transactions 
SET is_test_mode = TRUE 
WHERE stripe_payment_id IS NOT NULL 
AND (
  stripe_payment_id LIKE 'pi_test_%' 
  OR stripe_payment_id LIKE 'ch_test_%'
  OR stripe_payment_id LIKE 'py_test_%'
);

-- Step 4: Delete all test mode transactions (CAREFUL - this removes all test data)
DELETE FROM credit_transactions 
WHERE is_test_mode = TRUE;

-- Step 5: Also add is_test_mode to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE;

-- Step 6: Mark test subscriptions (Stripe test subscription IDs start with 'sub_test_')
UPDATE subscriptions 
SET is_test_mode = TRUE 
WHERE stripe_subscription_id LIKE 'sub_test_%';

-- Step 7: Delete test subscriptions
DELETE FROM subscriptions 
WHERE is_test_mode = TRUE;

-- Step 8: Verify clean data
SELECT 
  'credit_transactions' as table_name,
  COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_transactions,
  COUNT(*) FILTER (WHERE is_test_mode = FALSE OR is_test_mode IS NULL) as live_transactions
FROM credit_transactions
WHERE stripe_payment_id IS NOT NULL

UNION ALL

SELECT 
  'subscriptions' as table_name,
  COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_subscriptions,
  COUNT(*) FILTER (WHERE is_test_mode = FALSE OR is_test_mode IS NULL) as live_subscriptions
FROM subscriptions;
