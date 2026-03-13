-- Academy entitlement go-live hardening.
-- Adds delivery metadata, course-to-product mapping, and product override integrity.

ALTER TABLE academy_products
  ADD COLUMN IF NOT EXISTS delivery_kind TEXT;

ALTER TABLE academy_products
  ADD COLUMN IF NOT EXISTS access_target TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academy_products_delivery_kind_check'
  ) THEN
    ALTER TABLE academy_products
      ADD CONSTRAINT academy_products_delivery_kind_check
      CHECK (delivery_kind IN ('academy_course', 'direct_private', 'collection'));
  END IF;
END $$;

ALTER TABLE academy_courses
  ADD COLUMN IF NOT EXISTS product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_academy_courses_product_id
  ON academy_courses(product_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academy_courses_product_id_fkey'
  ) THEN
    ALTER TABLE academy_courses
      ADD CONSTRAINT academy_courses_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES academy_products(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academy_product_overrides_product_id_fkey'
  ) THEN
    ALTER TABLE academy_product_overrides
      ADD CONSTRAINT academy_product_overrides_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES academy_products(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE academy_products
SET
  delivery_kind = CASE
    WHEN id IN ('selfie_guide', 'selfie_guide_bundle', 'brand_strategy_pack') THEN 'direct_private'
    ELSE COALESCE(delivery_kind, 'academy_course')
  END,
  access_target = CASE
    WHEN id IN ('selfie_guide', 'selfie_guide_bundle') THEN 'selfie-guide'
    WHEN id = 'brand_strategy_pack' THEN 'brand-strategy'
    ELSE COALESCE(access_target, id)
  END,
  purchasable = CASE
    WHEN id IN ('selfie_guide', 'selfie_guide_bundle', 'brand_strategy_pack') THEN TRUE
    ELSE purchasable
  END,
  updated_at = NOW()
WHERE active = TRUE;

UPDATE academy_courses
SET product_id = CASE
  WHEN LOWER(TRIM(title)) LIKE '%editing masterclass%' THEN 'editing_masterclass'
  WHEN LOWER(TRIM(title)) LIKE '%branded by sselfie%' THEN 'branded_by_sselfie'
  ELSE product_id
END
WHERE product_id IS NULL;
