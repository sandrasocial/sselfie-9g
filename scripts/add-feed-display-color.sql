-- Add display_color column to feed_layouts for feed organization
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS display_color VARCHAR(7);

COMMENT ON COLUMN feed_layouts.display_color IS 'Hex color code for visual feed organization (e.g., #ec4899)';
