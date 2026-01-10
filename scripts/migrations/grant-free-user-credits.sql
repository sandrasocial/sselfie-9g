-- Migration: grant-free-user-credits
-- Date: 2026-01-XX
-- Purpose: Grant 2 credits to existing free users who haven't used their free grid
-- Phase: Decision 1 - Credit System for All Users

BEGIN;

-- Step 1: Create user_credits records for free users who don't have one yet
-- Only grant credits if they haven't used their free grid (free_grid_used_count = 0)
INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
SELECT 
  u.id,
  2 as balance,
  2 as total_purchased,
  0 as total_used,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.user_id = u.id AND s.status = 'active'
)
AND NOT EXISTS (
  SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
)
AND (
  -- User has no blueprint_subscribers record (never used blueprint)
  NOT EXISTS (
    SELECT 1 FROM blueprint_subscribers bs 
    WHERE bs.user_id = u.id
  )
  OR
  -- User has blueprint_subscribers but hasn't used free grid
  EXISTS (
    SELECT 1 FROM blueprint_subscribers bs 
    WHERE bs.user_id = u.id 
    AND (bs.free_grid_used_count IS NULL OR bs.free_grid_used_count = 0)
  )
);

-- Step 2: Record credit transactions for the grants
INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
SELECT 
  uc.user_id,
  2 as amount,
  'bonus' as transaction_type,
  'Free blueprint credits (migration)' as description,
  uc.balance as balance_after,
  NOW() as created_at
FROM user_credits uc
WHERE uc.balance = 2
AND uc.created_at >= NOW() - INTERVAL '1 hour' -- Only newly created records from this migration
AND NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.user_id = uc.user_id 
  AND ct.transaction_type = 'bonus'
  AND ct.description = 'Free blueprint credits (migration)'
);

-- Step 3: For users who already used their free grid, grant 0 credits (create record only)
-- This ensures all users have a user_credits record for consistency
INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
SELECT 
  u.id,
  0 as balance,
  0 as total_purchased,
  0 as total_used,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.user_id = u.id AND s.status = 'active'
)
AND NOT EXISTS (
  SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
)
AND EXISTS (
  SELECT 1 FROM blueprint_subscribers bs 
  WHERE bs.user_id = u.id 
  AND bs.free_grid_used_count > 0
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
