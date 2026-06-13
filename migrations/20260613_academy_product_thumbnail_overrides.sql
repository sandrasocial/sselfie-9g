-- Phase 7 library/front-door product covers.
-- Safe/idempotent: lets Admin Academy override the image used by /academy and /app Library.

ALTER TABLE academy_product_overrides
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
