-- Studio Pro Database Schema
-- Creates all tables required for Studio Pro mode

-- User avatar images (persistent identity for Nano Banana Pro)
CREATE TABLE IF NOT EXISTS user_avatar_images (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('selfie', 'lifestyle', 'mirror', 'casual', 'professional')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_avatar_images_user_id ON user_avatar_images(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatar_images_active ON user_avatar_images(user_id, is_active) WHERE is_active = true;

-- Brand assets (products, logos, packaging)
CREATE TABLE IF NOT EXISTS brand_assets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('product', 'logo', 'packaging', 'lifestyle')),
  image_url TEXT NOT NULL,
  name TEXT,
  description TEXT,
  brand_kit_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_assets_user_id ON brand_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_brand_kit ON brand_assets(brand_kit_id) WHERE brand_kit_id IS NOT NULL;

-- Brand kits (colors, fonts, style preferences)
CREATE TABLE IF NOT EXISTS brand_kits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_style TEXT,
  brand_tone TEXT CHECK (brand_tone IN ('bold', 'soft', 'minimalist', 'luxury', 'casual', 'professional')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_kits_default ON brand_kits(user_id, is_default) WHERE is_default = true;

-- Pro preferences (learned from usage)
CREATE TABLE IF NOT EXISTS user_pro_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_tone TEXT,
  preferred_style TEXT,
  preferred_layouts TEXT[],
  last_used_workflows TEXT[],
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pro workflows (tracks what user is building)
CREATE TABLE IF NOT EXISTS pro_workflows (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN (
    'carousel', 'reel-cover', 'ugc-product', 'edit-image', 
    'change-outfit', 'remove-object', 'quote-graphic', 
    'product-mockup', 'reuse-adapt'
  )),
  status TEXT NOT NULL CHECK (status IN ('setup', 'in-progress', 'completed', 'cancelled')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_workflows_user_id ON pro_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_workflows_status ON pro_workflows(user_id, status);

-- Pro generations + revisions (CRITICAL: tracks edits/variants)
CREATE TABLE IF NOT EXISTS pro_generations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id INTEGER REFERENCES pro_workflows(id) ON DELETE SET NULL,
  parent_generation_id INTEGER REFERENCES pro_generations(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL,
  image_urls TEXT[] NOT NULL,
  edit_instruction TEXT,
  prompt_used TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_generations_user_id ON pro_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_generations_workflow ON pro_generations(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pro_generations_parent ON pro_generations(parent_generation_id) WHERE parent_generation_id IS NOT NULL;

-- Pro setup status (tracks onboarding completion)
CREATE TABLE IF NOT EXISTS user_pro_setup (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  has_completed_avatar_setup BOOLEAN DEFAULT false,
  has_completed_brand_setup BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP,
  pro_features_unlocked BOOLEAN DEFAULT false,
  entry_selection TEXT CHECK (entry_selection IN ('just-me', 'me-product', 'editing', 'full-brand')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Constraints and validations
-- Ensure only one default brand kit per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_kits_one_default 
  ON brand_kits(user_id) 
  WHERE is_default = true;

-- Ensure minimum 3 avatar images before Pro generation (enforced in application, not DB)
-- Maximum 8 stored (enforced in application)

COMMENT ON TABLE user_avatar_images IS 'Persistent identity images for Studio Pro. Minimum 3, maximum 8 stored. Only 3-5 passed per generation.';
COMMENT ON TABLE brand_assets IS 'Brand assets (products, logos, packaging) for Pro workflows';
COMMENT ON TABLE brand_kits IS 'Brand styling preferences (colors, fonts, tone)';
COMMENT ON TABLE user_pro_preferences IS 'Learned preferences from Pro usage patterns';
COMMENT ON TABLE pro_workflows IS 'Active Pro workflows (carousel, reel-cover, etc.)';
COMMENT ON TABLE pro_generations IS 'Pro generations with revision tracking. parent_generation_id = NULL means original, non-null means edit/variant';
COMMENT ON TABLE user_pro_setup IS 'Tracks Pro onboarding completion and entry selection';






























