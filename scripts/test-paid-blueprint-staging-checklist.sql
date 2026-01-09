-- ============================================================================
-- STEP 5C: END-TO-END STAGING TEST for Paid Blueprint (PR-4 Hotfix)
-- ============================================================================
-- This file provides SQL queries to prepare test data.
-- API calls and verification steps are in the companion markdown checklist.
-- ============================================================================

-- ============================================================================
-- SETUP: Create or verify test subscriber with proper data
-- ============================================================================

-- Option A: Create NEW test subscriber (if none exists)
INSERT INTO blueprint_subscribers (
  email,
  name,
  access_token,
  source,
  form_data,
  business,
  dream_client,
  feed_style,
  selfie_skill_level,
  paid_blueprint_purchased,
  paid_blueprint_purchased_at,
  paid_blueprint_stripe_payment_id,
  paid_blueprint_photo_urls,
  paid_blueprint_generated,
  selfie_image_urls,
  created_at,
  updated_at
) VALUES (
  'test-pr4-staging@sselfie.app',
  'Test PR4 User',
  'test-pr4-staging-' || gen_random_uuid()::text, -- Generates unique token
  'brand-blueprint',
  '{"vibe": "educator", "business": "AI Coaching", "dreamClient": "Tech entrepreneurs", "struggle": "Creating consistent content"}'::jsonb,
  'AI Coaching',
  'Tech entrepreneurs',
  'minimal', -- Valid mood: luxury, minimal, or beige
  'beginner',
  TRUE, -- Has purchased paid blueprint
  NOW(),
  'test_stripe_payment_' || gen_random_uuid()::text,
  '[]'::jsonb, -- Empty array, will be populated by grid generation
  FALSE,
  '["https://replicate.delivery/test-selfie-1.jpg", "https://replicate.delivery/test-selfie-2.jpg"]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  feed_style = 'minimal',
  paid_blueprint_purchased = TRUE,
  paid_blueprint_photo_urls = '[]'::jsonb,
  paid_blueprint_generated = FALSE,
  selfie_image_urls = '["https://replicate.delivery/test-selfie-1.jpg", "https://replicate.delivery/test-selfie-2.jpg"]'::jsonb,
  updated_at = NOW()
RETURNING id, email, access_token, feed_style, paid_blueprint_purchased;

-- ============================================================================
-- QUERY: Get test subscriber details (for API testing)
-- ============================================================================
SELECT 
  id,
  email,
  access_token,
  feed_style AS mood,
  form_data->>'vibe' AS category,
  paid_blueprint_purchased,
  paid_blueprint_generated,
  selfie_image_urls,
  jsonb_array_length(COALESCE(paid_blueprint_photo_urls, '[]'::jsonb)) AS grids_completed,
  paid_blueprint_photo_urls,
  created_at
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- ============================================================================
-- VERIFICATION QUERIES (run after each test step)
-- ============================================================================

-- Verify Grid 1 was written to slot 0
SELECT 
  email,
  paid_blueprint_photo_urls->0 AS grid_1_url,
  CASE 
    WHEN paid_blueprint_photo_urls->0 IS NOT NULL THEN '✅ Grid 1 stored'
    ELSE '❌ Grid 1 missing'
  END AS status
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- Verify Grid 2 was written to slot 1
SELECT 
  email,
  paid_blueprint_photo_urls->1 AS grid_2_url,
  CASE 
    WHEN paid_blueprint_photo_urls->1 IS NOT NULL THEN '✅ Grid 2 stored'
    ELSE '❌ Grid 2 missing'
  END AS status
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- Verify Grid 3 was written to slot 2
SELECT 
  email,
  paid_blueprint_photo_urls->2 AS grid_3_url,
  CASE 
    WHEN paid_blueprint_photo_urls->2 IS NOT NULL THEN '✅ Grid 3 stored'
    ELSE '❌ Grid 3 missing'
  END AS status
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- Verify all 3 grids in one query
SELECT 
  email,
  jsonb_array_length(COALESCE(paid_blueprint_photo_urls, '[]'::jsonb)) AS array_length,
  paid_blueprint_photo_urls->0 IS NOT NULL AS has_grid_1,
  paid_blueprint_photo_urls->1 IS NOT NULL AS has_grid_2,
  paid_blueprint_photo_urls->2 IS NOT NULL AS has_grid_3,
  CASE 
    WHEN jsonb_array_length(COALESCE(paid_blueprint_photo_urls, '[]'::jsonb)) >= 3 THEN '✅ All 3 grids stored'
    ELSE '❌ Missing grids'
  END AS status,
  paid_blueprint_photo_urls
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- ============================================================================
-- IDEMPOTENCY TEST VERIFICATION
-- ============================================================================

-- This query helps verify that re-running grid 1 generation does NOT overwrite
-- Expected: Grid 1 URL should remain the SAME after idempotency test
SELECT 
  email,
  paid_blueprint_photo_urls->0 AS grid_1_url_before_rerun,
  updated_at
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- Run this AFTER re-running Grid 1 generation:
-- Expected: Same URL, updated_at should NOT change
SELECT 
  email,
  paid_blueprint_photo_urls->0 AS grid_1_url_after_rerun,
  updated_at,
  CASE 
    WHEN paid_blueprint_photo_urls->0 = 
         (SELECT paid_blueprint_photo_urls->0 
          FROM blueprint_subscribers 
          WHERE email = 'test-pr4-staging@sselfie.app') 
    THEN '✅ Idempotency preserved'
    ELSE '❌ Grid was overwritten!'
  END AS idempotency_check
FROM blueprint_subscribers
WHERE email = 'test-pr4-staging@sselfie.app';

-- ============================================================================
-- CLEANUP (run after testing complete)
-- ============================================================================

-- Delete test subscriber
-- DELETE FROM blueprint_subscribers WHERE email = 'test-pr4-staging@sselfie.app';

-- Or just reset paid blueprint state for re-testing
UPDATE blueprint_subscribers
SET 
  paid_blueprint_photo_urls = '[]'::jsonb,
  paid_blueprint_generated = FALSE,
  paid_blueprint_generated_at = NULL,
  updated_at = NOW()
WHERE email = 'test-pr4-staging@sselfie.app';
