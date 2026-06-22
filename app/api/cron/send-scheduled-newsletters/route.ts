import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import { sendNewsletterBroadcast } from "@/lib/email/send-newsletter-broadcast"
import { createCronLogger } from "@/lib/cron-logger"
import { acquireCronLock } from "@/lib/cron-lock"

/**
 * Cron Job: Send Scheduled Newsletters
 *
 * Runs every 15 minutes to check for approved newsletter campaigns
 * that are scheduled to be sent and sends them via Resend Broadcasts.
 *
 * Vercel Cron Configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/send-scheduled-newsletters",
 *     "schedule": "*\/15 * * * *"
 *   }]
 * }
 *
 * This cron job is DIFFERENT from your existing sequence cron jobs.
 * - This sends: Gumloop-generated weekly newsletters (broadcasts)
 * - Keep existing: Welcome, nurture, onboarding sequences (automated journeys)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const cronLogger = createCronLogger("send-scheduled-newsletters")
  await cronLogger.start()
  const lock = await acquireCronLock("send-scheduled-newsletters", 20 * 60)

  try {
    console.log('[Cron: Send Newsletters] Starting scheduled newsletter check...')

    // Verify cron secret (security)
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      console.warn('[Cron: Send Newsletters] Unauthorized cron attempt')
      await cronLogger.error(new Error("Unauthorized"))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!lock.acquired) {
      await cronLogger.success({ skipped: true, reason: "lock_not_acquired" })
      return NextResponse.json({ success: true, skipped: true, reason: "lock_not_acquired" })
    }

    const sql = getDb()

    // Find campaigns that are:
    // 1. Approved for sending
    // 2. Scheduled for now or earlier
    // 3. Not already sent
    const campaignsToSend = await sql`
      SELECT
        id,
        campaign_name,
        subject_line,
        scheduled_for,
        status,
        approval_status
      FROM admin_email_campaigns
      WHERE approval_status = 'approved'
        AND status = 'scheduled'
        AND resend_broadcast_id IS NULL
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
    `

    console.log(`[Cron: Send Newsletters] Found ${campaignsToSend.length} campaigns ready to send`)

    if (campaignsToSend.length === 0) {
      await cronLogger.success({
        campaigns: 0,
        sent: 0,
        failed: 0,
      })
      return NextResponse.json({
        success: true,
        message: 'No campaigns ready to send',
        checked_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
    }

    const results = {
      total: campaignsToSend.length,
      sent: [] as number[],
      failed: [] as { id: number; error: string }[]
    }

    // Send each campaign
    for (const campaign of campaignsToSend) {
      try {
        console.log(`[Cron: Send Newsletters] Sending campaign ${campaign.id}: "${campaign.campaign_name}"`)

        const broadcastId = await sendNewsletterBroadcast(campaign.id)

        results.sent.push(campaign.id)

        console.log(`[Cron: Send Newsletters] ✅ Campaign ${campaign.id} sent successfully (broadcast: ${broadcastId})`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        results.failed.push({
          id: campaign.id,
          error: errorMessage
        })

        console.error(`[Cron: Send Newsletters] ❌ Failed to send campaign ${campaign.id}:`, error)

        // Continue to next campaign even if this one failed
      }
    }

    const duration = Date.now() - startTime

    console.log(`[Cron: Send Newsletters] Completed in ${duration}ms:`, {
      total: results.total,
      sent: results.sent.length,
      failed: results.failed.length
    })

    await cronLogger.success({
      campaigns: results.total,
      sent: results.sent.length,
      failed: results.failed.length,
      durationMs: duration,
    })

    return NextResponse.json({
      success: true,
      results,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = Date.now() - startTime

    console.error('[Cron: Send Newsletters] Fatal error:', error)
    await cronLogger.error(error, { durationMs: duration })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } finally {
    await lock.release()
  }
}

/**
 * Manual trigger endpoint (for testing)
 * Call with POST to force check immediately
 */
export async function POST(req: NextRequest) {
  console.log('[Manual Trigger] Manually triggering newsletter send check')
  return GET(req)
}
