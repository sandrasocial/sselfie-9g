import "server-only"

import { getDb } from "@/lib/db/client"

let ensured = false

export async function ensureAnalyticsSchema(): Promise<void> {
  if (ensured) return
  ensured = true

  const sql = getDb()

  // Lightweight internal analytics store.
  // This is intentionally minimal and append-only to avoid breaking production flows.
  await sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
      anon_id TEXT,
      event_name TEXT NOT NULL,
      path TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  await sql`CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_event_created_at_idx ON analytics_events (event_name, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_user_created_at_idx ON analytics_events (user_id, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_path_created_at_idx ON analytics_events (path, created_at DESC) WHERE path IS NOT NULL;`

  // 2026-07-15: the first 360 suite intent events predated intent_label. Backfill from their
  // already-stored format/confidence once so the cohort remains queryable alongside new events.
  await sql`
    UPDATE analytics_events
    SET properties = jsonb_set(
      properties,
      '{intent_label}',
      to_jsonb(
        COALESCE(
          NULLIF(properties->>'format', ''),
          CASE WHEN properties->>'confidence' = 'needs_clarify' THEN 'needs_clarify' END,
          'unclassified'
        )
      ),
      TRUE
    )
    WHERE event_name = 'suite_intent_detected'
      AND NOT (properties ? 'intent_label')
  `

  await sql`
    CREATE TABLE IF NOT EXISTS analytics_reports (
      id BIGSERIAL PRIMARY KEY,
      report_type TEXT NOT NULL,
      period_start TIMESTAMPTZ NOT NULL,
      period_end TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (report_type, period_start, period_end)
    );
  `

  await sql`CREATE INDEX IF NOT EXISTS analytics_reports_type_created_at_idx ON analytics_reports (report_type, created_at DESC);`

  await sql`
    CREATE TABLE IF NOT EXISTS cohort_delivery_load_logs (
      id BIGSERIAL PRIMARY KEY,
      session_date DATE NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('live', 'async')),
      hours NUMERIC(6,2) NOT NULL CHECK (hours > 0),
      cohort_label TEXT,
      notes TEXT,
      logged_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await sql`CREATE INDEX IF NOT EXISTS cohort_delivery_load_logs_session_idx ON cohort_delivery_load_logs (session_date DESC);`
  await sql`CREATE INDEX IF NOT EXISTS cohort_delivery_load_logs_mode_idx ON cohort_delivery_load_logs (mode, session_date DESC);`
}
