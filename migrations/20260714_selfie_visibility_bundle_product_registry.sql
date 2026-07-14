-- Register the temporary One Selfie Visibility Bundle as an ownership marker.
-- The row is intentionally hidden from the Academy catalogue; it exists so the
-- strict user_entitlements foreign key can safely record paid bundle ownership.

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
  'selfie_visibility_bundle',
  'one-selfie-visibility-bundle',
  'One Selfie Visibility Bundle',
  'bundle',
  FALSE,
  FALSE,
  NULL,
  FALSE,
  69,
  'direct_private',
  'one-selfie'
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
