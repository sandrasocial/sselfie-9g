-- Canonical, editable member answers. Generated PDF snapshots remain unchanged.
CREATE TABLE IF NOT EXISTS academy_workbook_answers (
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL CHECK (product_id IN ('what_to_say', 'show_up', 'get_paid')),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(answers) = 'array'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- An earlier prototype already created this table with object-shaped answers.
-- Preserve those records; the reader supports both formats. Only add the revision guard.
ALTER TABLE academy_workbook_answers ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
