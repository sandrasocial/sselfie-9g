-- Repair Tool: Reconcile Missing Credit Transactions
-- Finds cases where user_credits.balance doesn't match sum of credit_transactions
-- and creates missing transaction logs.

BEGIN;

-- Find and repair discrepancies
INSERT INTO credit_transactions (
  user_id,
  amount,
  transaction_type,
  description,
  balance_after,
  created_at
)
SELECT 
  uc.user_id,
  (uc.balance - COALESCE(SUM(ct.amount), 0)) as difference,
  'refund',
  'Reconciliation: Missing transaction log repaired',
  uc.balance,
  NOW()
FROM user_credits uc
LEFT JOIN credit_transactions ct ON uc.user_id = ct.user_id
GROUP BY uc.user_id, uc.balance
HAVING uc.balance != COALESCE(SUM(ct.amount), 0)
  AND (uc.balance - COALESCE(SUM(ct.amount), 0)) != 0;

COMMIT;
