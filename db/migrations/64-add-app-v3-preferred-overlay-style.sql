-- App V3: remember the member's preferred baked-text overlay style.
-- Structured field so text style selection can be deterministic, not buried in notes.

ALTER TABLE app_v3_memory
  ADD COLUMN IF NOT EXISTS preferred_overlay_style text;

COMMENT ON COLUMN app_v3_memory.preferred_overlay_style
  IS 'Preferred App V3 baked text overlay style id, e.g. editorial-serif-center.';
