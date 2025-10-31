-- Fix Sandra's admin account to have Elite plan with unlimited credits
-- User ID: 42585527
-- Email: ssa@ssasocial.com

BEGIN;

-- Update subscription for Sandra (or insert if doesn't exist)
UPDATE subscriptions
SET 
  plan = 'elite',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id = '42585527';

-- If no rows were updated, insert a new subscription
INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
SELECT '42585527', 'elite', 'active', NOW(), NOW() + INTERVAL '1 year', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = '42585527');

-- Update credits for Sandra (or insert if doesn't exist)
UPDATE user_credits
SET 
  balance = 999999,
  updated_at = NOW()
WHERE user_id = '42585527';

-- If no rows were updated, insert new credits record
INSERT INTO user_credits (user_id, balance, total_used, total_purchased, created_at, updated_at)
SELECT '42585527', 999999, 0, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_credits WHERE user_id = '42585527');

-- Added balance_after and changed transaction_type to 'bonus'
-- Add transaction record for the credit grant
INSERT INTO credit_transactions (
  user_id,
  amount,
  transaction_type,
  description,
  balance_after,
  created_at
)
VALUES (
  '42585527',
  999999,
  'bonus',
  'Admin account - unlimited credits',
  999999,
  NOW()
);

COMMIT;

-- Verify the changes
SELECT 
  u.id,
  u.email,
  u.display_name,
  s.plan,
  s.status,
  uc.balance as credits
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN user_credits uc ON u.id = uc.user_id
WHERE u.id = '42585527';
