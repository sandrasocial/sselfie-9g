import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateUpsellDay10Email } from "@/lib/email/templates/upsell-day-10"
import { generateUpsellFreebieMembershipEmail } from "@/lib/email/templates/upsell-freebie-membership"
import { sendMarketingBroadcast, syncMarketingContacts } from "@/lib/email/marketing-sender"
import { MARKETING_SEGMENTS } from "@/lib/email/config"
import { createCronLogger } from "@/lib/cron-logger"

const sql = neon(process.env.DATABASE_URL!)

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

/**
 * GET /api/cron/upsell-campaigns
 * 
 * Cron job to send upsell emails to freebie subscribers
 * Runs daily at 10 AM UTC
 * 
 * - Day 10: Send upsell-day-10.tsx
 * - Day 20: Send upsell-freebie-membership.tsx (optional stagger)
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("upsell-campaigns")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      await cronLogger.error(new Error("Cron secret not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized upsell-campaigns cron request")
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting upsell campaigns processing...")

    const results = {
      day10Sent: 0,
      day20Sent: 0,
      errors: 0,
      details: [] as Array<{ email: string; day: number; success: boolean; error?: string }>,
    }

    // Day 10: Find freebie subscribers who signed up 10 days ago
    const day10Subscribers = await sql`
      SELECT DISTINCT
        fs.email,
        fs.name,
        fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'upsell-day-10'
      LEFT JOIN users u ON u.email = fs.email
      WHERE fs.created_at < NOW() - INTERVAL '10 days'
      AND fs.created_at >= NOW() - INTERVAL '11 days'
      AND fs.converted_to_user = FALSE
      AND el.id IS NULL
      AND u.id IS NULL
      LIMIT 100
    `

    console.log(`[v0] [CRON] Found ${day10Subscribers.length} subscribers for Day 10 upsell`)

    if (day10Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.upsellDay10) {
          throw new Error("RESEND_SEGMENT_UPSELL_DAY_10 not configured")
        }

        const day10Emails = day10Subscribers.map((subscriber: any) => subscriber.email)
        const contacts = day10Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))

        const emailContent = generateUpsellDay10Email({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await syncMarketingContacts({
          tagKey: "sequence_upsell_day_10",
          tagValue: "true",
          segmentId: MARKETING_SEGMENTS.upsellDay10,
          contacts,
        })

        await sendMarketingBroadcast({
          campaignKey: "upsell-day-10",
          segmentId: MARKETING_SEGMENTS.upsellDay10,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          estimatedRecipientCount: day10Subscribers.length,
        })

        await sql`
          INSERT INTO email_logs (user_email, email_type, status, sent_at)
          SELECT unnest(${day10Emails}::text[]), 'upsell-day-10', 'sent', NOW()
        `

        await syncMarketingContacts({
          tagKey: "sequence_upsell_day_10",
          tagValue: "false",
          segmentId: MARKETING_SEGMENTS.upsellDay10,
          removeFromSegment: true,
          contacts,
        })

        results.day10Sent = day10Subscribers.length
      } catch (error: any) {
        results.errors += day10Subscribers.length
        results.details.push({
          email: "broadcast",
          day: 10,
          success: false,
          error: error.message,
        })
        console.error("[v0] [CRON] ❌ Error sending Day 10 broadcast:", error.message)
      }
    }

    // Day 20: Find freebie subscribers who signed up 20 days ago
    const day20Subscribers = await sql`
      SELECT DISTINCT
        fs.email,
        fs.name,
        fs.created_at
      FROM freebie_subscribers fs
      LEFT JOIN email_logs el ON el.user_email = fs.email AND el.email_type = 'upsell-freebie-membership'
      LEFT JOIN users u ON u.email = fs.email
      WHERE fs.created_at < NOW() - INTERVAL '20 days'
      AND fs.created_at >= NOW() - INTERVAL '21 days'
      AND fs.converted_to_user = FALSE
      AND el.id IS NULL
      AND u.id IS NULL
      LIMIT 100
    `

    console.log(`[v0] [CRON] Found ${day20Subscribers.length} subscribers for Day 20 upsell`)

    if (day20Subscribers.length > 0) {
      try {
        if (!MARKETING_SEGMENTS.upsellFreebieMembership) {
          throw new Error("RESEND_SEGMENT_UPSELL_FREEBIE_MEMBERSHIP not configured")
        }

        const day20Emails = day20Subscribers.map((subscriber: any) => subscriber.email)
        const contacts = day20Subscribers.map((subscriber: any) => ({
          email: subscriber.email,
          firstName: subscriber.name?.split(" ")[0],
        }))

        const emailContent = generateUpsellFreebieMembershipEmail({
          firstName: FIRST_NAME_PLACEHOLDER,
          recipientEmail: EMAIL_PLACEHOLDER,
        })

        await syncMarketingContacts({
          tagKey: "sequence_upsell_freebie_membership",
          tagValue: "true",
          segmentId: MARKETING_SEGMENTS.upsellFreebieMembership,
          contacts,
        })

        await sendMarketingBroadcast({
          campaignKey: "upsell-freebie-membership",
          segmentId: MARKETING_SEGMENTS.upsellFreebieMembership,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          estimatedRecipientCount: day20Subscribers.length,
        })

        await sql`
          INSERT INTO email_logs (user_email, email_type, status, sent_at)
          SELECT unnest(${day20Emails}::text[]), 'upsell-freebie-membership', 'sent', NOW()
        `

        await syncMarketingContacts({
          tagKey: "sequence_upsell_freebie_membership",
          tagValue: "false",
          segmentId: MARKETING_SEGMENTS.upsellFreebieMembership,
          removeFromSegment: true,
          contacts,
        })

        results.day20Sent = day20Subscribers.length
      } catch (error: any) {
        results.errors += day20Subscribers.length
        results.details.push({
          email: "broadcast",
          day: 20,
          success: false,
          error: error.message,
        })
        console.error("[v0] [CRON] ❌ Error sending Day 20 broadcast:", error.message)
      }
    }

    console.log(
      `[v0] [CRON] Upsell campaigns processing complete: ${results.day10Sent} Day 10 sent, ${results.day20Sent} Day 20 sent, ${results.errors} errors`,
    )

    await cronLogger.success({
      day10Sent: results.day10Sent,
      day20Sent: results.day20Sent,
      errors: results.errors,
    })

    return NextResponse.json({
      success: true,
      day10Sent: results.day10Sent,
      day20Sent: results.day20Sent,
      errors: results.errors,
      details: results.details,
    })
  } catch (error) {
    console.error("[v0] [CRON] Error in upsell campaigns cron:", error)
    await cronLogger.error(error, { reason: "Upsell campaigns cron failed" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process upsell campaigns" },
      { status: 500 },
    )
  }
}
