import { sendMarketingBroadcast, syncMarketingContacts } from "@/lib/email/marketing-sender"
import { neon } from "@neondatabase/serverless"
import { logAdminError } from "@/lib/admin-error-log"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"
import {
  claimQueueBatch,
  createMarketingSendRun,
  enqueueMarketingRecipients,
  getQueueCounts,
  getRunDetails,
  getNextPendingRuns,
  updateMarketingRunStatus,
  updateQueueBatchStatus,
  updateRunProcessedCount,
  MarketingRecipient,
} from "@/lib/email/marketing-queue"

const sql = neon(process.env.DATABASE_URL!)
const DEFAULT_BATCH_SIZE = Number.parseInt(process.env.MARKETING_SYNC_BATCH_SIZE || "25", 10)
const DEFAULT_MAX_ATTEMPTS = Number.parseInt(process.env.MARKETING_SYNC_MAX_ATTEMPTS || "3", 10)
const DEFAULT_MAX_RUNTIME_MS = Number.parseInt(process.env.MARKETING_RUN_MAX_MS || "20000", 10)

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
  const runId = await createMarketingSendRun({
    sequenceKey: input.sequenceKey,
    tagKey: input.tagKey,
    segmentId: input.segmentId,
    campaignKey: input.campaignKey,
    subject: input.subject,
    html: input.html,
    text: input.text,
    totalRecipients: input.recipients.length,
  })

  await enqueueMarketingRecipients({
    runId,
    segmentId: input.segmentId,
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
    segmentId: input.segmentId,
    campaignKey: input.campaignKey,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return runId
}

export async function processPendingMarketingRuns(limit = 3) {
  const runs = await getNextPendingRuns(limit)
  for (const run of runs) {
    await processMarketingRun({ runId: run.run_id })
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
  const segmentId = input.segmentId || run.segment_id
  const campaignKey = input.campaignKey || run.campaign_key
  const emailType = input.emailType || run.sequence_key
  const subject = input.subject || run.subject
  const html = input.html || run.body_html
  const text = input.text || run.body_text

  if (!segmentId || !campaignKey || !subject || !html) {
    if (!run.started_at) {
      await updateMarketingRunStatus({
        runId: input.runId,
        status: "failed",
        errorMessage: "Missing required broadcast metadata",
        startedAt: true,
        finishedAt: true,
      })
    }
    return
  }

  if (!process.env.RESEND_AUDIENCE_ID) {
    await updateMarketingRunStatus({
      runId: input.runId,
      status: "failed",
      errorMessage: "RESEND_AUDIENCE_ID not configured",
      startedAt: true,
      finishedAt: true,
    })
    return
  }

  if (!run.started_at) {
    await updateMarketingRunStatus({ runId: input.runId, status: "syncing", startedAt: true })
  }

  if (Number(run.total_recipients || 0) === 0) {
    await updateMarketingRunStatus({
      runId: input.runId,
      status: "completed",
      finishedAt: true,
    })
    return
  }

  let existingContacts: Array<{ email: string; id: string; tags?: any[] }> = []
  try {
    existingContacts = await getAudienceContacts(process.env.RESEND_AUDIENCE_ID)
  } catch (error) {
    await updateMarketingRunStatus({
      runId: input.runId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Failed to load Resend contacts",
      finishedAt: true,
    })
    await logAdminError({
      toolName: "marketing-runner:load-contacts",
      error: error instanceof Error ? error : new Error("Failed to load Resend contacts"),
      context: { runId: input.runId },
    }).catch(() => {})
    return
  }

  const startTime = Date.now()
  let keepRunning = true
  while (keepRunning && Date.now() - startTime < maxRuntimeMs) {
    const counts = await getQueueCounts(input.runId)
    const queuedRemaining = (counts.queued || 0) + (counts.failed || 0)

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
        existingContacts,
      })

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
      await updateMarketingRunStatus({ runId: input.runId, status: "broadcasting" })

      try {
        const broadcastResult = await sendMarketingBroadcast({
          campaignKey,
          segmentId,
          subject,
          html,
          text,
          estimatedRecipientCount: run.total_recipients,
        })

        await markEmailLogsSent({ runId: input.runId, emailType })

        await updateMarketingRunStatus({
          runId: input.runId,
          status: "cleanup",
          broadcastId: broadcastResult.broadcastId || null,
        })
      } catch (error) {
        await markEmailLogsFailed({ runId: input.runId, emailType })
        await updateMarketingRunStatus({
          runId: input.runId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Broadcast failed",
          finishedAt: true,
        })
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
        existingContacts,
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

async function markEmailLogsFailed(input: { runId: string; emailType: string }) {
  await sql`
    UPDATE email_logs
    SET status = 'failed'
    WHERE email_type = ${input.emailType}
      AND status = 'queued'
      AND user_email IN (
        SELECT email FROM marketing_send_queue WHERE run_id = ${input.runId}
      )
  `
}
