import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

export type MarketingRunStatus =
  | "queued"
  | "syncing"
  | "broadcasting"
  | "cleanup"
  | "completed"
  | "failed"

export interface MarketingRecipient {
  email: string
  firstName?: string | null
}

export async function createMarketingSendRun(input: {
  sequenceKey: string
  emailType?: string
  tagKey?: string
  segmentId?: string
  campaignKey?: string
  subject?: string
  html?: string
  text?: string
  totalRecipients: number
}): Promise<string> {
  const runId = `run_${crypto.randomUUID()}`

  await sql`
    INSERT INTO marketing_send_runs (
      run_id,
      sequence_key,
      email_type,
      tag_key,
      segment_id,
      campaign_key,
      subject,
      body_html,
      body_text,
      status,
      total_recipients,
      processed_recipients
    )
    VALUES (
      ${runId},
      ${input.sequenceKey},
      ${input.emailType || null},
      ${input.tagKey || null},
      ${input.segmentId || null},
      ${input.campaignKey || null},
      ${input.subject || null},
      ${input.html || null},
      ${input.text || null},
      'queued',
      ${input.totalRecipients},
      0
    )
  `

  return runId
}

export async function updateMarketingRunStatus(input: {
  runId: string
  status: MarketingRunStatus
  broadcastId?: string | null
  errorMessage?: string | null
  startedAt?: boolean
  finishedAt?: boolean
}): Promise<void> {
  await sql`
    UPDATE marketing_send_runs
    SET
      status = ${input.status},
      broadcast_id = COALESCE(${input.broadcastId || null}, broadcast_id),
      error_message = COALESCE(${input.errorMessage || null}, error_message),
      started_at = CASE WHEN ${input.startedAt || false} THEN NOW() ELSE started_at END,
      finished_at = CASE WHEN ${input.finishedAt || false} THEN NOW() ELSE finished_at END
    WHERE run_id = ${input.runId}
  `
}

export async function updateMarketingRunContent(input: {
  runId: string
  subject?: string | null
  html?: string | null
  text?: string | null
}): Promise<void> {
  await sql`
    UPDATE marketing_send_runs
    SET
      subject = COALESCE(${input.subject || null}, subject),
      body_html = COALESCE(${input.html || null}, body_html),
      body_text = COALESCE(${input.text || null}, body_text)
    WHERE run_id = ${input.runId}
  `
}

export async function enqueueMarketingRecipients(input: {
  runId: string
  segmentId?: string
  recipients: MarketingRecipient[]
}): Promise<void> {
  if (input.recipients.length === 0) return

  const runIds = input.recipients.map(() => input.runId)
  const emails = input.recipients.map((recipient) => recipient.email)
  const firstNames = input.recipients.map((recipient) => recipient.firstName || null)
  const segmentIds = input.recipients.map(() => input.segmentId || null)

  await sql`
    INSERT INTO marketing_send_queue (
      run_id,
      email,
      first_name,
      segment_id,
      status,
      attempts,
      updated_at
    )
    SELECT
      data.run_id,
      data.email,
      data.first_name,
      data.segment_id,
      'queued',
      0,
      NOW()
    FROM UNNEST(
      ${runIds}::text[],
      ${emails}::text[],
      ${firstNames}::text[],
      ${segmentIds}::text[]
    ) AS data(run_id, email, first_name, segment_id)
    ON CONFLICT (run_id, email)
    DO NOTHING
  `
}

export async function claimQueueBatch(input: {
  runId: string
  batchSize: number
  maxAttempts: number
  statuses: string[]
  nextStatus: string
}): Promise<
  Array<{ id: number; email: string; first_name: string | null; segment_id: string | null }>
> {
  const rows = await sql`
    WITH cte AS (
      SELECT id
      FROM marketing_send_queue
      WHERE run_id = ${input.runId}
        AND status = ANY(${input.statuses})
        AND attempts < ${input.maxAttempts}
      ORDER BY id ASC
      LIMIT ${input.batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE marketing_send_queue q
    SET
      status = ${input.nextStatus},
      attempts = attempts + 1,
      updated_at = NOW()
    FROM cte
    WHERE q.id = cte.id
    RETURNING q.id, q.email, q.first_name, q.segment_id
  `

  return rows as Array<{ id: number; email: string; first_name: string | null; segment_id: string | null }>
}

export async function updateQueueBatchStatus(input: {
  ids: number[]
  status: string
  errorMessage?: string | null
}): Promise<void> {
  if (input.ids.length === 0) return

  await sql`
    UPDATE marketing_send_queue
    SET
      status = ${input.status},
      last_error = ${input.errorMessage || null},
      updated_at = NOW()
    WHERE id = ANY(${input.ids})
  `
}

export async function getQueueCounts(runId: string): Promise<Record<string, number>> {
  const rows = await sql`
    SELECT status, COUNT(*)::int as count
    FROM marketing_send_queue
    WHERE run_id = ${runId}
    GROUP BY status
  `

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.status] = Number(row.count || 0)
  }
  return counts
}

