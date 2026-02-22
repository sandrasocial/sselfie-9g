-- ACADEMY-01 foundation tables
-- Creates per-course purchases, per-resource purchases, and user tags for funnel automation.

CREATE TABLE IF NOT EXISTS academy_course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_academy_course_purchases_user_id
  ON academy_course_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_course_purchases_course_id
  ON academy_course_purchases(course_id);

CREATE TABLE IF NOT EXISTS academy_resource_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_academy_resource_purchases_user_id
  ON academy_resource_purchases(user_id);

CREATE TABLE IF NOT EXISTS user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  metadata JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tags_user_id_tag
  ON user_tags(user_id, tag);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id
  ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag
  ON user_tags(tag);
