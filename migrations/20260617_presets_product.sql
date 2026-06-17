CREATE TABLE IF NOT EXISTS preset_collections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  cover_image_url TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  mobile_dng_url TEXT,
  desktop_xmp_url TEXT,
  setup_guide_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preset_collections_published
  ON preset_collections (status, sort_order ASC, published_at DESC);

CREATE TABLE IF NOT EXISTS preset_orders (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  access_token TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('single', 'bundle')),
  collection_slug TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'presets-paid',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preset_orders_token ON preset_orders (access_token);
CREATE INDEX IF NOT EXISTS idx_preset_orders_email ON preset_orders (LOWER(email), status);
CREATE INDEX IF NOT EXISTS idx_preset_orders_session ON preset_orders (stripe_session_id);
