CREATE TABLE IF NOT EXISTS academy_product_overrides (
  product_id TEXT PRIMARY KEY,
  name TEXT,
  tagline TEXT,
  description TEXT,
  price_cents INTEGER,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
