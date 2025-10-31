-- Grant all existing users access to SSELFIE
-- All users get Starter plan (100 credits) except Sandra who gets Elite (unlimited)

BEGIN;

-- Step 1: Create user_credits records for all users who don't have one
INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 999999 -- Sandra gets unlimited
    ELSE 100 -- Everyone else gets starter credits
  END as balance,
  0 as total_purchased,
  0 as total_used,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id
);

-- Step 2: Create subscription records for all users who don't have one
INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 'elite' -- Sandra gets elite
    ELSE 'starter' -- Everyone else gets starter
  END as plan,
  'active' as status,
  NOW() as current_period_start,
  NOW() + INTERVAL '30 days' as current_period_end,
  NOW() as created_at,
  NOW() as updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
);

-- Step 3: Create credit transaction records for the initial grant
INSERT INTO credit_transactions (user_id, amount, transaction_type, description, balance_after, created_at)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 999999
    ELSE 100
  END as amount,
  'subscription_grant' as transaction_type,
  CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 'Admin unlimited access grant'
    ELSE 'Initial Starter plan credit grant'
  END as description,
  CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 999999
    ELSE 100
  END as balance_after,
  NOW() as created_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.user_id = u.id 
  AND ct.transaction_type = 'subscription_grant'
);

-- Step 4: Update existing user_credits if they already exist but have 0 balance
UPDATE user_credits uc
SET 
  balance = CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 999999
    ELSE 100
  END,
  updated_at = NOW()
FROM users u
WHERE uc.user_id = u.id
AND uc.balance = 0;

-- Step 5: Update existing subscriptions to active if they exist but are not active
UPDATE subscriptions s
SET 
  status = 'active',
  plan = CASE 
    WHEN u.email = 'ssa@ssasocial' THEN 'elite'
    ELSE COALESCE(s.plan, 'starter')
  END,
  current_period_start = COALESCE(s.current_period_start, NOW()),
  current_period_end = COALESCE(s.current_period_end, NOW() + INTERVAL '30 days'),
  updated_at = NOW()
FROM users u
WHERE s.user_id = u.id
AND (s.status != 'active' OR s.plan IS NULL);

COMMIT;

-- Verification queries (run these after the migration)
-- Check total users
SELECT COUNT(*) as total_users FROM users;

-- Check users with credits
SELECT COUNT(*) as users_with_credits FROM user_credits;

-- Check users with subscriptions
SELECT COUNT(*) as users_with_subscriptions FROM subscriptions;

-- Check Sandra's account
SELECT 
  u.email,
  u.id,
  uc.balance as credits,
  s.plan,
  s.status
FROM users u
LEFT JOIN user_credits uc ON uc.user_id = u.id
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'ssa@ssasocial';

-- Check all users' plans
SELECT 
  s.plan,
  COUNT(*) as user_count,
  SUM(uc.balance) as total_credits
FROM subscriptions s
LEFT JOIN user_credits uc ON uc.user_id = s.user_id
GROUP BY s.plan
ORDER BY s.plan;
