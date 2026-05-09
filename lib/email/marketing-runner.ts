import { sendMarketingBroadcast, syncMarketingContacts } from "@/lib/email/marketing-sender"
import { sql } from "@/lib/db/client"
import { logAdminError } from "@/lib/admin-error-log"
import { resolveMarketingTemplateContent } from "@/lib/email/marketing-template-overrides"
import { addContactsToHistorySegment } from "@/lib/resend/segment-history"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"
import { normalizeEmailIdentifier } from "@/lib/email/normalize-identifier"
import {
  claimQueueBatch,
  createMarketingSendRun,
  enqueueMarketingRecipients,
  getRunDetails,
  getNextPendingRuns,
  failStaleMarketingRuns,
  failQueuedItemsForClosedRuns,
  resetStuckMarketingQueueItems,
  updateMarketingRunStatus,
  updateQueueBatchStatus,
  updateRunProcessedCount,
  MarketingRecipient,
  updateMarketingRunContent,
  expireOldMarketingQueueItems,
  failQueueForRun,
} from "@/lib/email/marketing-queue"

const DEFAULT_BATCH_SIZE = Number.parseInt(process.env.MARKETING_SYNC_BATCH_SIZE || "25", 10)
const DEFAULT_MAX_ATTEMPTS = Number.parseInt(process.env.MARKETING_SYNC_MAX_ATTEMPTS || "3", 10)
const DEFAULT_MAX_RUNTIME_MS = Number.parseInt(process.env.MARKETING_RUN_MAX_MS || "60000", 10)
const DEFAULT_PENDING_RUN_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.MARKETING_PENDING_RUN_LIMIT || "5", 10) || 5,
)
const DEFAULT_PENDING_RUN_MAX = Math.max(
  DEFAULT_PENDING_RUN_LIMIT,
  Number.parseInt(process.env.MARKETING_PENDING_RUN_MAX || "15", 10) || 15,
)
const DEFAULT_PENDING_WINDOW_MS = Math.max(
  5_000,
  Number.parseInt(process.env.MARKETING_PENDING_WINDOW_MS || "90000", 10) || 90_000,
)
const DEFAULT_PENDING_PER_RUN_MAX_MS = Math.max(
  7_000,
  Number.parseInt(process.env.MARKETING_PENDING_PER_RUN_MAX_MS || "20000", 10) || 20_000,
)
const REQUIRE_UPSTASH_LOCKS =
  String(process.env.MARKETING_REQUIRE_UPSTASH_LOCKS || "true").toLowerCase() !== "false"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface MarketingRunInput {
  sequenceKey: string
  emailType: string
  tagKey: string
  segmentId: string
  campaignKey: string
  subject: string
  html: string
  text?: string
  campaignId?: number | null
  recipients: MarketingRecipient[]
}

export async function enqueueAndProcessMarketingRun(input: MarketingRunInput) {
  const normalizedSegmentId = normalizeEmailIdentifier(input.segmentId)
  const resolvedContent = await resolveMarketingTemplateContent({
    emailType: input.emailType,
    subject: input.subject,
    html: input.html,
    text: input.text || "",
  })

  const runId = await createMarketingSendRun({
    sequenceKey: input.sequenceKey,
    emailType: input.emailType,
    tagKey: input.tagKey,
    segmentId: normalizedSegmentId,
    campaignKey: input.campaignKey,
    subject: resolvedContent.subject,
    html: resolvedContent.html,
    text: resolvedContent.text,
    totalRecipients: input.recipients.length,
  })

  await enqueueMarketingRecipients({
    runId,
    segmentId: normalizedSegmentId,
    recipients: input.recipients,
  })

  await insertQueuedEmailLogs({
    runId,
    emailType: input.emailType,
    campaignId: input.campaignId || null,
  })

  await processMarketingRun({
    runId,
    tagKey: input.tagKey,
    segmentId: normalizedSegmentId,
    campaignKey: input.campaignKey,
    subject: resolvedContent.subject,
    html: resolvedContent.html,
    text: resolvedContent.text,
    emailType: input.emailType,
  })

  return runId
}

