-- Retire the repo-hosted Instagram/ManyChat reply agent.
-- Customer conversation history remains in the ig_* tables, but reply approvals are removed so
-- no old signed link can send after the runtime routes are deleted.

UPDATE ig_conversations
SET status = 'closed',
    flag_reason = 'reply_system_retired',
    draft_response = NULL,
    draft_generated_at = NULL,
    snoozed_until = NULL,
    updated_at = NOW()
WHERE status IN ('pending', 'flagged', 'snoozed');

DELETE FROM admin_action_queue
WHERE kind = 'send_ig_reply';

DO $$
BEGIN
  IF to_regclass('public.twin_approval_queue') IS NOT NULL THEN
    DELETE FROM twin_approval_queue
    WHERE item_type = 'dm_response';
  END IF;
END $$;

ALTER TABLE admin_action_queue
  DROP CONSTRAINT IF EXISTS admin_action_queue_kind_check;

ALTER TABLE admin_action_queue
  ADD CONSTRAINT admin_action_queue_kind_check
  CHECK (kind IN ('send_resend_broadcast'));
