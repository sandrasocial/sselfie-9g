import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)
const MARKETING_CLEANUP_MARK_QUEUED_AS_FAILURE =
  String(process.env.MARKETING_CLEANUP_MARK_QUEUED_AS_FAILURE || "false").toLowerCase() === "true"

function resolveCleanupEmailLogStatus(kind: "expired" | "closed" | "abandoned"): string {
  if (MARKETING_CLEANUP_MARK_QUEUED_AS_FAILURE) return "failed"
  return kind
}

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
  const maxAgeDays = Number(process.env.MARKETING_QUEUE_MAX_AGE_DAYS || 7)
  const rows = await sql`
    WITH cte AS (
      SELECT id
      FROM marketing_send_queue
      WHERE run_id = ${input.runId}
        AND status = ANY(${input.statuses})
        AND attempts < ${input.maxAttempts}
        AND created_at > NOW() - ${maxAgeDays} * INTERVAL '1 day'
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

export async function getNextPendingRuns(
  limit = 5,
  excludeRunIds: string[] = [],
): Promise<Array<{ run_id: string; status: string }>> {
  const hasExclusions = excludeRunIds.length > 0
  const rows = hasExclusions
    ? await sql`
        SELECT run_id, status
        FROM marketing_send_runs
        WHERE status IN ('queued', 'syncing', 'broadcasting', 'cleanup')
          AND NOT (run_id = ANY(${excludeRunIds}))
        ORDER BY created_at ASC
        LIMIT ${limit}
      `
    : await sql`
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

