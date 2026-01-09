-- Repair Script: Set converted_to_user for paid blueprint buyers
-- Date: 2026-01-09 (Updated in PR-3.1)
-- Purpose: Fix any blueprint_subscribers rows where converted_to_user is missing
--          for paid_blueprint purchases (if PR-3 was deployed without PR-3.1)
-- 
-- IMPORTANT: Only run this if PR-3 was deployed to production without PR-3.1
--            (i.e., paid_blueprint_purchased = TRUE but converted_to_user = FALSE)
--
-- What this does:
-- 1. Finds emails that bought paid_blueprint (paid_blueprint_purchased = TRUE)
-- 2. Sets converted_to_user = TRUE (to match system semantics: ANY purchase = converted)
-- 3. This stops freebie nurture emails for paid blueprint buyers (correct behavior)
--
-- Safe to run multiple times (idempotent)

BEGIN;

-- Set converted_to_user for paid blueprint buyers who don't have it set
-- This matches existing system semantics: ANY purchase sets converted_to_user = TRUE
UPDATE blueprint_subscribers
SET 
  converted_to_user = TRUE,
  converted_at = COALESCE(converted_at, paid_blueprint_purchased_at, NOW()),
  updated_at = NOW()
WHERE paid_blueprint_purchased = TRUE
  AND (converted_to_user IS NULL OR converted_to_user = FALSE);

-- Log the repair
DO $$
DECLARE
  rows_updated INT;
BEGIN
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE 'Repaired % blueprint_subscribers rows (set converted_to_user = TRUE to match system semantics)', rows_updated;
END $$;

COMMIT;

-- Verification query (run after script completes):
-- SELECT 
--   bs.email,
--   bs.paid_blueprint_purchased,
--   bs.paid_blueprint_purchased_at,
--   bs.converted_to_user,
--   bs.converted_at
-- FROM blueprint_subscribers bs
-- WHERE bs.paid_blueprint_purchased = TRUE
-- ORDER BY bs.paid_blueprint_purchased_at DESC
-- LIMIT 20;
--
-- Expected: All rows should have converted_to_user = TRUE
