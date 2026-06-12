-- Migration: 60-app-v3-style-examples
-- Created: 2026-06-12
-- Author: Claude Code
--
-- SUITE-UX-02 slice 6: one admin-curated example image per text-overlay style /
-- carousel design system, shown on the inline style picker cards in member Maya chat.
-- Style definitions live in code (lib/app-v3/maya/overlay-styles.ts and
-- carousel-design-systems.ts); this table only holds the example imagery.
-- Canonical record for lib/app-v3/maya/style-example-store.ts's lazy ensureTable().

-- ROLLBACK (complete this before running in production):
-- DROP TABLE IF EXISTS app_v3_style_examples;

BEGIN;

CREATE TABLE IF NOT EXISTS app_v3_style_examples (
  style_id   text PRIMARY KEY,
  image_url  text NOT NULL,
  source     text NOT NULL DEFAULT 'upload',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
