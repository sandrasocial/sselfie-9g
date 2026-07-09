-- TEMP diagnostic columns for the Instagram inbound-capture investigation.
-- Every value logged here is HMAC output or a length, never the secret itself.
-- Drop alongside ig_webhook_hits once the mismatch is diagnosed and fixed.
ALTER TABLE ig_webhook_hits
  ADD COLUMN IF NOT EXISTS app_secret_len INTEGER,
  ADD COLUMN IF NOT EXISTS login_app_secret_len INTEGER,
  ADD COLUMN IF NOT EXISTS received_signature TEXT,
  ADD COLUMN IF NOT EXISTS computed_with_app_secret TEXT,
  ADD COLUMN IF NOT EXISTS computed_with_login_secret TEXT;
