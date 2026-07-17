-- Maya Create visual studio: persist complete creative-task workspaces in the existing
-- app_v3_chats table. Additive only; existing conversations and messages remain intact.

ALTER TABLE app_v3_chats
  ADD COLUMN IF NOT EXISTS workspace jsonb,
  ADD COLUMN IF NOT EXISTS task_status text NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS output_count integer NOT NULL DEFAULT 0;

ALTER TABLE app_v3_chats
  DROP CONSTRAINT IF EXISTS app_v3_chats_task_status_check;

ALTER TABLE app_v3_chats
  ADD CONSTRAINT app_v3_chats_task_status_check
  CHECK (task_status IN ('planning', 'creating', 'ready'));

ALTER TABLE app_v3_chats
  DROP CONSTRAINT IF EXISTS app_v3_chats_output_count_check;

ALTER TABLE app_v3_chats
  ADD CONSTRAINT app_v3_chats_output_count_check
  CHECK (output_count BETWEEN 0 AND 12);