export async function processPendingMarketingRuns(limit = DEFAULT_PENDING_RUN_LIMIT) {
  // Recovery pass: safe/idempotent, prevents "stuck" queue rows and stale runs
  // from blocking future sends.
  await resetStuckMarketingQueueItems().catch(() => {})
  await failStaleMarketingRuns().catch(() => {})
  await failQueuedItemsForClosedRuns().catch(() => {})
  await expireOldMarketingQueueItems().catch(() => {})

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_PENDING_RUN_LIMIT
  const startTime = Date.now()
  const processedRunIds: string[] = []
  let remaining = DEFAULT_PENDING_RUN_MAX

  while (remaining > 0 && Date.now() - startTime < DEFAULT_PENDING_WINDOW_MS) {
    const batchSize = Math.min(safeLimit, remaining)
    const runs = await getNextPendingRuns(batchSize, processedRunIds)
    if (runs.length === 0) break

    for (const run of runs) {
      if (Date.now() - startTime >= DEFAULT_PENDING_WINDOW_MS) break
      processedRunIds.push(run.run_id)
      remaining -= 1
      if (remaining < 0) break
      await processMarketingRun({
        runId: run.run_id,
        maxRuntimeMs: DEFAULT_PENDING_PER_RUN_MAX_MS,
      })
    }
  }
}

