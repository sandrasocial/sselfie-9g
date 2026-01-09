-- ============================================================================
-- REPAIR SCRIPT: Fix invalid feed_style values in blueprint_subscribers
-- ============================================================================
-- Problem: feed_style column contains category values (educator, coach, etc.)
--          instead of mood values (luxury, minimal, beige)
-- 
-- Root Cause: /app/api/blueprint/subscribe/route.ts was storing formData.vibe
--             instead of selectedFeedStyle (FIXED in PR-4 Hotfix)
--
-- This script repairs existing bad data only.
-- ============================================================================

-- SAFETY CHECKS
DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blueprint_subscribers') THEN
    RAISE EXCEPTION 'Table blueprint_subscribers does not exist. Aborting.';
  END IF;
  
  -- Verify feed_style column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blueprint_subscribers' AND column_name = 'feed_style') THEN
    RAISE EXCEPTION 'Column feed_style does not exist. Aborting.';
  END IF;
  
  RAISE NOTICE 'Safety checks passed. Proceeding with repair...';
END $$;

-- ============================================================================
-- REPAIR STRATEGY (in priority order):
-- ============================================================================
-- 1. If form_data.selectedFeedStyle exists and is valid → use it
-- 2. If form_data.feed_style exists and is valid → use it  
-- 3. Otherwise → set to NULL (do NOT guess)
-- ============================================================================

-- Step 1: Show BEFORE state
DO $$
DECLARE
  bad_count INT;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM blueprint_subscribers
  WHERE feed_style IS NOT NULL 
    AND feed_style NOT IN ('luxury', 'minimal', 'beige');
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'BEFORE REPAIR: % rows with invalid feed_style', bad_count;
  RAISE NOTICE '============================================';
END $$;

-- Step 2: Repair using form_data.selectedFeedStyle (highest priority)
UPDATE blueprint_subscribers
SET 
  feed_style = form_data->>'selectedFeedStyle',
  updated_at = NOW()
WHERE feed_style IS NOT NULL
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
  AND form_data->>'selectedFeedStyle' IN ('luxury', 'minimal', 'beige');

-- Step 3: Repair using form_data.feed_style (fallback)
UPDATE blueprint_subscribers
SET 
  feed_style = form_data->>'feed_style',
  updated_at = NOW()
WHERE feed_style IS NOT NULL
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
  AND form_data->>'feed_style' IN ('luxury', 'minimal', 'beige');

-- Step 4: Set remaining invalid values to NULL (no valid source found)
UPDATE blueprint_subscribers
SET 
  feed_style = NULL,
  updated_at = NOW()
WHERE feed_style IS NOT NULL
  AND feed_style NOT IN ('luxury', 'minimal', 'beige');

-- Step 5: Show AFTER state
DO $$
DECLARE
  bad_count INT;
  null_count INT;
  valid_count INT;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM blueprint_subscribers
  WHERE feed_style IS NOT NULL 
    AND feed_style NOT IN ('luxury', 'minimal', 'beige');
  
  SELECT COUNT(*) INTO null_count
  FROM blueprint_subscribers
  WHERE feed_style IS NULL;
  
  SELECT COUNT(*) INTO valid_count
  FROM blueprint_subscribers
  WHERE feed_style IN ('luxury', 'minimal', 'beige');
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AFTER REPAIR:';
  RAISE NOTICE '  Invalid rows remaining: %', bad_count;
  RAISE NOTICE '  NULL rows: %', null_count;
  RAISE NOTICE '  Valid rows (luxury/minimal/beige): %', valid_count;
  RAISE NOTICE '============================================';
  
  IF bad_count > 0 THEN
    RAISE WARNING 'Still have % rows with invalid feed_style!', bad_count;
  ELSE
    RAISE NOTICE '✅ Repair completed successfully!';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed):
-- ============================================================================
-- This script is NOT reversible because we don't store the old values.
-- If you need to rollback:
-- 1. Restore from database backup before running this script
-- 2. Or manually inspect form_data and restore values per row
--
-- Prevention: Always test on staging/dev database first!
-- ============================================================================

-- VERIFICATION QUERY (run manually after script):
-- SELECT feed_style, COUNT(*) 
-- FROM blueprint_subscribers 
-- WHERE feed_style IS NOT NULL 
-- GROUP BY feed_style 
-- ORDER BY COUNT(*) DESC;
