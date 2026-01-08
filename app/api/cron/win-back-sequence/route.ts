// Win-Back Automation
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateWinBackOfferEmail } from "@/lib/email/templates/win-back-offer"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Win-Back Sequence - Resend Direct Sends
 * 
 * Sends win-back offer emails to canceled subscribers directly via Resend API.
 * 
 * GET /api/cron/win-back-sequence
 * 
 * Protected by CRON_SECRET environment variable
 * Runs daily at 10 AM UTC (same as other email sequences)
 * 
 * Email template:
 * - Win-Back Offer: "We Miss You - Here's Something Special"
 * 
 * Logic:
 * - Targets subscriptions where status='canceled' and updated_at >= 10 days ago
 * - Skips users who have resubscribed (status='active')
 * - Skips users who already received win-back email
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("win-back-sequence")
  await cronLogger.start()

  try {
    // Win-Back Automation - Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [CRON] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[v0] [CRON] WARNING: CRON_SECRET not set in production!")
    }

    console.log("[v0] [CRON] Starting win-back email sequence...")

    const results = {
      found: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ email: string; error: string }>,
    }

    // Win-Back Automation - Query canceled subscriptions where updated_at >= 10 days ago
    // Note: Using updated_at as proxy for canceled_at since subscriptions table doesn't have canceled_at field
    // When status changes to 'canceled', updated_at is set to that timestamp
    // We check email_logs to prevent sending duplicate emails (allows sending to anyone canceled >= 10 days ago)
    const canceledSubscriptions = await sql`
      SELECT 
        s.id,
        s.user_id,
        s.status,
        s.updated_at,
        u.email,
        u.display_name
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN email_logs el ON el.user_email = u.email AND el.email_type = 'win-back-offer'
      WHERE s.status = 'canceled'
        AND s.updated_at <= NOW() - INTERVAL '10 days'
        AND u.email IS NOT NULL
        AND u.email != ''
        AND el.id IS NULL
        -- Skip if user has reactivated (has active subscription)
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s2 
          WHERE s2.user_id = s.user_id 
          AND s2.status = 'active'
        )
      ORDER BY s.updated_at ASC
    `

    results.found = canceledSubscriptions.length
    console.log(`[v0] [CRON] Found ${canceledSubscriptions.length} canceled subscriptions for win-back email`)

    for (const subscription of canceledSubscriptions) {
      try {
        // Win-Back Automation - Check if already sent (dedupe check)
        const existingLog = await sql`
          SELECT id FROM email_logs
          WHERE user_email = ${subscription.email}
          AND email_type = 'win-back-offer'
          LIMIT 1
        `
        if (existingLog.length > 0) {
          results.skipped++
          continue
        }

        // Win-Back Automation - Double-check user hasn't reactivated
        const activeSubscription = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${subscription.user_id}
          AND status = 'active'
          LIMIT 1
        `
        if (activeSubscription.length > 0) {
          results.skipped++
          console.log(`[v0] [CRON] ⏭️ Skipping ${subscription.email} - user has reactivated subscription`)
          continue
        }

        const firstName = subscription.display_name?.split(" ")[0] || undefined
        
        // Win-Back Automation - Generate win-back email with default offer
        // Default: 20% off first month (can be customized via environment variables)
        const offerDiscount = parseInt(process.env.WIN_BACK_DISCOUNT_PERCENT || "20", 10)
        const offerCode = process.env.WIN_BACK_PROMO_CODE || "COMEBACK20"
        const offerExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })

        const emailContent = generateWinBackOfferEmail({
          firstName,
          recipientEmail: subscription.email,
          offerDiscount,
          offerCode,
          offerExpiry,
        })

        const sendResult = await sendEmail({
          to: subscription.email,
          subject: "We Miss You - Here's Something Special",
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "win-back-offer",
        })

        if (sendResult.success) {
          // Email is already logged by sendEmail via email_logs
          results.sent++
          console.log(`[v0] [CRON] ✅ Sent win-back email to ${subscription.email}`)
        } else {
          throw new Error(sendResult.error || 'Failed to send email')
        }
      } catch (error: any) {
        results.failed++
        results.errors.push({
          email: subscription.email,
          error: error.message || "Unknown error",
        })
        console.error(`[v0] [CRON] ❌ Failed to send win-back email to ${subscription.email}:`, error)
        await logAdminError({
          toolName: "cron:win-back-sequence",
          error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
          context: { 
            subscriberEmail: subscription.email, 
            subscriptionId: subscription.id,
            userId: subscription.user_id,
          },
        }).catch(() => {})
      }
    }

    console.log(
      `[v0] [CRON] Win-back sequence completed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`,
    )

    await cronLogger.success({
      found: results.found,
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped,
    })

    return NextResponse.json({
      success: true,
      message: `Win-back emails sent: ${results.sent} successful, ${results.failed} failed, ${results.skipped} skipped`,
      summary: {
        found: results.found,
        sent: results.sent,
        failed: results.failed,
        skipped: results.skipped,
      },
      errors: results.errors.slice(0, 10), // Limit errors in response
      totalErrors: results.errors.length,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in win-back sequence cron:", error)
    await cronLogger.error(error, {})
    await logAdminError({
      toolName: "cron:win-back-sequence",
      error: error instanceof Error ? error : new Error(String(error)),
      context: {},
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run win-back sequence cron",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
