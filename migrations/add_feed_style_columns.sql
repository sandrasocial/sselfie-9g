-- Migration: Add visual_aesthetic and fashion_style columns to feed_layouts
-- Date: 2026-01-18
-- Purpose: Persist feed-specific style selections from Feed Style Picker

-- Add visual_aesthetic column (JSONB array, nullable for legacy feeds)
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS visual_aesthetic JSONB NULL;

-- Add fashion_style column (JSONB array, nullable for legacy feeds)
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS fashion_style JSONB NULL;

-- Add comments for documentation
COMMENT ON COLUMN feed_layouts.visual_aesthetic IS 'Feed-specific visual aesthetic selections from Feed Style Picker (e.g., ["minimal", "warm"])';
COMMENT ON COLUMN feed_layouts.fashion_style IS 'Feed-specific fashion style selections from Feed Style Picker (e.g., ["casual", "bohemian"])';

-- Note: No default values - NULL indicates legacy feeds or feeds created without these selections
-- Generation will fall back to user_personal_brand values for NULL columns