export async function markMarketingRunForCleanupRetry(runId: string): Promise<void> {
  await sql`
    UPDATE marketing_send_runs
    SET
      status = 'cleanup',
      error_message = NULL,
      finished_at = NULL
    WHERE run_id = ${runId}
  `
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

export async function failQueueForRun(input: {
  runId: string
  reason: string
  statuses?: string[]
}): Promise<{ updated: number }> {
  const statuses = input.statuses || ["queued", "failed", "processing", "synced", "cleanup_failed", "cleanup_processing"]
  const rows = await sql`
    UPDATE marketing_send_queue
    SET
      status = 'failed',
      last_error = ${input.reason},
      updated_at = NOW()
    WHERE run_id = ${input.runId}
      AND status = ANY(${statuses})
    RETURNING id
  `
  return { updated: (rows as any[])?.length || 0 }
}

export async function expireOldMarketingQueueItems(input?: {
  maxAgeDays?: number
  limitRuns?: number
}): Promise<{ expiredQueueRows: number; expiredEmailLogs: number; affectedRuns: number }> {
  const maxAgeDays = input?.maxAgeDays ?? Number(process.env.MARKETING_QUEUE_MAX_AGE_DAYS || 7)
  const limitRuns = input?.limitRuns ?? 200

  const runRows = (await sql`
    SELECT run_id, COALESCE(email_type, sequence_key) AS email_type
    FROM marketing_send_runs
    WHERE created_at < NOW() - ${maxAgeDays} * INTERVAL '1 day'
      AND status IN ('queued', 'syncing', 'broadcasting', 'cleanup', 'failed', 'completed')
    ORDER BY created_at ASC
    LIMIT ${limitRuns}
  `) as Array<{ run_id: string; email_type: string | null }>

  if (runRows.length === 0) return { expiredQueueRows: 0, expiredEmailLogs: 0, affectedRuns: 0 }

  const runIds = runRows.map((r) => r.run_id)

  const queueUpdated = await sql`
    UPDATE marketing_send_queue
    SET
      status = 'failed',
      last_error = COALESCE(last_error, 'Expired: queue item too old'),
      updated_at = NOW()
    WHERE run_id = ANY(${runIds}::text[])
      AND status IN ('queued', 'failed', 'processing', 'synced', 'cleanup_failed', 'cleanup_processing')
      AND created_at < NOW() - ${maxAgeDays} * INTERVAL '1 day'
    RETURNING id
  `

  // Best-effort: mark monitoring logs as failed so reports don't show an infinite queued backlog.
  // email_logs does not have run_id; we update by type + age only.
  const emailUpdated = await sql`
    UPDATE email_logs
    SET
      status = ${resolveCleanupEmailLogStatus("expired")},
      error_message = COALESCE(error_message, 'Expired: queued email too old'),
      sent_at = NOW()
    WHERE status = 'queued'
      AND sent_at < NOW() - ${maxAgeDays} * INTERVAL '1 day'
    RETURNING id
  `

  // Close long-running runs so they don't keep showing up as pending work.
  await sql`
    UPDATE marketing_send_runs
    SET
      status = CASE
        WHEN status IN ('queued', 'syncing', 'broadcasting', 'cleanup') THEN 'failed'
        ELSE status
      END,
      error_message = COALESCE(error_message, 'Expired: run too old'),
      started_at = COALESCE(started_at, NOW()),
      finished_at = COALESCE(finished_at, NOW())
    WHERE run_id = ANY(${runIds}::text[])
      AND created_at < NOW() - ${maxAgeDays} * INTERVAL '1 day'
  `

  return {
    expiredQueueRows: (queueUpdated as any[])?.length || 0,
    expiredEmailLogs: (emailUpdated as any[])?.length || 0,
    affectedRuns: runIds.length,
  }
}

/**
 * If a run is already closed (failed/completed), any remaining queued items will never be processed.
 * Clean them up so email reports and queue health reflect reality.
 */
export async function failQueuedItemsForClosedRuns(input?: {
  minFinishedMins?: number
  limitRuns?: number
}): Promise<{ affectedRuns: number; updatedQueueRows: number; updatedEmailLogs: number }> {
  const minFinishedMins = input?.minFinishedMins ?? 10
  const limitRuns = input?.limitRuns ?? 50

  const runs = (await sql`
    SELECT run_id, COALESCE(email_type, sequence_key) AS email_type
    FROM marketing_send_runs
    WHERE status IN ('failed', 'completed')
      AND finished_at IS NOT NULL
      AND finished_at < NOW() - make_interval(mins => ${minFinishedMins})
    ORDER BY finished_at DESC
    LIMIT ${limitRuns}
  `) as Array<{ run_id: string; email_type: string | null }>

  if (runs.length === 0) return { affectedRuns: 0, updatedQueueRows: 0, updatedEmailLogs: 0 }

  const runIds = runs.map((r) => r.run_id)

  const queueUpdated = await sql`
    UPDATE marketing_send_queue
    SET
      status = 'failed',
      last_error = COALESCE(last_error, 'Closed: run finished'),
      updated_at = NOW()
    WHERE run_id = ANY(${runIds}::text[])
      AND status IN ('queued', 'processing', 'synced', 'failed', 'cleanup_failed', 'cleanup_processing')
    RETURNING id
  `

  // Best-effort: email_logs doesn't have run_id, so update by email_type + recipients.
  let updatedEmailLogs = 0
  for (const run of runs) {
    const emailType = String(run.email_type || "").trim()
    if (!emailType) continue

    const rows = await sql`
      UPDATE email_logs
      SET
        status = ${resolveCleanupEmailLogStatus("closed")},
        error_message = COALESCE(error_message, 'Closed: run finished'),
        sent_at = NOW()
      WHERE status = 'queued'
        AND email_type = ${emailType}
        AND user_email IN (SELECT email FROM marketing_send_queue WHERE run_id = ${run.run_id})
      RETURNING id
    `
    updatedEmailLogs += (rows as any[])?.length || 0
  }

  return {
    affectedRuns: runs.length,
    updatedQueueRows: (queueUpdated as any[])?.length || 0,
    updatedEmailLogs,
  }
}

export async function failStaleMarketingRuns(input?: {
  staleRunMins?: number
  limit?: number
}): Promise<{ failedRuns: number; affectedQueuedEmailLogs: number }> {
  const staleRunMins = input?.staleRunMins ?? Number(process.env.MARKETING_STALE_RUN_MINS || 180)
  const limit = input?.limit ?? 25

  const staleRuns = (await sql`
    WITH run_activity AS (
      SELECT
        r.run_id,
        COALESCE(r.email_type, r.sequence_key) AS email_type,
        r.started_at,
        MAX(q.updated_at) AS last_queue_activity_at
      FROM marketing_send_runs r
      LEFT JOIN marketing_send_queue q ON q.run_id = r.run_id
      WHERE r.status IN ('syncing', 'broadcasting', 'cleanup')
        AND r.finished_at IS NULL
        AND r.started_at IS NOT NULL
      GROUP BY r.run_id, COALESCE(r.email_type, r.sequence_key), r.started_at
    )
    SELECT run_id, email_type
    FROM run_activity
    WHERE COALESCE(last_queue_activity_at, started_at) < NOW() - make_interval(mins => ${staleRunMins})
    ORDER BY COALESCE(last_queue_activity_at, started_at) ASC
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
          status = ${resolveCleanupEmailLogStatus("abandoned")},
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
