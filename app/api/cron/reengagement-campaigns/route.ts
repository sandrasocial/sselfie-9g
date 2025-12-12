import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSegmentMembers } from "@/lib/email/segmentation"
import { sendEmail } from "@/lib/email/send-email"
import { generateWinBackOfferEmail } from "@/lib/email/templates/win-back-offer"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Cron Job: Re-Engagement Campaigns
 * 
 * Automatically sends re-engagement emails to inactive subscribers
 * Runs daily at 12 PM UTC
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[v0] [Re-Engagement] Unauthorized")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    console.log("[v0] [Re-Engagement] Starting re-engagement campaign check...")

    // Get all active re-engagement campaigns
    const campaigns = await sql`
      SELECT * FROM reengagement_campaigns
      WHERE is_active = TRUE
    `

    const results = {
      campaignsProcessed: 0,
      totalSent: 0,
      totalFailed: 0,
      errors: [] as string[],
    }

    for (const campaign of campaigns) {
      try {
        // Check if it's time to send (based on send_frequency_days)
        const lastSent = campaign.last_sent_at
          ? new Date(campaign.last_sent_at)
          : new Date(0)
        const daysSinceLastSent = Math.floor(
          (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (daysSinceLastSent < campaign.send_frequency_days) {
          console.log(
            `[v0] [Re-Engagement] Campaign ${campaign.id} skipped - last sent ${daysSinceLastSent} days ago`,
          )
          continue
        }

        // Get segment members
        const members = await getSegmentMembers(campaign.trigger_segment_id)

        if (members.length === 0) {
          console.log(`[v0] [Re-Engagement] Campaign ${campaign.id} has no members`)
          continue
        }

        // Filter out users who already received this campaign
        const alreadySent = await sql`
          SELECT user_email FROM reengagement_sends
          WHERE campaign_id = ${campaign.id}
        `
        const sentEmails = new Set(alreadySent.map((r: any) => r.user_email))
        const eligibleMembers = members.filter((email) => !sentEmails.has(email))

        console.log(
          `[v0] [Re-Engagement] Campaign ${campaign.id}: ${eligibleMembers.length} eligible members`,
        )

        // Send emails
        let sent = 0
        let failed = 0

        for (const email of eligibleMembers) {
          try {
            // Generate email content based on template type
            let emailContent: { html: string; text: string }
            let subject = campaign.subject_line

            if (campaign.email_template_type === "win_back") {
              emailContent = generateWinBackOfferEmail({
                firstName: email.split("@")[0],
                recipientEmail: email,
                offerAmount: campaign.offer_amount,
                offerCode: campaign.offer_code,
                offerExpiry: "7 days",
                campaignId: campaign.id,
                campaignName: campaign.campaign_name,
              })
            } else {
              // Default template
              emailContent = {
                html: campaign.body_html || "",
                text: campaign.body_text || "",
              }
            }

            const result = await sendEmail({
              to: email,
              subject,
              html: emailContent.html,
              text: emailContent.text,
              emailType: `reengagement_${campaign.id}`,
              campaignId: campaign.id,
            })

            if (result.success) {
              // Track send
              await sql`
                INSERT INTO reengagement_sends (campaign_id, user_email, sent_at)
                VALUES (${campaign.id}, ${email}, NOW())
                ON CONFLICT (campaign_id, user_email) DO NOTHING
              `
              sent++
            } else {
              failed++
            }
          } catch (error: any) {
            console.error(`[v0] [Re-Engagement] Failed to send to ${email}:`, error)
            failed++
          }
        }

        // Update campaign stats
        await sql`
          UPDATE reengagement_campaigns
          SET 
            last_sent_at = NOW(),
            total_sent = total_sent + ${sent},
            updated_at = NOW()
          WHERE id = ${campaign.id}
        `

        results.campaignsProcessed++
        results.totalSent += sent
        results.totalFailed += failed

        console.log(
          `[v0] [Re-Engagement] Campaign ${campaign.id} completed: ${sent} sent, ${failed} failed`,
        )
      } catch (error: any) {
        console.error(`[v0] [Re-Engagement] Error processing campaign ${campaign.id}:`, error)
        results.errors.push(`Campaign ${campaign.id}: ${error.message}`)
      }
    }

    console.log(`[v0] [Re-Engagement] Completed: ${results.campaignsProcessed} campaigns, ${results.totalSent} sent`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] [Re-Engagement] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
