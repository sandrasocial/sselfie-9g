-- App v3 likeness set: add an explicit three-quarter identity angle.
--
-- The UI now keeps identity references separate from inspiration/style references.
-- `three-quarter` is a single-active identity slot, alongside side-profile and full-body.

ALTER TABLE user_avatar_images DROP CONSTRAINT user_avatar_images_image_type_check;

ALTER TABLE user_avatar_images ADD CONSTRAINT user_avatar_images_image_type_check
  CHECK (image_type IN (
    'selfie', 'lifestyle', 'mirror', 'casual', 'professional',
    'three-quarter', 'side-profile', 'full-body', 'inspiration'
  ));
