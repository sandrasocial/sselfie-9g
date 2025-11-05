-- Add product_type column to subscriptions table
-- This supports the new simplified pricing model

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_type 
ON subscriptions(product_type);

-- Update to use correct column name 'plan' instead of 'plan_name' and 'tier'
-- Update existing subscriptions to use new product types
-- All Starter users → sselfie_studio_membership
UPDATE subscriptions
SET product_type = 'sselfie_studio_membership'
WHERE LOWER(plan) = 'starter'
AND product_type IS NULL;

-- All Pro users → sselfie_studio_membership
UPDATE subscriptions
SET product_type = 'sselfie_studio_membership'
WHERE LOWER(plan) = 'pro'
AND product_type IS NULL;

-- All Elite users → sselfie_studio_membership
UPDATE subscriptions
SET product_type = 'sselfie_studio_membership'
WHERE LOWER(plan) = 'elite'
AND product_type IS NULL;

-- All Beta users → sselfie_studio_membership
UPDATE subscriptions
SET product_type = 'sselfie_studio_membership'
WHERE LOWER(plan) = 'beta'
AND product_type IS NULL;

-- Any remaining subscriptions default to membership
UPDATE subscriptions
SET product_type = 'sselfie_studio_membership'
WHERE product_type IS NULL;

-- Verify migration
SELECT 
  product_type,
  COUNT(*) as count,
  status
FROM subscriptions
WHERE product_type IS NOT NULL
GROUP BY product_type, status
ORDER BY count DESC;
