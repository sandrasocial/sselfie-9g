-- Canonical Academy registry + entitlement layer.
-- Safe/idempotent migration: additive only, no destructive operations.

CREATE TABLE IF NOT EXISTS academy_products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('course', 'pack', 'template', 'resource', 'bundle')),
  membership_included BOOLEAN NOT NULL DEFAULT TRUE,
  purchasable BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_products_active
  ON academy_products(active);

CREATE TABLE IF NOT EXISTS academy_product_overrides (
  product_id TEXT PRIMARY KEY,
  name TEXT,
  tagline TEXT,
  description TEXT,
  price_cents INTEGER,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES academy_products(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('purchase', 'membership', 'admin_grant', 'migration_backfill')),
  source_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_entitlements_unique_source
  ON user_entitlements(user_id, product_id, source, source_ref);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_status
  ON user_entitlements(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_product_status
  ON user_entitlements(product_id, status);

ALTER TABLE user_entitlements
  ALTER COLUMN source_ref SET DEFAULT '';

UPDATE user_entitlements
SET source_ref = ''
WHERE source_ref IS NULL;

ALTER TABLE user_entitlements
  ALTER COLUMN source_ref SET NOT NULL;

INSERT INTO academy_products (id, slug, title, type, membership_included, purchasable, stripe_price_id, active, sort_order)
VALUES
  ('what_to_say', 'what-to-say', 'What To Say', 'course', TRUE, FALSE, NULL, TRUE, 10),
  ('show_up', 'show-up', 'Show Up', 'course', TRUE, FALSE, NULL, TRUE, 20),
  ('get_paid', 'get-paid', 'Get Paid', 'course', TRUE, FALSE, NULL, TRUE, 30),
  ('ai_photo_prompts', 'ai-photo-prompts', 'AI Photo Prompt Pack', 'pack', TRUE, FALSE, NULL, TRUE, 40),
  ('editing_masterclass', 'editing-masterclass', 'Editing Masterclass', 'course', TRUE, FALSE, NULL, TRUE, 50),
  ('branded_by_sselfie', 'branded-by-sselfie', 'Branded by SSELFIE', 'course', TRUE, FALSE, NULL, TRUE, 60),
  ('selfie_guide', 'selfie-guide', 'Selfie Guide', 'course', TRUE, FALSE, NULL, TRUE, 70),
  ('selfie_guide_bundle', 'selfie-guide-bundle', 'Selfie Guide Bundle', 'bundle', TRUE, FALSE, NULL, TRUE, 80),
  ('brand_strategy_pack', 'brand-strategy-pack', 'Brand Strategy Pack', 'pack', TRUE, FALSE, NULL, TRUE, 90)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  membership_included = EXCLUDED.membership_included,
  purchasable = EXCLUDED.purchasable,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Backfill explicit entitlements from legacy academy purchase table.
INSERT INTO user_entitlements (
  user_id,
  product_id,
  source,
  source_ref,
  status,
  metadata,
  valid_from
)
SELECT
  acp.user_id,
  acp.course_id,
  'migration_backfill',
  COALESCE(acp.stripe_payment_intent_id, acp.id::text),
  'active',
  jsonb_build_object('backfill_from', 'academy_course_purchases'),
  COALESCE(acp.purchased_at, NOW())
FROM academy_course_purchases acp
JOIN academy_products ap ON ap.id = acp.course_id
WHERE acp.status = 'active'
ON CONFLICT (user_id, product_id, source, source_ref) DO NOTHING;

-- Backfill one-time product ownership from subscriptions rows.
INSERT INTO user_entitlements (
  user_id,
  product_id,
  source,
  source_ref,
  status,
  metadata,
  valid_from
)
SELECT
  s.user_id,
  s.product_type,
  'migration_backfill',
  COALESCE(s.stripe_subscription_id, s.id::text),
  'active',
  jsonb_build_object('backfill_from', 'subscriptions'),
  COALESCE(s.created_at, NOW())
FROM subscriptions s
JOIN academy_products ap ON ap.id = s.product_type
WHERE s.status = 'active'
  AND s.product_type IN ('selfie_guide', 'selfie_guide_bundle', 'brand_strategy_pack')
ON CONFLICT (user_id, product_id, source, source_ref) DO NOTHING;
