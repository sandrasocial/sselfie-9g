-- Preserve reel, ManyChat, and CTA context on freebie opt-ins.
-- This lets subscriber cohorts be tied back to revenue later.

ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS checkout_source TEXT;
ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS cta_keyword TEXT;
ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS entry_post_slug TEXT;
ALTER TABLE freebie_subscribers ADD COLUMN IF NOT EXISTS landing_path TEXT;

CREATE INDEX IF NOT EXISTS freebie_subscribers_cta_keyword_idx
  ON freebie_subscribers (cta_keyword, created_at DESC);

CREATE INDEX IF NOT EXISTS freebie_subscribers_entry_post_slug_idx
  ON freebie_subscribers (entry_post_slug, created_at DESC);
