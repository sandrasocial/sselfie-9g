-- Migration: Migrate blueprint_subscribers.form_data to user_personal_brand
-- Purpose: Consolidate all onboarding data into user_personal_brand (single source of truth)
-- This migration is idempotent (safe to run multiple times)

BEGIN;

-- Step 1: Create/update user_personal_brand records from blueprint_subscribers
-- Only migrate users who have blueprint_subscribers.form_data but incomplete user_personal_brand
INSERT INTO user_personal_brand (
  user_id,
  name,
  business_type,
  ideal_audience,
  brand_vibe,
  visual_aesthetic,
  settings_preference,
  photo_goals,
  style_preferences,
  is_completed,
  created_at,
  updated_at
)
SELECT
  bs.user_id,
  COALESCE(bs.name, u.display_name, u.name, u.email),
  -- Extract business from form_data
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
    THEN COALESCE(
      bs.form_data->>'business',
      bs.business
    )
    ELSE bs.business
  END as business_type,
  -- Extract dreamClient from form_data (map to ideal_audience)
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
    THEN COALESCE(
      bs.form_data->>'dreamClient',
      bs.dream_client
    )
    ELSE bs.dream_client
  END as ideal_audience,
  -- Extract vibe from form_data (map to brand_vibe)
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
    THEN bs.form_data->>'vibe'
    ELSE NULL
  END as brand_vibe,
  -- Extract vibe from form_data (map to visual_aesthetic as JSONB array)
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
      AND bs.form_data->>'vibe' IS NOT NULL
    THEN jsonb_build_array(bs.form_data->>'vibe')
    ELSE NULL
  END as visual_aesthetic,
  -- Extract feedStyle from form_data or feed_style column (map to settings_preference as JSONB array)
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
      AND bs.form_data->>'feedStyle' IS NOT NULL
    THEN jsonb_build_array(bs.form_data->>'feedStyle')
    WHEN bs.feed_style IS NOT NULL
    THEN jsonb_build_array(bs.feed_style)
    ELSE NULL
  END as settings_preference,
  -- Combine photo-related fields into photo_goals
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
    THEN TRIM(BOTH '; ' FROM CONCAT_WS(
      '; ',
      CASE WHEN bs.form_data->>'lightingKnowledge' IS NOT NULL 
        THEN CONCAT('Lighting knowledge: ', bs.form_data->>'lightingKnowledge')
        ELSE NULL
      END,
      CASE WHEN bs.form_data->>'angleAwareness' IS NOT NULL 
        THEN CONCAT('Angle awareness: ', bs.form_data->>'angleAwareness')
        ELSE NULL
      END,
      CASE WHEN bs.form_data->>'currentSelfieHabits' IS NOT NULL 
        THEN CONCAT('Current selfie habits: ', bs.form_data->>'currentSelfieHabits')
        ELSE NULL
      END
    ))
    ELSE NULL
  END as photo_goals,
  -- Combine style-related fields into style_preferences
  CASE 
    WHEN bs.form_data IS NOT NULL AND bs.form_data::text != 'null'::text
    THEN TRIM(BOTH '; ' FROM CONCAT_WS(
      '; ',
      CASE WHEN bs.form_data->>'editingStyle' IS NOT NULL 
        THEN CONCAT('Editing style: ', bs.form_data->>'editingStyle')
        ELSE NULL
      END,
      CASE WHEN bs.form_data->>'consistencyLevel' IS NOT NULL 
        THEN CONCAT('Consistency level: ', bs.form_data->>'consistencyLevel')
        ELSE NULL
      END
    ))
    ELSE NULL
  END as style_preferences,
  -- Mark as completed if blueprint was completed
  COALESCE(bs.blueprint_completed, false) as is_completed,
  COALESCE(bs.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM blueprint_subscribers bs
INNER JOIN users u ON bs.user_id = u.id
WHERE bs.user_id IS NOT NULL -- Only authenticated users
  AND bs.form_data IS NOT NULL -- Has form data
  AND bs.form_data::text != 'null'::text -- Form data is not null
  -- Migrate all users (ON CONFLICT will handle updates to existing records)
ON CONFLICT (user_id) DO UPDATE
SET
  name = COALESCE(EXCLUDED.name, user_personal_brand.name),
  business_type = COALESCE(user_personal_brand.business_type, EXCLUDED.business_type),
  ideal_audience = COALESCE(user_personal_brand.ideal_audience, EXCLUDED.ideal_audience),
  brand_vibe = COALESCE(user_personal_brand.brand_vibe, EXCLUDED.brand_vibe),
  visual_aesthetic = COALESCE(user_personal_brand.visual_aesthetic, EXCLUDED.visual_aesthetic),
  settings_preference = COALESCE(user_personal_brand.settings_preference, EXCLUDED.settings_preference),
  photo_goals = COALESCE(user_personal_brand.photo_goals, EXCLUDED.photo_goals),
  style_preferences = COALESCE(user_personal_brand.style_preferences, EXCLUDED.style_preferences),
  is_completed = CASE 
    WHEN user_personal_brand.is_completed = true THEN true
    ELSE EXCLUDED.is_completed
  END,
  updated_at = NOW();

-- Step 2: Record migration in schema_migrations (if table exists)
-- This prevents running the migration multiple times
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
    -- Check if table has 'version' column (newer format) or 'name' column (older format)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schema_migrations' AND column_name = 'version') THEN
      INSERT INTO schema_migrations (version)
      VALUES ('migrate-blueprint-to-unified-wizard')
      ON CONFLICT (version) DO NOTHING;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schema_migrations' AND column_name = 'name') THEN
      INSERT INTO schema_migrations (name, executed_at)
      VALUES ('migrate-blueprint-to-unified-wizard', NOW())
      ON CONFLICT (name) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;

-- Verification query (run separately to check results)
-- SELECT 
--   bs.user_id,
--   bs.email,
--   bs.form_data->>'business' as blueprint_business,
--   upb.business_type as migrated_business_type,
--   bs.form_data->>'dreamClient' as blueprint_dream_client,
--   upb.ideal_audience as migrated_ideal_audience,
--   bs.form_data->>'vibe' as blueprint_vibe,
--   upb.brand_vibe as migrated_brand_vibe,
--   upb.visual_aesthetic as migrated_visual_aesthetic,
--   bs.feed_style as blueprint_feed_style,
--   upb.settings_preference as migrated_settings_preference
-- FROM blueprint_subscribers bs
-- LEFT JOIN user_personal_brand upb ON bs.user_id = upb.user_id
-- WHERE bs.user_id IS NOT NULL
--   AND bs.form_data IS NOT NULL
-- ORDER BY bs.created_at DESC
-- LIMIT 10;
