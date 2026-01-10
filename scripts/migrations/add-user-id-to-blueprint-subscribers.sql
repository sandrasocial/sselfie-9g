-- Migration: add-user-id-to-blueprint-subscribers
-- Date: 2025-01-XX
-- Purpose: Add user_id column to blueprint_subscribers to link blueprint state to authenticated users
-- Phase: Phase 1 - Blueprint Auth Migration
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column to blueprint_subscribers
-- Allows NULL initially (existing rows will be NULL until migrated in Phase 4)
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_blueprint_subscribers_user_id 
  ON blueprint_subscribers(user_id)
  WHERE user_id IS NOT NULL;

-- Create unique index to ensure one blueprint state per user
-- Note: This will fail if multiple rows exist for same user_id (will need to clean up first)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_blueprint_subscribers_user_id_unique 
--   ON blueprint_subscribers(user_id)
--   WHERE user_id IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version) 
VALUES ('add-user-id-to-blueprint-subscribers')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- ALTER TABLE blueprint_subscribers
--   DROP COLUMN IF EXISTS user_id;
-- DROP INDEX IF EXISTS idx_blueprint_subscribers_user_id;
-- DROP INDEX IF EXISTS idx_blueprint_subscribers_user_id_unique;
-- DELETE FROM schema_migrations WHERE version = 'add-user-id-to-blueprint-subscribers';
-- COMMIT;
