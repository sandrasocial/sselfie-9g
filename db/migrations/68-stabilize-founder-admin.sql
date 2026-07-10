-- Keep CronLogger.start and the live admin_cron_runs constraint in agreement.
ALTER TABLE admin_cron_runs
  DROP CONSTRAINT IF EXISTS admin_cron_runs_status_check;

ALTER TABLE admin_cron_runs
  ADD CONSTRAINT admin_cron_runs_status_check
  CHECK (status IN ('running', 'ok', 'failed'));

-- Retain automation interactions for audit history, but remove them from the
-- founder reply queue. These are ManyChat/Instagram button callbacks and
-- business auto-responders, not messages that need Sandra.
WITH automation_noise AS (
  SELECT c.id
  FROM ig_conversations c
  JOIN LATERAL (
    SELECT m.content, m.source_payload
    FROM ig_messages m
    WHERE m.conversation_id = c.id
      AND m.from_type = 'contact'
    ORDER BY m.sent_at DESC, m.id DESC
    LIMIT 1
  ) latest ON TRUE
  WHERE c.status IN ('flagged', 'pending')
    AND (
      latest.source_payload ? 'postback'
      OR latest.source_payload #> '{message,quick_reply}' IS NOT NULL
      OR BTRIM(LOWER(REGEXP_REPLACE(latest.content, '[^a-z ]', '', 'g'))) IN (
        'grab it here',
        'yes show me',
        'i followed you'
      )
      OR latest.content ~* '^(hi[,!]?[[:space:]]*)?(thanks|thank you) for (contacting|messaging|reaching out to) us'
      OR latest.content ~* '^we(''ve| have) received your message'
    )
)
UPDATE ig_conversations c
SET status = 'auto_handled',
    flag_reason = 'automation_interaction',
    draft_response = NULL,
    draft_generated_at = NULL,
    updated_at = NOW()
FROM automation_noise n
WHERE c.id = n.id;

UPDATE admin_action_queue a
SET status = 'dismissed',
    acted_at = NOW(),
    review_note = 'Removed from founder queue: automation interaction',
    updated_at = NOW()
WHERE a.kind = 'send_ig_reply'
  AND a.status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM ig_conversations c
    WHERE c.id = NULLIF(a.payload->>'conversationId', '')::int
      AND c.status = 'auto_handled'
      AND c.flag_reason = 'automation_interaction'
  );
