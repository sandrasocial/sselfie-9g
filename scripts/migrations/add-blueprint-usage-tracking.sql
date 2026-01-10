-- Migration: add-blueprint-usage-tracking
-- Date: 2025-01-XX
-- Purpose: Add usage tracking columns to blueprint_subscribers for entitlement enforcement
-- Phase: Phase 2 - Blueprint Auth Migration
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add usage tracking columns to blueprint_subscribers
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS free_grid_used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS free_grid_used_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_grids_generated INTEGER DEFAULT 0;

-- Create indexes for faster entitlement queries
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_free_grid_used 
  ON blueprint_subscribers(user_id, free_grid_used_count)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_paid_grids 
  ON blueprint_subscribers(user_id, paid_grids_generated)
  WHERE user_id IS NOT NULL AND paid_blueprint_purchased = TRUE;

-- Record migration
INSERT INTO schema_migrations (version) 
VALUES ('add-blueprint-usage-tracking')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- ALTER TABLE blueprint_subscribers
--   DROP COLUMN IF EXISTS free_grid_used_at,
--   DROP COLUMN IF EXISTS free_grid_used_count,
--   DROP COLUMN IF EXISTS paid_grids_generated;
-- DROP INDEX IF EXISTS idx_blueprint_subscribers_free_grid_used;
-- DROP INDEX IF EXISTS idx_blueprint_subscribers_paid_grids;
-- DELETE FROM schema_migrations WHERE version = 'add-blueprint-usage-tracking';
-- COMMIT;
