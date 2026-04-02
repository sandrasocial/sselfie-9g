import { sql } from "@/lib/db/client"
import { requireResendClient } from "@/lib/resend/client"

const RATE_LIMIT_DELAY_MS = 600

export async function seedAudienceBackfillQueue() {
  await sql`
    INSERT INTO resend_audience_backfill_queue (email, first_name)
    SELECT DISTINCT ON (email) email, first_name
    FROM (
      SELECT
        LOWER(email) as email,
        NULLIF(split_part(name, ' ', 1), '') as first_name
      FROM blueprint_subscribers
      WHERE email IS NOT NULL AND email != ''
      UNION ALL
      SELECT
        LOWER(email) as email,
        NULLIF(split_part(name, ' ', 1), '') as first_name
      FROM freebie_subscribers
      WHERE email IS NOT NULL AND email != ''
      UNION ALL
      SELECT
        LOWER(email) as email,
        NULLIF(split_part(display_name, ' ', 1), '') as first_name
      FROM users
      WHERE email IS NOT NULL AND email != ''
    ) data
    ON CONFLICT (email) DO NOTHING
  `
}

export async function processAudienceBackfillBatch(batchSize = 40) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) {
    return { processed: 0, synced: 0, failed: 0 }
  }

  const resend = requireResendClient()

  const [{ count }] = await sql`
    SELECT COUNT(*)::int as count
    FROM resend_audience_backfill_queue
    WHERE status IN ('queued', 'failed')
  `

  if (!count || count === 0) {
    await seedAudienceBackfillQueue()
  }

  const rows = await sql`
    WITH cte AS (
      SELECT id, email, first_name
      FROM resend_audience_backfill_queue
      WHERE status IN ('queued', 'failed')
      ORDER BY id ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE resend_audience_backfill_queue q
    SET
      status = 'processing',
      attempts = attempts + 1,
      updated_at = NOW()
    FROM cte
    WHERE q.id = cte.id
    RETURNING q.id, q.email, q.first_name
  `

  let synced = 0
  let failed = 0

  for (const row of rows) {
    try {
      const { error } = await resend.contacts.create({
        audienceId: process.env.RESEND_AUDIENCE_ID!,
        email: row.email,
        firstName: row.first_name || undefined,
      })

      if (error && !String(error.message || "").toLowerCase().includes("already")) {
        throw new Error(error.message || "Failed to add contact")
      }

      await sql`
        UPDATE resend_audience_backfill_queue
        SET status = 'synced', last_error = NULL, updated_at = NOW()
        WHERE id = ${row.id}
      `
      synced++
    } catch (error) {
      failed++
      await sql`
        UPDATE resend_audience_backfill_queue
        SET status = 'failed',
            last_error = ${error instanceof Error ? error.message : "Unknown error"},
            updated_at = NOW()
        WHERE id = ${row.id}
      `
    }

    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
  }

  return { processed: rows.length, synced, failed }
}
