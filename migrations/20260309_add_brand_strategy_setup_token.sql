-- Migration: add setup_token to subscriptions + freebie_brand_strategies
-- Created: 2026-03-09
-- Author: Claude Code
-- Purpose: Store a one-time setup token so the post-payment questionnaire
--          at /brand-strategy/setup/[token] can be authenticated without
--          requiring the user to be logged in at time of purchase.
--          Also adds setup_token to freebie_brand_strategies for idempotency.

-- ROLLBACK:
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS setup_token;
-- DROP INDEX IF EXISTS idx_subscriptions_setup_token;
-- ALTER TABLE freebie_brand_strategies DROP COLUMN IF EXISTS setup_token;

-- 1. subscriptions: add setup_token
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS setup_token UUID;

CREATE INDEX IF NOT EXISTS idx_subscriptions_setup_token
  ON subscriptions (setup_token)
  WHERE setup_token IS NOT NULL;

-- 2. freebie_brand_strategies: add setup_token for paid-flow idempotency
--    (NULL = generated via legacy freebie form; UUID = generated via paid questionnaire)
ALTER TABLE freebie_brand_strategies
  ADD COLUMN IF NOT EXISTS setup_token UUID;

CREATE INDEX IF NOT EXISTS idx_fbs_setup_token
  ON freebie_brand_strategies (setup_token)
  WHERE setup_token IS NOT NULL;
