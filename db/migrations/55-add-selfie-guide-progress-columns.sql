-- Migration: 55-add-selfie-guide-progress-columns
-- Created: 2026-04-12
-- Author: Claude Code
-- Purpose: Track selfie guide reading progress and 7-day challenge completion
--          per freebie subscriber. Used by the guide experience component to
--          restore progress on return visits and by the email nurture sequence
--          to trigger milestone-based emails.

-- ROLLBACK:
-- ALTER TABLE freebie_subscribers
--   DROP COLUMN IF EXISTS guide_chapter_index,
--   DROP COLUMN IF EXISTS guide_challenge_day,
--   DROP COLUMN IF EXISTS guide_completed_at,
--   DROP COLUMN IF EXISTS guide_challenge_completed_at;
-- DROP INDEX IF EXISTS idx_freebie_subscribers_guide_completed;

BEGIN;

ALTER TABLE freebie_subscribers
  ADD COLUMN IF NOT EXISTS guide_chapter_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guide_challenge_day integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guide_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS guide_challenge_completed_at timestamptz;

-- Partial index: only index rows where guide was completed (keeps index small)
CREATE INDEX IF NOT EXISTS idx_freebie_subscribers_guide_completed
  ON freebie_subscribers (guide_completed_at)
  WHERE guide_completed_at IS NOT NULL;

COMMIT;
