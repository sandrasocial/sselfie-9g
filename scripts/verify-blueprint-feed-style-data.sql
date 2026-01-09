-- ============================================================================
-- STEP 5A: Verify blueprint_subscribers.feed_style data quality
-- ============================================================================
-- Purpose: Check if any rows have invalid feed_style values
-- Expected valid values: 'luxury', 'minimal', 'beige', NULL
-- Invalid values: category names like 'educator', 'coach', 'influencer', etc.
-- ============================================================================

-- Query 1: Find rows with INVALID feed_style values
-- (feed_style should be mood, not category)
SELECT 
  id,
  email,
  feed_style,
  form_data->>'vibe' AS category_from_form_data,
  form_data->>'selectedFeedStyle' AS mood_from_form_data,
  created_at
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
ORDER BY created_at DESC;

-- Query 2: Count affected rows
SELECT 
  COUNT(*) AS total_invalid_rows,
  COUNT(DISTINCT feed_style) AS unique_invalid_values
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige');

-- Query 3: Sample 10 bad rows with details
SELECT 
  id,
  LEFT(email, 3) || '***' || RIGHT(email, 10) AS masked_email,
  feed_style AS current_bad_value,
  form_data->>'vibe' AS category,
  form_data->>'selectedFeedStyle' AS correct_mood,
  paid_blueprint_purchased,
  paid_blueprint_generated,
  created_at
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL 
  AND feed_style NOT IN ('luxury', 'minimal', 'beige')
ORDER BY created_at DESC
LIMIT 10;

-- Query 4: Distribution of VALID feed_style values (for comparison)
SELECT 
  feed_style,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL
GROUP BY feed_style
ORDER BY count DESC;

-- Query 5: Check if form_data has selectedFeedStyle for repair potential
SELECT 
  COUNT(*) AS rows_with_selectedFeedStyle_in_form_data,
  COUNT(CASE WHEN feed_style NOT IN ('luxury', 'minimal', 'beige') THEN 1 END) AS repairable_rows
FROM blueprint_subscribers
WHERE feed_style IS NOT NULL
  AND form_data->>'selectedFeedStyle' IS NOT NULL;
