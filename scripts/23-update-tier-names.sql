-- Update tier names from foundation/professional/enterprise to starter/pro/elite
-- Only updates academy_courses table (subscriptions uses 'plan' column, not 'tier')

BEGIN;

-- Step 1: Drop the old constraint first
ALTER TABLE academy_courses DROP CONSTRAINT IF EXISTS academy_courses_tier_check;

-- Step 2: Update existing data in academy_courses
UPDATE academy_courses SET tier = 'starter' WHERE tier = 'foundation';
UPDATE academy_courses SET tier = 'pro' WHERE tier = 'professional';
UPDATE academy_courses SET tier = 'elite' WHERE tier = 'enterprise';

-- Step 3: Add new constraint with updated values
ALTER TABLE academy_courses ADD CONSTRAINT academy_courses_tier_check 
  CHECK (tier IN ('starter', 'pro', 'elite'));

COMMIT;

-- Verification queries (run these after migration to verify):
-- SELECT tier, COUNT(*) FROM academy_courses GROUP BY tier;
-- Should show: starter, pro, elite (no foundation, professional, or enterprise)