export async function processMarketingRun(input: {
  runId: string
  tagKey?: string
  segmentId?: string
  campaignKey?: string
  subject?: string
  html?: string
  text?: string
  emailType?: string
  batchSize?: number
  maxAttempts?: number
  maxRuntimeMs?: number
}) {
  const batchSize = input.batchSize || DEFAULT_BATCH_SIZE
  const maxAttempts = input.maxAttempts || DEFAULT_MAX_ATTEMPTS
  const maxRuntimeMs = input.maxRuntimeMs || DEFAULT_MAX_RUNTIME_MS

  const run = await getRunDetails(input.runId)
  if (!run) return

  const tagKey = input.tagKey || run.tag_key || run.sequence_key
  const segmentId = normalizeEmailIdentifier(input.segmentId || run.segment_id) || undefined
  const campaignKey = input.campaignKey || run.campaign_key
  const emailType = input.emailType || run.email_type || run.sequence_key
  const subject = input.subject || run.subject
  const html = input.html || run.body_html
  const text = input.text || run.body_text
  const missingFields = [
    !segmentId ? "segmentId" : "",
    !campaignKey ? "campaignKey" : "",
    !subject ? "subject" : "",
    !html ? "html" : "",
  ].filter(Boolean)
  const segmentLooksInvalid = !!segmentId && !UUID_RE.test(segmentId)

  if (missingFields.length > 0 || segmentLooksInvalid) {
    const metadataError = segmentLooksInvalid
      ? `Invalid segmentId format: ${segmentId}`
      : `Missing required broadcast metadata: ${missingFields.join(", ")}`
    if (!run.started_at) {
      await markEmailLogsFailed({
        runId: input.runId,
        emailType,
        errorMessage: metadataError,
      })
      await updateMarketingRunStatus({
        runId: input.runId,
        status: "failed",
        errorMessage: metadataError,
        startedAt: true,
        finishedAt: true,
      })
      await failQueueForRun({ runId: input.runId, reason: `Failed: ${metadataError}` }).catch(() => {})
      await logAdminError({
        toolName: "marketing-runner:metadata",
        error: new Error(metadataError),
        context: {
          runId: input.runId,
          emailType,
          segmentId,
          campaignKey: campaignKey || null,
        },
      }).catch(() => {})
    }
    return
  }

  // Single-flight lock around Resend operations to avoid concurrent cron executions
  // tripping Resend's strict rate limits (2 req/sec).
  const lock = await acquireKvLock({
    key: "lock:marketing:resend:global",
    ttlMs: 90_000,
    requireLockWhenNoRedis: REQUIRE_UPSTASH_LOCKS,
  })
  if (!lock.acquired) {
    if (!lock.locked && REQUIRE_UPSTASH_LOCKS) {
      await logAdminError({
        toolName: "marketing-runner:lock",
        error: new Error("Upstash KV lock required but not configured"),
        context: { runId: input.runId, reason: "MARKETING_REQUIRE_UPSTASH_LOCKS=true" },
      }).catch(() => {})
    }
    return
  }

  const resendAudienceId = normalizeEmailIdentifier(process.env.RESEND_AUDIENCE_ID)
  if (!resendAudienceId) {
    await markEmailLogsFailed({
      runId: input.runId,
      emailType,
      errorMessage: "RESEND_AUDIENCE_ID not configured",
    })
    await updateMarketingRunStatus({
      runId: input.runId,
      status: "failed",
      errorMessage: "RESEND_AUDIENCE_ID not configured",
      startedAt: true,
      finishedAt: true,
    })
    await failQueueForRun({ runId: input.runId, reason: "Failed: RESEND_AUDIENCE_ID not configured" }).catch(() => {})
    await releaseKvLock({ key: "lock:marketing:resend:global", value: lock.value }).catch(() => {})
    return
  }

  try {
    if (!run.started_at) {
      await updateMarketingRunStatus({ runId: input.runId, status: "syncing", startedAt: true })
    }

    // If we previously marked these recipients failed (e.g. due to retryable Resend API errors),
    // revive them back to queued so a later successful broadcast can mark them as sent.
    await reviveEmailLogsForRun({ runId: input.runId, emailType }).catch(() => {})

    if (Number(run.total_recipients || 0) === 0) {
      await updateMarketingRunStatus({
        runId: input.runId,
        status: "completed",
        finishedAt: true,
      })
      return
    }

    const startTime = Date.now()
    let keepRunning = true
    while (keepRunning && Date.now() - startTime < maxRuntimeMs) {
      // Only consider items that are still claimable; otherwise a handful of
      // permanently-failed rows (attempts >= maxAttempts) can block broadcast forever.
      const [claimable] = await sql`
        SELECT COUNT(*)::int AS count
        FROM marketing_send_queue
        WHERE run_id = ${input.runId}
          AND status IN ('queued', 'failed')
          AND attempts < ${maxAttempts}
      `
      const queuedRemaining = Number((claimable as any)?.count || 0)

      if (queuedRemaining > 0) {
        const batch = await claimQueueBatch({
          runId: input.runId,
          batchSize,
          maxAttempts,
          statuses: ["queued", "failed"],
          nextStatus: "processing",
        })

        if (batch.length === 0) {
          keepRunning = false
          break
        }

        const contacts = batch.map((item) => ({
          email: item.email,
          firstName: item.first_name,
        }))

        const syncResult = await syncMarketingContacts({
          tagKey,
          tagValue: "true",
          segmentId,
          contacts,
        })

        if (tagKey.startsWith("sequence_")) {
          await addContactsToHistorySegment(tagKey, contacts).catch((error) => {
            console.error("[v0] Failed to update history segment:", error)
          })
        }

        if (syncResult.success) {
          await updateQueueBatchStatus({
            ids: batch.map((item) => item.id),
            status: "synced",
          })
        } else {
          await updateQueueBatchStatus({
            ids: batch.map((item) => item.id),
            status: "failed",
            errorMessage: `Sync errors: ${syncResult.errors}`,
          })
        }

        await updateRunProcessedCount(input.runId)
        continue
      }

      const currentRun = await getRunDetails(input.runId)
      if (currentRun?.status !== "broadcasting" && currentRun?.status !== "cleanup") {
        const overrideContent = await resolveMarketingTemplateContent({
          emailType,
          subject: subject || undefined,
          html: html || "",
          text: text || "",
        })

        await updateMarketingRunContent({
          runId: input.runId,
          subject: overrideContent.subject || subject || null,
          html: overrideContent.html || html || null,
          text: overrideContent.text || text || null,
        })

        await updateMarketingRunStatus({ runId: input.runId, status: "broadcasting" })

        try {
          const broadcastResult = await sendMarketingBroadcast({
            campaignKey,
            segmentId,
            subject: overrideContent.subject || subject || "",
            html: overrideContent.html || html || "",
            text: overrideContent.text || text || undefined,
            estimatedRecipientCount: run.total_recipients,
          })

          await markEmailLogsSent({ runId: input.runId, emailType })

          await updateMarketingRunStatus({
            runId: input.runId,
            status: "cleanup",
            broadcastId: broadcastResult.broadcastId || null,
          })
        } catch (error) {
          await markEmailLogsFailed({
            runId: input.runId,
            emailType,
            errorMessage: error instanceof Error ? error.message : "Broadcast failed",
          })
          await updateMarketingRunStatus({
            runId: input.runId,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Broadcast failed",
            finishedAt: true,
          })
          await failQueueForRun({
            runId: input.runId,
            reason: error instanceof Error ? `Broadcast failed: ${error.message}` : "Broadcast failed",
          }).catch(() => {})
          await logAdminError({
            toolName: "marketing-runner:broadcast",
            error: error instanceof Error ? error : new Error("Broadcast failed"),
            context: { runId: input.runId, campaignKey },
          }).catch(() => {})
          keepRunning = false
          break
        }
      }

      if ((await getRunDetails(input.runId))?.status === "cleanup") {
        const cleanupBatch = await claimQueueBatch({
          runId: input.runId,
          batchSize,
          maxAttempts,
          statuses: ["synced", "cleanup_failed"],
          nextStatus: "cleanup_processing",
        })

        if (cleanupBatch.length === 0) {
          await updateMarketingRunStatus({
            runId: input.runId,
            status: "completed",
            finishedAt: true,
          })
          keepRunning = false
          break
        }

        const cleanupContacts = cleanupBatch.map((item) => ({
          email: item.email,
          firstName: item.first_name,
        }))

        const cleanupResult = await syncMarketingContacts({
          tagKey,
          tagValue: "false",
          segmentId,
          removeFromSegment: true,
          contacts: cleanupContacts,
        })

        if (cleanupResult.success) {
          await updateQueueBatchStatus({
            ids: cleanupBatch.map((item) => item.id),
            status: "removed",
          })
        } else {
          await updateQueueBatchStatus({
            ids: cleanupBatch.map((item) => item.id),
            status: "cleanup_failed",
            errorMessage: `Cleanup errors: ${cleanupResult.errors}`,
          })
        }

        await updateRunProcessedCount(input.runId)
        continue
      }

      keepRunning = false
    }
  } finally {
    await releaseKvLock({ key: "lock:marketing:resend:global", value: lock.value }).catch(() => {})
  }
}

