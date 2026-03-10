-- Phase 1 foundation: unify Maya feed chat_type values and document canonical image storage.
-- Preview-first migration. Run on preview, verify, then production.

BEGIN;

ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;
ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS chat_type_check;

UPDATE maya_chats
SET chat_type = 'feed_planner'
WHERE LOWER(COALESCE(chat_type, '')) IN ('feed_planner', 'feed-planner', 'feed_designer', 'feed-designer');

ALTER TABLE maya_chats
ADD CONSTRAINT maya_chats_chat_type_check
CHECK (chat_type IN ('maya', 'pro', 'feed_planner', 'prompt_builder', 'pro-photoshoot'));

COMMENT ON COLUMN maya_chats.chat_type IS 'Canonical Maya chat type. feed_planner is the unified persisted value; older feed-planner/feed_designer variants are legacy aliases only.';

COMMENT ON TABLE ai_images IS 'Canonical gallery store for completed Maya, Pro, feed, and reconciled Classic images.';
COMMENT ON TABLE generated_images IS 'Legacy Classic generation staging table. New user-facing gallery reads should prefer ai_images and only fall back here for unreconciled rows.';

COMMIT;
