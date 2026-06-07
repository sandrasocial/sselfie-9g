/**
 * Repair Resend broadcast webhook events that were received but not matched to
 * email_logs.
 *
 * This is intentionally narrow:
 * - Does not call Resend
 * - Does not send emails
 * - Does not change audiences, suppressions, or automations
 * - Only creates/updates email_logs rows from already-received Resend webhook events
 *
 * Usage:
 *   DRY_RUN=true pnpm exec tsx scripts/backfill/repair-resend-broadcast-email-logs.ts
 *   pnpm exec tsx scripts/backfill/repair-resend-broadcast-email-logs.ts
 *
 * Optional:
 *   BROADCAST_ID=822569c1-... DAYS=30 DRY_RUN=true pnpm exec tsx scripts/backfill/repair-resend-broadcast-email-logs.ts
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set")
}

const sql = neon(DATABASE_URL)
const DRY_RUN = process.env.DRY_RUN === "true"
const DAYS = Number(process.env.DAYS || "14")
const BROADCAST_ID = process.env.BROADCAST_ID?.trim() || null

async function previewRepair() {
  const rows = await sql`
    WITH raw_events AS (
      SELECT
        id,
        event_type,
        provider_broadcast_id,
        campaign_id,
        COALESCE(NULLIF(campaign_key, ''), LEFT(
          'broadcast-' || LEFT(provider_broadcast_id, 8) ||
          CASE
            WHEN NULLIF(BTRIM(metadata->'event_data'->>'subject'), '') IS NULL THEN ''
            ELSE '-' || REGEXP_REPLACE(
              REGEXP_REPLACE(LOWER(metadata->'event_data'->>'subject'), '[^a-z0-9 ]', '', 'g'),
              '\\s+',
              '-',
              'g'
            )
          END,
          50
        )) AS email_type,
        LOWER(BTRIM(metadata->>'recipient_email')) AS recipient_email,
        COALESCE(
          NULLIF(metadata->>'resend_message_id', ''),
          NULLIF(metadata->'event_data'->>'email_id', ''),
          NULLIF(metadata->'event_data'->>'message_id', '')
        ) AS message_id,
        COALESCE(
          NULLIF(metadata->'event_data'->'open'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->'click'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->'bounce'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->>'created_at', '')
        )::timestamptz AS event_at
      FROM email_events
      WHERE status = 'unmatched'
        AND provider_broadcast_id IS NOT NULL
        AND created_at >= NOW() - (${DAYS}::int * INTERVAL '1 day')
        AND (${BROADCAST_ID}::text IS NULL OR provider_broadcast_id = ${BROADCAST_ID})
    ),
    grouped AS (
      SELECT
        provider_broadcast_id,
        campaign_id,
        email_type,
        recipient_email,
        message_id,
        COUNT(*)::int AS event_count,
        BOOL_OR(event_type = 'email.opened') AS opened,
        BOOL_OR(event_type = 'email.clicked') AS clicked,
        CASE
          WHEN BOOL_OR(event_type = 'email.complained') THEN 'complained'
          WHEN BOOL_OR(event_type = 'email.suppressed') THEN 'suppressed'
          WHEN BOOL_OR(event_type = 'email.failed') THEN 'failed'
          WHEN BOOL_OR(event_type = 'email.bounced') THEN 'bounced'
          WHEN BOOL_OR(event_type IN ('email.delivered', 'email.opened', 'email.clicked')) THEN 'delivered'
          WHEN BOOL_OR(event_type = 'email.delivery_delayed') THEN 'delivery_delayed'
          WHEN BOOL_OR(event_type = 'email.scheduled') THEN 'scheduled'
          ELSE 'sent'
        END AS final_status
      FROM raw_events
      WHERE recipient_email IS NOT NULL
        AND recipient_email != ''
        AND email_type IS NOT NULL
        AND email_type != ''
      GROUP BY provider_broadcast_id, campaign_id, email_type, recipient_email, message_id
    ),
    classified AS (
      SELECT
        grouped.*,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM email_logs el
            WHERE grouped.message_id IS NOT NULL
              AND el.resend_message_id = grouped.message_id
          ) THEN 'update_by_message'
          WHEN EXISTS (
            SELECT 1 FROM email_logs el
            WHERE LOWER(BTRIM(el.user_email)) = grouped.recipient_email
              AND el.email_type = grouped.email_type
              AND el.sent_at > NOW() - INTERVAL '30 days'
          ) THEN 'update_by_recipient'
          ELSE 'insert'
        END AS action
      FROM grouped
    )
    SELECT
      action,
      provider_broadcast_id,
      final_status,
      COUNT(*)::int AS recipient_logs,
      SUM(event_count)::int AS source_events,
      COUNT(*) FILTER (WHERE opened)::int AS opened_recipients,
      COUNT(*) FILTER (WHERE clicked)::int AS clicked_recipients
    FROM classified
    GROUP BY action, provider_broadcast_id, final_status
    ORDER BY provider_broadcast_id, action, final_status
  `

  return rows
}

async function applyRepair() {
  const rows = await sql`
    WITH raw_events AS (
      SELECT
        id,
        event_type,
        provider_broadcast_id,
        campaign_id,
        COALESCE(NULLIF(campaign_key, ''), LEFT(
          'broadcast-' || LEFT(provider_broadcast_id, 8) ||
          CASE
            WHEN NULLIF(BTRIM(metadata->'event_data'->>'subject'), '') IS NULL THEN ''
            ELSE '-' || REGEXP_REPLACE(
              REGEXP_REPLACE(LOWER(metadata->'event_data'->>'subject'), '[^a-z0-9 ]', '', 'g'),
              '\\s+',
              '-',
              'g'
            )
          END,
          50
        )) AS email_type,
        LOWER(BTRIM(metadata->>'recipient_email')) AS recipient_email,
        COALESCE(
          NULLIF(metadata->>'resend_message_id', ''),
          NULLIF(metadata->'event_data'->>'email_id', ''),
          NULLIF(metadata->'event_data'->>'message_id', '')
        ) AS message_id,
        COALESCE(
          NULLIF(metadata->'event_data'->'open'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->'click'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->'bounce'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->>'timestamp', ''),
          NULLIF(metadata->'event_data'->>'created_at', '')
        )::timestamptz AS event_at,
        CASE
          WHEN event_type = 'email.bounced' THEN 'Bounced: ' || COALESCE(metadata->'event_data'->>'bounce_type', metadata->'event_data'->>'type', 'unknown') || ' - ' || COALESCE(metadata->'event_data'->>'bounce_reason', metadata->'event_data'->>'reason', metadata->'event_data'->>'message', 'Unknown bounce reason')
          WHEN event_type = 'email.complained' THEN 'User marked email as spam'
          WHEN event_type = 'email.failed' THEN COALESCE(metadata->'event_data'->>'reason', metadata->'event_data'->>'message', metadata->'event_data'->>'error', 'Resend marked email as failed')
          WHEN event_type = 'email.delivery_delayed' THEN COALESCE(metadata->'event_data'->>'reason', metadata->'event_data'->>'message', 'Delivery delayed')
          WHEN event_type = 'email.suppressed' THEN COALESCE(metadata->'event_data'->>'reason', metadata->'event_data'->>'message', 'Recipient suppressed by Resend')
          ELSE NULL
        END AS error_message
      FROM email_events
      WHERE status = 'unmatched'
        AND provider_broadcast_id IS NOT NULL
        AND created_at >= NOW() - (${DAYS}::int * INTERVAL '1 day')
        AND (${BROADCAST_ID}::text IS NULL OR provider_broadcast_id = ${BROADCAST_ID})
    ),
    grouped AS (
      SELECT
        provider_broadcast_id,
        campaign_id,
        email_type,
        recipient_email,
        message_id,
        ARRAY_AGG(id) AS event_ids,
        MIN(event_at) AS first_event_at,
        COALESCE(MIN(event_at) FILTER (WHERE event_type = 'email.sent'), MIN(event_at)) AS sent_at,
        MIN(event_at) FILTER (WHERE event_type = 'email.opened') AS opened_at,
        MIN(event_at) FILTER (WHERE event_type = 'email.clicked') AS clicked_at,
        (ARRAY_REMOVE(ARRAY_AGG(error_message), NULL))[1] AS error_message,
        CASE
          WHEN BOOL_OR(event_type = 'email.complained') THEN 'complained'
          WHEN BOOL_OR(event_type = 'email.suppressed') THEN 'suppressed'
          WHEN BOOL_OR(event_type = 'email.failed') THEN 'failed'
          WHEN BOOL_OR(event_type = 'email.bounced') THEN 'bounced'
          WHEN BOOL_OR(event_type IN ('email.delivered', 'email.opened', 'email.clicked')) THEN 'delivered'
          WHEN BOOL_OR(event_type = 'email.delivery_delayed') THEN 'delivery_delayed'
          WHEN BOOL_OR(event_type = 'email.scheduled') THEN 'scheduled'
          ELSE 'sent'
        END AS final_status
      FROM raw_events
      WHERE recipient_email IS NOT NULL
        AND recipient_email != ''
        AND email_type IS NOT NULL
        AND email_type != ''
      GROUP BY provider_broadcast_id, campaign_id, email_type, recipient_email, message_id
    ),
    updated_by_message AS (
      UPDATE email_logs el
      SET
        status = CASE
          WHEN el.status IN ('bounced', 'complained', 'failed', 'suppressed')
            AND grouped.final_status IN ('sent', 'delivered', 'scheduled', 'delivery_delayed')
          THEN el.status
          WHEN el.status = 'delivered'
            AND grouped.final_status IN ('sent', 'scheduled', 'delivery_delayed')
          THEN el.status
          ELSE COALESCE(grouped.final_status, el.status)
        END,
        campaign_id = COALESCE(grouped.campaign_id, el.campaign_id),
        error_message = COALESCE(grouped.error_message, el.error_message),
        opened = CASE WHEN grouped.opened_at IS NULL THEN el.opened ELSE true END,
        opened_at = COALESCE(el.opened_at, grouped.opened_at),
        clicked = CASE WHEN grouped.clicked_at IS NULL THEN el.clicked ELSE true END,
        clicked_at = COALESCE(el.clicked_at, grouped.clicked_at)
      FROM grouped
      WHERE grouped.message_id IS NOT NULL
        AND el.resend_message_id = grouped.message_id
      RETURNING grouped.event_ids, grouped.email_type
    ),
    remaining_after_message AS (
      SELECT grouped.*
      FROM grouped
      WHERE NOT EXISTS (
        SELECT 1 FROM updated_by_message ubm
        WHERE grouped.event_ids && ubm.event_ids
      )
    ),
    recipient_matches AS (
      SELECT DISTINCT ON (remaining_after_message.event_ids)
        remaining_after_message.*,
        el.id AS email_log_id
      FROM remaining_after_message
      INNER JOIN email_logs el
        ON LOWER(BTRIM(el.user_email)) = remaining_after_message.recipient_email
       AND el.email_type = remaining_after_message.email_type
       AND el.sent_at > NOW() - INTERVAL '30 days'
      ORDER BY remaining_after_message.event_ids, el.sent_at DESC
    ),
    updated_by_recipient AS (
      UPDATE email_logs el
      SET
        resend_message_id = COALESCE(recipient_matches.message_id, el.resend_message_id),
        status = CASE
          WHEN el.status IN ('bounced', 'complained', 'failed', 'suppressed')
            AND recipient_matches.final_status IN ('sent', 'delivered', 'scheduled', 'delivery_delayed')
          THEN el.status
          WHEN el.status = 'delivered'
            AND recipient_matches.final_status IN ('sent', 'scheduled', 'delivery_delayed')
          THEN el.status
          ELSE COALESCE(recipient_matches.final_status, el.status)
        END,
        campaign_id = COALESCE(recipient_matches.campaign_id, el.campaign_id),
        error_message = COALESCE(recipient_matches.error_message, el.error_message),
        opened = CASE WHEN recipient_matches.opened_at IS NULL THEN el.opened ELSE true END,
        opened_at = COALESCE(el.opened_at, recipient_matches.opened_at),
        clicked = CASE WHEN recipient_matches.clicked_at IS NULL THEN el.clicked ELSE true END,
        clicked_at = COALESCE(el.clicked_at, recipient_matches.clicked_at)
      FROM recipient_matches
      WHERE el.id = recipient_matches.email_log_id
      RETURNING recipient_matches.event_ids, recipient_matches.email_type
    ),
    remaining_after_updates AS (
      SELECT remaining_after_message.*
      FROM remaining_after_message
      WHERE NOT EXISTS (
        SELECT 1 FROM updated_by_recipient ubr
        WHERE remaining_after_message.event_ids && ubr.event_ids
      )
    ),
    inserted AS (
      INSERT INTO email_logs (
        user_email,
        email_type,
        resend_message_id,
        status,
        error_message,
        sent_at,
        timestamp,
        campaign_id,
        opened,
        opened_at,
        clicked,
        clicked_at
      )
      SELECT
        recipient_email,
        email_type,
        message_id,
        final_status,
        error_message,
        sent_at,
        sent_at,
        campaign_id,
        opened_at IS NOT NULL,
        opened_at,
        clicked_at IS NOT NULL,
        clicked_at
      FROM remaining_after_updates
      RETURNING id
    ),
    processed_events AS (
      SELECT UNNEST(event_ids) AS event_id, email_type FROM updated_by_message
      UNION ALL
      SELECT UNNEST(event_ids) AS event_id, email_type FROM updated_by_recipient
      UNION ALL
      SELECT UNNEST(event_ids) AS event_id, email_type FROM remaining_after_updates
    ),
    marked AS (
      UPDATE email_events ee
      SET
        status = 'processed',
        campaign_key = COALESCE(NULLIF(ee.campaign_key, ''), processed_events.email_type),
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          repaired_at: new Date().toISOString(),
          repaired_by: "repair-resend-broadcast-email-logs",
        })}::jsonb
      FROM processed_events
      WHERE ee.id = processed_events.event_id
      RETURNING ee.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM grouped) AS grouped_logs,
      (SELECT COUNT(*)::int FROM updated_by_message) AS updated_by_message,
      (SELECT COUNT(*)::int FROM updated_by_recipient) AS updated_by_recipient,
      (SELECT COUNT(*)::int FROM inserted) AS inserted,
      (SELECT COUNT(*)::int FROM marked) AS events_marked_processed
  `

  return rows?.[0] || null
}

async function main() {
  if (DRY_RUN) {
    const rows = await previewRepair()
    console.log(JSON.stringify({ dryRun: true, days: DAYS, broadcastId: BROADCAST_ID, rows }, null, 2))
    return
  }

  const result = await applyRepair()
  console.log(JSON.stringify({ dryRun: false, days: DAYS, broadcastId: BROADCAST_ID, result }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
