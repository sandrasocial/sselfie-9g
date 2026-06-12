-- Migration: 59-extend-user-avatar-images-image-type-for-app-v3-slots
-- Created: 2026-06-12
-- Author: Claude Code
--
-- SUITE-UX-02: App v3 optional reference uploads (side profile, full body,
-- inspiration/vibe) must persist across page refresh like the main selfie.
-- They are stored in user_avatar_images with their own image_type so the
-- restore-on-open flow can tell them apart from face selfies (today every
-- upload is forced to 'selfie', which can restore a vibe image as the face).

-- ROLLBACK (complete this before running in production):
-- BEGIN;
-- UPDATE user_avatar_images SET image_type = 'selfie'
--   WHERE image_type IN ('side-profile', 'full-body', 'inspiration');
-- ALTER TABLE user_avatar_images DROP CONSTRAINT user_avatar_images_image_type_check;
-- ALTER TABLE user_avatar_images ADD CONSTRAINT user_avatar_images_image_type_check
--   CHECK (image_type IN ('selfie', 'lifestyle', 'mirror', 'casual', 'professional'));
-- COMMIT;

BEGIN;

ALTER TABLE user_avatar_images DROP CONSTRAINT user_avatar_images_image_type_check;

ALTER TABLE user_avatar_images ADD CONSTRAINT user_avatar_images_image_type_check
  CHECK (image_type IN (
    'selfie', 'lifestyle', 'mirror', 'casual', 'professional',
    'side-profile', 'full-body', 'inspiration'
  ));

COMMIT;
