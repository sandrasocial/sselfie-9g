-- Add brand strategy pack fields to user_personal_brand
ALTER TABLE user_personal_brand
  ADD COLUMN IF NOT EXISTS positioning_statement TEXT;

ALTER TABLE user_personal_brand
  ADD COLUMN IF NOT EXISTS brand_strategy_pack JSONB;

ALTER TABLE user_personal_brand
  ADD COLUMN IF NOT EXISTS brand_strategy_pack_updated_at TIMESTAMPTZ;
