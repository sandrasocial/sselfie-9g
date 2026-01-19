-- =====================================================
-- BETA USER ACCESS DIAGNOSTIC QUERY
-- =====================================================
-- This query checks the subscription status and access levels
-- for all beta users (Studio Membership holders)
-- 
-- Run this to verify beta users have correct access after fix
-- =====================================================

-- Get all beta users with their subscriptions and blueprint status
SELECT 
  u.id as user_id,
  u.email,
  u.display_name,
  u.created_at as joined_at,
  
  -- Subscription info
  s.product_type,
  s.status as subscription_status,
  s.created_at as subscription_date,
  
  -- Blueprint info
  bs.paid_blueprint_purchased,
  bs.free_grid_used_count,
  bs.paid_grids_generated,
  
  -- Computed access flags
  CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN TRUE
    ELSE FALSE
  END as has_studio_membership,
  
  CASE 
    WHEN bs.paid_blueprint_purchased = TRUE THEN TRUE
    ELSE FALSE
  END as has_paid_blueprint,
  
  -- Expected Maya access
  CASE 
    -- Studio members ALWAYS have Maya access (even if they have paid blueprint)
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN 'ALLOWED ✅'
    -- Paid blueprint only (no studio) should be blocked
    WHEN bs.paid_blueprint_purchased = TRUE 
      AND (s.product_type NOT IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') OR s.status != 'active') 
      THEN 'BLOCKED ❌'
    -- All others (free, one-time) have access
    ELSE 'ALLOWED ✅'
  END as maya_access_status,
  
  -- User tier
  CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' 
      AND bs.paid_blueprint_purchased = TRUE THEN 'Studio + Paid Blueprint'
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN 'Studio Only'
    WHEN bs.paid_blueprint_purchased = TRUE THEN 'Paid Blueprint Only'
    WHEN s.product_type = 'one_time_session' AND s.status = 'active' THEN 'One-Time Session'
    ELSE 'Free User'
  END as user_tier

FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
LEFT JOIN blueprint_subscribers bs ON u.id = bs.user_id

WHERE (
  -- Beta users with studio membership
  (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
   AND s.status = 'active')
  OR
  -- Or users with paid blueprint
  bs.paid_blueprint_purchased = TRUE
  OR
  -- Or users with one-time session
  (s.product_type = 'one_time_session' AND s.status = 'active')
)

ORDER BY 
  CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' 
      AND bs.paid_blueprint_purchased = TRUE THEN 1  -- Studio + Blueprint first
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN 2  -- Studio only second
    WHEN bs.paid_blueprint_purchased = TRUE THEN 3  -- Paid blueprint only third
    ELSE 4  -- Others last
  END,
  u.created_at DESC;

-- =====================================================
-- SUMMARY STATS
-- =====================================================

SELECT 
  'Beta Users Summary' as category,
  
  COUNT(DISTINCT u.id) as total_users,
  
  COUNT(DISTINCT CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN u.id 
  END) as studio_members,
  
  COUNT(DISTINCT CASE 
    WHEN bs.paid_blueprint_purchased = TRUE THEN u.id 
  END) as paid_blueprint_users,
  
  COUNT(DISTINCT CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' 
      AND bs.paid_blueprint_purchased = TRUE THEN u.id 
  END) as studio_with_blueprint,
  
  COUNT(DISTINCT CASE 
    WHEN s.product_type = 'one_time_session' AND s.status = 'active' THEN u.id 
  END) as one_time_session_users,
  
  -- Users who SHOULD have Maya access (Studio members + Free + One-time)
  COUNT(DISTINCT CASE 
    WHEN s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') 
      AND s.status = 'active' THEN u.id
    WHEN s.product_type IS NULL OR s.product_type NOT IN ('paid_blueprint') THEN u.id
  END) as should_have_maya_access,
  
  -- Users who should be BLOCKED from Maya (Paid blueprint only, no studio)
  COUNT(DISTINCT CASE 
    WHEN bs.paid_blueprint_purchased = TRUE 
      AND (s.product_type NOT IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') OR s.status != 'active' OR s.product_type IS NULL)
    THEN u.id 
  END) as should_block_maya

FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
LEFT JOIN blueprint_subscribers bs ON u.id = bs.user_id

WHERE (
  (s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro') AND s.status = 'active')
  OR bs.paid_blueprint_purchased = TRUE
  OR (s.product_type = 'one_time_session' AND s.status = 'active')
);

-- =====================================================
-- CHECK FOR PROBLEMATIC CASES
-- =====================================================

-- Users who were BLOCKED but should have access (THE BUG)
SELECT 
  'Users Affected by Bug (Studio + Paid Blueprint)' as issue,
  u.email,
  s.product_type,
  s.status,
  bs.paid_blueprint_purchased,
  'BEFORE FIX: Blocked from Maya ❌' as old_behavior,
  'AFTER FIX: Maya access granted ✅' as new_behavior
FROM users u
INNER JOIN subscriptions s ON u.id = s.user_id AND s.is_test_mode = FALSE
INNER JOIN blueprint_subscribers bs ON u.id = bs.user_id
WHERE s.product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
  AND s.status = 'active'
  AND bs.paid_blueprint_purchased = TRUE
ORDER BY u.created_at DESC;
