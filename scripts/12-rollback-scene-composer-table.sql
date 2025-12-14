-- Rollback Scene Composer table migration
-- Run this if you need to remove the scene_composer_scenes table
-- BEFORE implementing Studio Pro (which uses ai_images table instead)

-- Drop RLS policy first
DROP POLICY IF EXISTS scene_composer_user_policy ON scene_composer_scenes;

-- Drop indexes
DROP INDEX IF EXISTS idx_scene_composer_user_id;
DROP INDEX IF EXISTS idx_scene_composer_status;
DROP INDEX IF EXISTS idx_scene_composer_created;

-- Drop the table
DROP TABLE IF EXISTS scene_composer_scenes;

-- Note: If you have data in this table that you want to migrate to ai_images,
-- export it first before running this rollback script.