export async function updateRunProcessedCount(runId: string): Promise<void> {
  const [row] = await sql`
    SELECT COUNT(*)::int as processed
    FROM marketing_send_queue
    WHERE run_id = ${runId}
      AND status IN ('synced', 'removed', 'cleanup_failed')
  `

  await sql`
    UPDATE marketing_send_runs
    SET processed_recipients = ${Number(row?.processed || 0)}
    WHERE run_id = ${runId}
  `
}

export async function getNextPendingRuns(limit = 5): Promise<Array<{ run_id: string; status: string }>> {
  const rows = await sql`
    SELECT run_id, status
    FROM marketing_send_runs
    WHERE status IN ('queued', 'syncing', 'broadcasting', 'cleanup')
    ORDER BY created_at ASC
    LIMIT ${limit}
  `

  return rows as Array<{ run_id: string; status: string }>
}

export async function getRunDetails(runId: string): Promise<any | null> {
  const [row] = await sql`
    SELECT *
    FROM marketing_send_runs
    WHERE run_id = ${runId}
    LIMIT 1
  `
  return row || null
}

export async function resetStuckMarketingQueueItems(input?: {
  processingStuckMins?: number
  cleanupProcessingStuckMins?: number
}): Promise<{ resetProcessing: number; resetCleanupProcessing: number }> {
  const processingStuckMins = input?.processingStuckMins ?? 15
  const cleanupProcessingStuckMins = input?.cleanupProcessingStuckMins ?? 15

  const resetProcessingRows = await sql`
    UPDATE marketing_send_queue
    SET
      status = 'failed',
      last_error = COALESCE(last_error, 'Reset: stuck processing'),
      updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - make_interval(mins => ${processingStuckMins})
    RETURNING id
  `

  const resetCleanupRows = await sql`
    UPDATE marketing_send_queue
    SET
      status = 'cleanup_failed',
      last_error = COALESCE(last_error, 'Reset: stuck cleanup_processing'),
      updated_at = NOW()
    WHERE status = 'cleanup_processing'
      AND updated_at < NOW() - make_interval(mins => ${cleanupProcessingStuckMins})
    RETURNING id
  `

  return {
    resetProcessing: (resetProcessingRows as any[])?.length || 0,
    resetCleanupProcessing: (resetCleanupRows as any[])?.length || 0,
  }
}

export async function failStaleMarketingRuns(input?: {
  staleRunMins?: number
  limit?: number
}): Promise<{ failedRuns: number; affectedQueuedEmailLogs: number }> {
  const staleRunMins = input?.staleRunMins ?? 30
  const limit = input?.limit ?? 25

  const staleRuns = (await sql`
    SELECT
      run_id,
      COALESCE(email_type, sequence_key) AS email_type
    FROM marketing_send_runs
    WHERE status IN ('syncing', 'broadcasting', 'cleanup')
      AND finished_at IS NULL
      AND started_at IS NOT NULL
      AND started_at < NOW() - make_interval(mins => ${staleRunMins})
    ORDER BY started_at ASC
    LIMIT ${limit}
  `) as Array<{ run_id: string; email_type: string | null }>

  if (staleRuns.length === 0) {
    return { failedRuns: 0, affectedQueuedEmailLogs: 0 }
  }

  let affectedQueuedEmailLogs = 0
  for (const run of staleRuns) {
    const emailType = String(run.email_type || "").trim()

    await sql`
      UPDATE marketing_send_runs
      SET
        status = 'failed',
        error_message = COALESCE(error_message, 'Reset: stale run timeout'),
        finished_at = NOW()
      WHERE run_id = ${run.run_id}
        AND finished_at IS NULL
    `

    // Ensure stuck queue rows can be retried by future runs.
    await sql`
      UPDATE marketing_send_queue
      SET
        status = 'failed',
        last_error = COALESCE(last_error, 'Reset: stale run cleanup'),
        updated_at = NOW()
      WHERE run_id = ${run.run_id}
        AND status = 'processing'
    `
    await sql`
      UPDATE marketing_send_queue
      SET
        status = 'cleanup_failed',
        last_error = COALESCE(last_error, 'Reset: stale run cleanup'),
        updated_at = NOW()
      WHERE run_id = ${run.run_id}
        AND status = 'cleanup_processing'
    `

    if (emailType) {
      const updated = await sql`
        UPDATE email_logs
        SET
          status = 'failed',
          error_message = COALESCE(error_message, 'Reset: stale run cleanup'),
          sent_at = NOW()
        WHERE status = 'queued'
          AND email_type = ${emailType}
          AND user_email IN (
            SELECT email FROM marketing_send_queue WHERE run_id = ${run.run_id}
          )
        RETURNING id
      `
      affectedQueuedEmailLogs += (updated as any[])?.length || 0
    }
  }

  return { failedRuns: staleRuns.length, affectedQueuedEmailLogs }
}
