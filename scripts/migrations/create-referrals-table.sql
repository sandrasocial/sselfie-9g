-- Migration: create-referrals-table
-- Date: 2025-01-XX
-- Purpose: Create referrals table for referral tracking and rewards
-- Rollback: See ROLLBACK section at bottom

BEGIN;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  referred_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  credits_awarded_referrer INTEGER DEFAULT 0,
  credits_awarded_referred INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Add referral_code column to users table for quick lookup
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;

-- Create index on users.referral_code
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Create updated_at trigger for referrals
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_referrals_updated_at();

COMMIT;

-- ROLLBACK (if needed):
-- BEGIN;
-- DROP TRIGGER IF EXISTS referrals_updated_at ON referrals;
-- DROP FUNCTION IF EXISTS update_referrals_updated_at();
-- DROP INDEX IF EXISTS idx_referrals_referrer_id;
-- DROP INDEX IF EXISTS idx_referrals_referred_id;
-- DROP INDEX IF EXISTS idx_referrals_referral_code;
-- DROP INDEX IF EXISTS idx_referrals_status;
-- DROP INDEX IF EXISTS idx_users_referral_code;
-- ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
-- DROP TABLE IF EXISTS referrals;
-- COMMIT;
