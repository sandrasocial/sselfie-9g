-- Migration: Add onboarding_completed and blueprint_welcome_shown_at columns to users table
-- Purpose: Support Decision 2/3 - Track onboarding completion to prevent training wizard from showing after blueprint welcome

BEGIN;

-- Add onboarding_completed column (BOOLEAN, DEFAULT false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false NOT NULL;

-- Add blueprint_welcome_shown_at column (TIMESTAMP WITH TIME ZONE, nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS blueprint_welcome_shown_at TIMESTAMP WITH TIME ZONE;

-- Create index on onboarding_completed for faster queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);

-- Record migration in schema_migrations table (uses version column, not migration_name)
-- Note: Migration recording is handled by the TypeScript runner script

COMMIT;
