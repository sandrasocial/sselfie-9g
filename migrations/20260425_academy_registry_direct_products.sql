-- Harden the Academy registry for direct commercial products.
-- These rows are required by user_entitlements.product_id FK before webhook grants run.

INSERT INTO academy_products (
  id,
  slug,
  title,
  type,
  membership_included,
  purchasable,
  stripe_price_id,
  active,
  sort_order,
  delivery_kind,
  access_target
)
VALUES
  (
    'starter_kit',
    'starter-kit',
    'Starter Kit',
    'bundle',
    FALSE,
    TRUE,
    NULLIF(current_setting('app.stripe_price_starter_kit', TRUE), ''),
    TRUE,
    65,
    'direct_private',
    'starter-kit'
  ),
  (
    'masterclass',
    'masterclass',
    'Selfie Masterclass',
    'bundle',
    FALSE,
    TRUE,
    NULLIF(current_setting('app.stripe_price_masterclass', TRUE), ''),
    TRUE,
    66,
    'collection',
    'masterclass'
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  membership_included = EXCLUDED.membership_included,
  purchasable = EXCLUDED.purchasable,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  delivery_kind = EXCLUDED.delivery_kind,
  access_target = EXCLUDED.access_target,
  updated_at = NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_entitlements_product_id_fkey'
  ) THEN
    ALTER TABLE user_entitlements
      DROP CONSTRAINT user_entitlements_product_id_fkey;
  END IF;

  ALTER TABLE user_entitlements
    ADD CONSTRAINT user_entitlements_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES academy_products(id) ON DELETE RESTRICT;
END $$;

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
  AND s.product_type IN ('starter_kit', 'masterclass')
ON CONFLICT (user_id, product_id, source, source_ref) DO NOTHING;
