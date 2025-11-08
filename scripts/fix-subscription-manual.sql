-- Manual fix: Create subscription record for user who purchased Studio Membership
-- This user has 150 credits and paid for the plan but has no subscription record

-- First, verify the user exists and check their current plan
SELECT 
  id, 
  email, 
  display_name,
  plan,
  created_at
FROM users 
WHERE id = '0ba28d69-fcd4-4ab2-8671-88fde77e4f94';

-- Check their credit balance
SELECT * FROM user_credits 
WHERE user_id = '0ba28d69-fcd4-4ab2-8671-88fde77e4f94';

-- Check if subscription already exists
SELECT * FROM subscriptions 
WHERE user_id = '0ba28d69-fcd4-4ab2-8671-88fde77e4f94';

-- Create the missing subscription record
INSERT INTO subscriptions (
  user_id,
  product_type,
  plan,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  '0ba28d69-fcd4-4ab2-8671-88fde77e4f94',
  'sselfie_studio_membership',
  'sselfie-studio',
  'active',
  'manual_backfill_' || gen_random_uuid()::text,
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Also update the user's plan field to match
UPDATE users 
SET 
  plan = 'sselfie-studio',
  updated_at = NOW()
WHERE id = '0ba28d69-fcd4-4ab2-8671-88fde77e4f94'
  AND (plan IS NULL OR plan != 'sselfie-studio');

-- Verify the fix worked
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.plan as user_plan,
  uc.balance as credits,
  s.product_type,
  s.plan as subscription_plan,
  s.status,
  s.current_period_end
FROM users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.product_type = 'sselfie_studio_membership'
WHERE u.id = '0ba28d69-fcd4-4ab2-8671-88fde77e4f94';
