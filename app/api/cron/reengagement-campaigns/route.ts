import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getSegmentMembers } from "@/lib/email/segmentation"
import { addLoopsContactTags } from '@/lib/loops/manage-contact'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Re-Engagement Campaigns - Loops Integration
 * 
 * This cron job triggers Loops re-engagement sequences by adding tags to contacts.
 * The actual emails are sent by Loops automations.
 * 
 * Runs daily at 12 PM UTC
 * 
 * Setup required in Loops:
 * 1. Create re-engagement automations triggered by tags matching campaign names
 * 2. Tag format: "reengagement-{campaign_id}" or use campaign-specific tags
 * 3. Email content should match templates in reengagement_campaigns table
 * 
 * Note: Each campaign in reengagement_campaigns table should have a corresponding
 * Loops automation that triggers when the tag is added.
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

        // Trigger Loops sequences by tagging users
        let sent = 0
        let failed = 0

        // Create tag for this campaign (use campaign ID or name-based tag)
        const campaignTag = `reengagement-${campaign.id}`

        for (const email of eligibleMembers) {
          try {
            // Add user to Loops sequence by tagging them
            // This triggers the re-engagement automation in Loops
            const loopsResult = await addLoopsContactTags(
              email,
              ['reengagement', campaignTag]
            )

            if (loopsResult.success) {
              // Track send (sequence triggered)
              await sql`
                INSERT INTO reengagement_sends (campaign_id, user_email, sent_at)
                VALUES (${campaign.id}, ${email}, NOW())
                ON CONFLICT (campaign_id, user_email) DO NOTHING
              `
              sent++
              console.log(`[v0] [Re-Engagement] ✅ Tagged in Loops for campaign ${campaign.id}: ${email}`)
            } else {
              throw new Error(loopsResult.error || "Failed to add Loops tags")
            }
          } catch (error: any) {
            console.error(`[v0] [Re-Engagement] Failed to tag ${email} in Loops:`, error)
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