async function insertQueuedEmailLogs(input: {
  runId: string
  emailType: string
  campaignId?: number | null
}) {
  await sql`
    INSERT INTO email_logs (user_email, email_type, status, sent_at, campaign_id)
    SELECT q.email, ${input.emailType}, 'queued', NOW(), ${input.campaignId || null}
    FROM marketing_send_queue q
    LEFT JOIN email_logs el
      ON el.user_email = q.email AND el.email_type = ${input.emailType}
    WHERE q.run_id = ${input.runId}
      AND el.id IS NULL
  `
}

async function reviveEmailLogsForRun(input: { runId: string; emailType: string }) {
  await sql`
    UPDATE email_logs
    SET status = 'queued',
        error_message = NULL,
        sent_at = NOW()
    WHERE email_type = ${input.emailType}
      AND status IN ('failed', 'error')
      AND user_email IN (
        SELECT email FROM marketing_send_queue WHERE run_id = ${input.runId}
      )
  `
}

async function markEmailLogsSent(input: { runId: string; emailType: string }) {
  await sql`
    UPDATE email_logs
    SET status = 'sent',
        sent_at = NOW()
    WHERE email_type = ${input.emailType}
      AND status = 'queued'
      AND user_email IN (
        SELECT email FROM marketing_send_queue WHERE run_id = ${input.runId}
      )
  `
}

async function markEmailLogsFailed(input: { runId: string; emailType: string; errorMessage?: string }) {
  await sql`
    UPDATE email_logs
    SET status = 'failed',
        error_message = COALESCE(${input.errorMessage || null}, error_message),
        sent_at = NOW()
    WHERE email_type = ${input.emailType}
      AND status = 'queued'
      AND user_email IN (
        SELECT email FROM marketing_send_queue WHERE run_id = ${input.runId}
      )
  `
}
