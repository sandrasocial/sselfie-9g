-- Add 'maya_plan' to the maya_chats.chat_type CHECK constraint.
--
-- Why: lib/maya/chat-type.ts defines MAYA_CHAT_TYPE_PLAN = 'maya_plan' (the content
-- "Plan" Maya) and creates chats with it, but no migration ever added it to the DB
-- constraint. Postgres rejected every maya_plan chat (error 23514), crashing the legacy
-- /studio Maya screen on load for members (e.g. the "PLAN THIS WEEK" surface). This is the
-- exact "new chat_type without a migration" trap CLAUDE.md warns about.
--
-- Safety: purely ADDITIVE. Live distinct values were maya/pro/videos/feed_planner/
-- prompt_builder/pro-photoshoot only (verified 2026-06-15) — no existing row violates the
-- new constraint, so the ALTER cannot fail on existing data.
--
-- Rollback:
--   ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;
--   ALTER TABLE maya_chats ADD CONSTRAINT maya_chats_chat_type_check
--     CHECK (chat_type IN ('maya', 'pro', 'videos', 'feed_planner', 'prompt_builder', 'pro-photoshoot'));

ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;
ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS chat_type_check;

ALTER TABLE maya_chats
ADD CONSTRAINT maya_chats_chat_type_check
CHECK (chat_type IN ('maya', 'pro', 'videos', 'feed_planner', 'prompt_builder', 'pro-photoshoot', 'maya_plan'));

COMMENT ON COLUMN maya_chats.chat_type IS 'Maya chat surface: maya (Photos), pro (Studio Pro), videos, feed_planner, prompt_builder, pro-photoshoot, maya_plan (content Plan).';
