ALTER TABLE app_v3_memory ADD COLUMN IF NOT EXISTS facts jsonb NOT NULL DEFAULT '{}'::jsonb;
