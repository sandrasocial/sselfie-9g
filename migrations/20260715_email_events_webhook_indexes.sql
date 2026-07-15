-- 2026-07-15 production incident: the Resend webhook handler runs two lookups per
-- delivered/opened/clicked event (app/api/webhooks/resend/route.ts):
--   1. resolveCampaignKeyByBroadcastId: WHERE provider_broadcast_id = $1 ... ORDER BY created_at DESC
--   2. persistEmailEvent dedup:         WHERE metadata->>'resend_event_id' = $1
-- Neither column was indexed, so every webhook full-scanned email_events (441K rows / 869 MB).
-- The midday last-call broadcast produced ~11,000 webhook events in one hour; the scans piled up
-- at 45s+ each, exhausted the Neon pooler (max_client_conn), and starved the whole app.
--
-- Both indexes were created directly against production during the incident (14:20 CEST) with
-- CREATE INDEX CONCURRENTLY; this file records them for schema history and other environments.
-- Note: CONCURRENTLY cannot run inside a transaction block — run these statements standalone.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_provider_broadcast
  ON email_events (provider_broadcast_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_resend_event_id
  ON email_events ((metadata->>'resend_event_id'));
