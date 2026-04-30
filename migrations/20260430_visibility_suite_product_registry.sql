-- Add the Visibility To Paid Suite to the Academy product registry so
-- Stripe webhooks can grant the bundle entitlement safely.

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
VALUES (
  'visibility_suite',
  'visibility-suite',
  'Visibility To Paid Suite',
  'bundle',
  TRUE,
  TRUE,
  'price_1TRshJEVJvME7vkwK55rwjA0',
  TRUE,
  5,
  'collection',
  'visibility-suite'
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  type = EXCLUDED.type,
  membership_included = EXCLUDED.membership_included,
  purchasable = EXCLUDED.purchasable,
  stripe_price_id = EXCLUDED.stripe_price_id,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  delivery_kind = EXCLUDED.delivery_kind,
  access_target = EXCLUDED.access_target,
  updated_at = NOW();
