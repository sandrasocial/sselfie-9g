-- Migration: add-paid-blueprint-email-columns
-- Date: 2026-01-09
-- Purpose: Add email tracking columns for paid blueprint followup sequence (Day 1, 3, 7)
-- Related: FREE blueprint uses day_3_email_sent, day_7_email_sent, day_14_email_sent (from add-blueprint-followup-email-columns.sql)
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email tracking columns for paid blueprint followups
-- Pattern matches FREE blueprint: day_X_email_sent (BOOLEAN) + day_X_email_sent_at (TIMESTAMPTZ)
ALTER TABLE blueprint_subscribers
  ADD COLUMN IF NOT EXISTS day_1_paid_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_1_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS day_3_paid_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_3_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS day_7_paid_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS day_7_paid_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster queries (pattern matches FREE blueprint indexes)
-- Indexes use paid_blueprint_purchased_at (not created_at) since emails are sent after purchase
CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day1 
  ON blueprint_subscribers(day_1_paid_email_sent, paid_blueprint_purchased_at) 
  WHERE paid_blueprint_purchased = TRUE AND day_1_paid_email_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day3 
  ON blueprint_subscribers(day_3_paid_email_sent, paid_blueprint_purchased_at) 
  WHERE paid_blueprint_purchased = TRUE AND day_3_paid_email_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day7 
  ON blueprint_subscribers(day_7_paid_email_sent, paid_blueprint_purchased_at) 
  WHERE paid_blueprint_purchased = TRUE AND day_7_paid_email_sent = FALSE;

-- Record migration
INSERT INTO schema_migrations (version) 
VALUES ('add-paid-blueprint-email-columns')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- ALTER TABLE blueprint_subscribers
--   DROP COLUMN IF EXISTS day_1_paid_email_sent,
--   DROP COLUMN IF EXISTS day_1_paid_email_sent_at,
--   DROP COLUMN IF EXISTS day_3_paid_email_sent,
--   DROP COLUMN IF EXISTS day_3_paid_email_sent_at,
--   DROP COLUMN IF EXISTS day_7_paid_email_sent,
--   DROP COLUMN IF EXISTS day_7_paid_email_sent_at;
-- DROP INDEX IF EXISTS idx_blueprint_paid_email_day1;
-- DROP INDEX IF EXISTS idx_blueprint_paid_email_day3;
-- DROP INDEX IF EXISTS idx_blueprint_paid_email_day7;
-- DELETE FROM schema_migrations WHERE version = 'add-paid-blueprint-email-columns';
-- COMMIT;
