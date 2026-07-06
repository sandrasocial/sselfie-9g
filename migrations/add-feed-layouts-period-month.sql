-- Migration: Add period_month to feed_layouts
-- Purpose: Feed Planner Phase 2b (Maya auto-draft). Lets the auto-draft route answer
-- "does a plan already exist for this user this month?" without guessing from created_at.
-- Nullable, additive, no backfill: existing rows stay NULL and are ignored by the
-- auto-draft guard (they predate this feature and must never be touched by it).

ALTER TABLE feed_layouts
  ADD COLUMN IF NOT EXISTS period_month VARCHAR(7);

COMMENT ON COLUMN feed_layouts.period_month IS
  'YYYY-MM the plan was drafted for (e.g. 2026-07). Set only by the Maya auto-draft flow, NULL for legacy/manual plans.';

CREATE INDEX IF NOT EXISTS idx_feed_layouts_user_period_month
  ON feed_layouts(user_id, period_month)
  WHERE period_month IS NOT NULL;
