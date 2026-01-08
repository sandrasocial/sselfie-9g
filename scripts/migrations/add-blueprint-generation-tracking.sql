-- Migration: add-blueprint-generation-tracking
-- Date: 2025-01-XX
-- Purpose: Add columns to track one-time generation limits for blueprint strategy and grid
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to track generation limits
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS strategy_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS strategy_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS strategy_data JSONB, -- Store generated concept (title, prompt, category)
  
  ADD COLUMN IF NOT EXISTS grid_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grid_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS grid_url TEXT, -- Full 3x3 grid URL
  ADD COLUMN IF NOT EXISTS grid_frame_urls JSONB, -- Array of 9 frame URLs
  ADD COLUMN IF NOT EXISTS grid_prediction_id TEXT, -- Nano Banana prediction ID for tracking

  ADD COLUMN IF NOT EXISTS selfie_image_urls JSONB; -- Store uploaded selfie URLs

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_strategy_generated 
  ON blueprint_subscribers(strategy_generated, strategy_generated_at);

CREATE INDEX IF NOT EXISTS idx_blueprint_grid_generated 
  ON blueprint_subscribers(grid_generated, grid_generated_at);

CREATE INDEX IF NOT EXISTS idx_blueprint_email_strategy 
  ON blueprint_subscribers(email, strategy_generated) 
  WHERE strategy_generated = FALSE;

CREATE INDEX IF NOT EXISTS idx_blueprint_email_grid 
  ON blueprint_subscribers(email, grid_generated) 
  WHERE grid_generated = FALSE;

-- Record migration
INSERT INTO schema_migrations (version) 
VALUES ('add-blueprint-generation-tracking')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- ALTER TABLE blueprint_subscribers
--   DROP COLUMN IF EXISTS strategy_generated,
--   DROP COLUMN IF EXISTS strategy_generated_at,
--   DROP COLUMN IF EXISTS strategy_data,
--   DROP COLUMN IF EXISTS grid_generated,
--   DROP COLUMN IF EXISTS grid_generated_at,
--   DROP COLUMN IF EXISTS grid_url,
--   DROP COLUMN IF EXISTS grid_frame_urls,
--   DROP COLUMN IF EXISTS grid_prediction_id,
--   DROP COLUMN IF EXISTS selfie_image_urls;
-- DROP INDEX IF EXISTS idx_blueprint_strategy_generated;
-- DROP INDEX IF EXISTS idx_blueprint_grid_generated;
-- DROP INDEX IF EXISTS idx_blueprint_email_strategy;
-- DROP INDEX IF EXISTS idx_blueprint_email_grid;
-- DELETE FROM schema_migrations WHERE version = 'add-blueprint-generation-tracking';
-- COMMIT;
