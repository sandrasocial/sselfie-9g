import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateUpsellDay10Email } from "@/lib/email/templates/upsell-day-10"
import { generateUpsellFreebieMembershipEmail } from "@/lib/email/templates/upsell-freebie-membership"

const sql = neon(process.env.DATABASE_URL!)

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
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized upsell-campaigns cron request")
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

    for (const subscriber of day10Subscribers) {
      try {
        const emailContent = generateUpsellDay10Email({
          firstName: subscriber.name?.split(" ")[0] || undefined,
          recipientEmail: subscriber.email,
        })

        const emailResult = await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "upsell-day-10",
        })

        if (emailResult.success) {
          results.day10Sent++
          results.details.push({
            email: subscriber.email,
            day: 10,
            success: true,
          })
          console.log(`[v0] [CRON] ✅ Day 10 upsell sent to ${subscriber.email}`)
        } else {
          throw new Error(emailResult.error || "Email send failed")
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          email: subscriber.email,
          day: 10,
          success: false,
          error: error.message,
        })
        console.error(`[v0] [CRON] ❌ Error sending Day 10 upsell to ${subscriber.email}:`, error.message)
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

    for (const subscriber of day20Subscribers) {
      try {
        const emailContent = generateUpsellFreebieMembershipEmail({
          firstName: subscriber.name?.split(" ")[0] || undefined,
          recipientEmail: subscriber.email,
        })

        const emailResult = await sendEmail({
          to: subscriber.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: "upsell-freebie-membership",
        })

        if (emailResult.success) {
          results.day20Sent++
          results.details.push({
            email: subscriber.email,
            day: 20,
            success: true,
          })
          console.log(`[v0] [CRON] ✅ Day 20 upsell sent to ${subscriber.email}`)
        } else {
          throw new Error(emailResult.error || "Email send failed")
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          email: subscriber.email,
          day: 20,
          success: false,
          error: error.message,
        })
        console.error(`[v0] [CRON] ❌ Error sending Day 20 upsell to ${subscriber.email}:`, error.message)
      }
    }

    console.log(
      `[v0] [CRON] Upsell campaigns processing complete: ${results.day10Sent} Day 10 sent, ${results.day20Sent} Day 20 sent, ${results.errors} errors`,
    )

    return NextResponse.json({
      success: true,
      day10Sent: results.day10Sent,
      day20Sent: results.day20Sent,
      errors: results.errors,
      details: results.details,
    })
  } catch (error) {
    console.error("[v0] [CRON] Error in upsell campaigns cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process upsell campaigns" },
      { status: 500 },
    )
  }
}
