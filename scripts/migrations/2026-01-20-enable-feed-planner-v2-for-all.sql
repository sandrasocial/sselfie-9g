-- Migration: Enable Feed Planner V2 for all users
-- Purpose: Set users.use_feed_planner_v2 = true for every user
-- Rollback: UPDATE users SET use_feed_planner_v2 = false WHERE use_feed_planner_v2 = true;

BEGIN;

UPDATE users
SET use_feed_planner_v2 = true
WHERE use_feed_planner_v2 IS DISTINCT FROM true;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('2026-01-20-enable-feed-planner-v2-for-all')
ON CONFLICT (version) DO NOTHING;

COMMIT;
