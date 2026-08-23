BEGIN;

CREATE TABLE IF NOT EXISTS app_v3_maya_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL CHECK (
    char_length(request_id) BETWEEN 12 AND 96
    AND request_id ~ '^[A-Za-z0-9_-]+$'
  ),
  credit_reference TEXT NOT NULL UNIQUE CHECK (
    char_length(credit_reference) BETWEEN 1 AND 256
  ),
  source_image_id INTEGER NOT NULL REFERENCES ai_images(id) ON DELETE RESTRICT,
  root_image_id INTEGER NOT NULL REFERENCES ai_images(id) ON DELETE RESTRICT,
  instruction_digest TEXT NOT NULL CHECK (instruction_digest ~ '^sha256:[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'charged', 'succeeded', 'failed')),
  credit_state TEXT NOT NULL DEFAULT 'not_charged'
    CHECK (credit_state IN ('not_charged', 'charged', 'refunded', 'refund_pending')),
  result_image_id INTEGER REFERENCES ai_images(id) ON DELETE RESTRICT,
  failure_code TEXT CHECK (failure_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT app_v3_maya_edit_requests_user_request_key UNIQUE (user_id, request_id),
  CONSTRAINT app_v3_maya_edit_requests_state_check CHECK (
    (status = 'reserved' AND credit_state = 'not_charged'
      AND result_image_id IS NULL AND failure_code IS NULL AND completed_at IS NULL)
    OR
    (status = 'charged' AND credit_state = 'charged'
      AND result_image_id IS NULL AND failure_code IS NULL AND completed_at IS NULL)
    OR
    (status = 'succeeded' AND credit_state = 'charged'
      AND result_image_id IS NOT NULL AND failure_code IS NULL AND completed_at IS NOT NULL)
    OR
    (status = 'failed' AND credit_state IN ('not_charged', 'refunded', 'refund_pending')
      AND result_image_id IS NULL AND failure_code IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE OR REPLACE FUNCTION enforce_app_v3_maya_edit_request_ownership() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM ai_images source
    JOIN ai_images root
      ON root.id = NEW.root_image_id
     AND root.user_id = NEW.user_id
    WHERE source.id = NEW.source_image_id
      AND source.user_id = NEW.user_id
      AND (source.id = root.id OR source.variant_of = root.id)
  ) THEN
    RAISE EXCEPTION 'Maya edit request source and root must belong to the same user and lineage';
  END IF;

  IF NEW.result_image_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM ai_images result
    WHERE result.id = NEW.result_image_id
      AND result.user_id = NEW.user_id
      AND result.variant_of = NEW.root_image_id
  ) THEN
    RAISE EXCEPTION 'Maya edit result must belong to the same user and lineage';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS app_v3_maya_edit_requests_enforce_ownership
  ON app_v3_maya_edit_requests;
CREATE TRIGGER app_v3_maya_edit_requests_enforce_ownership
  BEFORE INSERT OR UPDATE ON app_v3_maya_edit_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_app_v3_maya_edit_request_ownership();

CREATE INDEX IF NOT EXISTS app_v3_maya_edit_requests_user_status_idx
  ON app_v3_maya_edit_requests (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_v3_maya_edit_requests_result_idx
  ON app_v3_maya_edit_requests (result_image_id)
  WHERE result_image_id IS NOT NULL;

COMMIT;
