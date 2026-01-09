-- Migration: add-paid-blueprint-tracking
-- Date: 2026-01-09
-- Purpose: Add columns to track paid blueprint purchases ($47 one-time product)
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to track paid blueprint purchases
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS paid_blueprint_purchased BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_blueprint_purchased_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS paid_blueprint_stripe_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_blueprint_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_blueprint_generated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blueprint_paid_purchased 
  ON blueprint_subscribers(paid_blueprint_purchased) 
  WHERE paid_blueprint_purchased = TRUE;

CREATE INDEX IF NOT EXISTS idx_blueprint_paid_pending_generation 
  ON blueprint_subscribers(paid_blueprint_generated, paid_blueprint_purchased) 
  WHERE paid_blueprint_generated = FALSE AND paid_blueprint_purchased = TRUE;

CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email 
  ON blueprint_subscribers(email, paid_blueprint_purchased);

-- Record migration
INSERT INTO schema_migrations (version) 
VALUES ('add-paid-blueprint-tracking')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- ALTER TABLE blueprint_subscribers
--   DROP COLUMN IF EXISTS paid_blueprint_purchased,
--   DROP COLUMN IF EXISTS paid_blueprint_purchased_at,
--   DROP COLUMN IF EXISTS paid_blueprint_stripe_payment_id,
--   DROP COLUMN IF EXISTS paid_blueprint_photo_urls,
--   DROP COLUMN IF EXISTS paid_blueprint_generated,
--   DROP COLUMN IF EXISTS paid_blueprint_generated_at;
-- DROP INDEX IF EXISTS idx_blueprint_paid_purchased;
-- DROP INDEX IF EXISTS idx_blueprint_paid_pending_generation;
-- DROP INDEX IF EXISTS idx_blueprint_paid_email;
-- DELETE FROM schema_migrations WHERE version = 'add-paid-blueprint-tracking';
-- COMMIT;
