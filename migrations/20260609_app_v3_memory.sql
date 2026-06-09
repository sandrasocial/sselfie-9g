-- MAYA-REBUILD-05 Phase E — Studio 3.0 /app cross-session memory + identity.
-- One row per user: the name they gave their agent, plus what Maya should remember about
-- their brand and style. Injected into every chat session so Maya "already knows your brand".
-- Carries user_id so it is member-ready from day one; the UI stays admin-gated for now.
-- The app also creates this lazily (CREATE TABLE IF NOT EXISTS); this file is the canonical
-- record and the formal production apply. No legacy table touched.

CREATE TABLE IF NOT EXISTS app_v3_memory (
  user_id     text PRIMARY KEY,
  agent_name  text,
  brand_notes text,
  preferences text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
