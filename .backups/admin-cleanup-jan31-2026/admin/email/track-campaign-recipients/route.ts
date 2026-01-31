import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

/**
 * API Route: Track Campaign Recipients
 * 
 * Adds all recipients from a campaign to the welcome_back_sequence table
 * so they can receive Day 7 and Day 14 follow-up emails automatically.
 * 
 * POST /api/admin/email/track-campaign-recipients
 * 
 * Body: { campaignId: number }
 * 
 * This should be run AFTER sending the initial "Welcome Back" campaign
 * to ensure recipients get follow-up emails.
 */
export async function POST(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { campaignId } = await request.json()

    if (!campaignId || typeof campaignId !== "number") {
      return NextResponse.json(
        { error: "campaignId is required and must be a number" },
        { status: 400 },
      )
    }

    console.log(`[v0] Tracking recipients for campaign ${campaignId}`)

    // Get campaign details
    const campaign = await sql`
      SELECT id, campaign_name, sent_at
      FROM admin_email_campaigns
      WHERE id = ${campaignId}
    `

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: `Campaign ${campaignId} not found` },
        { status: 404 },
      )
    }

    const campaignData = campaign[0]

    // Get all emails sent for this campaign from email_logs
    // Check both campaign_id and email_type pattern (for backwards compatibility)
    const recipients = await sql`
      SELECT DISTINCT user_email
      FROM email_logs
      WHERE (
        campaign_id = ${campaignId}
        OR email_type = ${`campaign-${campaignId}`}
        OR email_type LIKE ${`campaign-${campaignId}-%`}
      )
      AND status = 'sent'
      AND user_email IS NOT NULL
      AND user_email != ''
    `

    console.log(`[v0] Found ${recipients.length} recipients for campaign ${campaignId}`)

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recipients found for this campaign",
        totalRecipients: 0,
        addedToSequence: 0,
      })
    }

    // Add each recipient to welcome_back_sequence table
    let added = 0
    let skipped = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      try {
        // Check if already exists
        const exists = await sql`
          SELECT id FROM welcome_back_sequence
          WHERE user_email = ${recipient.user_email}
          LIMIT 1
        `

        if (exists.length > 0) {
          // Update existing record with campaign info if not set
          await sql`
            UPDATE welcome_back_sequence
            SET 
              initial_campaign_id = COALESCE(initial_campaign_id, ${campaignId}),
              day_0_sent_at = COALESCE(day_0_sent_at, ${campaignData.sent_at || new Date()}),
              updated_at = NOW()
            WHERE user_email = ${recipient.user_email}
          `
          skipped++
        } else {
          // Insert new record
          await sql`
            INSERT INTO welcome_back_sequence (
              user_email,
              initial_campaign_id,
              day_0_sent_at
            ) VALUES (
              ${recipient.user_email},
              ${campaignId},
              ${campaignData.sent_at || new Date()}
            )
          `
          added++
        }
      } catch (error: any) {
        const errorMsg = `Failed to add ${recipient.user_email}: ${error.message}`
        errors.push(errorMsg)
        console.error(`[v0] ${errorMsg}`)
      }
    }

    console.log(`[v0] Added ${added} new recipients, skipped ${skipped} existing`)

    return NextResponse.json({
      success: true,
      message: `Campaign recipients tracked successfully`,
      campaignId: campaignId,
      campaignName: campaignData.campaign_name,
      totalRecipients: recipients.length,
      addedToSequence: added,
      skipped: skipped,
      errors: errors.slice(0, 10), // Limit errors in response
      totalErrors: errors.length,
    })
  } catch (error: any) {
    console.error("[v0] Error tracking campaign recipients:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to track campaign recipients",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint to check tracking status for a campaign
 */
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId query parameter is required" },
        { status: 400 },
      )
    }

    // Get campaign details
    const campaign = await sql`
      SELECT id, campaign_name, sent_at, total_sent
      FROM admin_email_campaigns
      WHERE id = ${parseInt(campaignId)}
    `

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: `Campaign ${campaignId} not found` },
        { status: 404 },
      )
    }

    // Count recipients in email_logs (check both campaign_id and email_type pattern)
    const emailLogsCount = await sql`
      SELECT COUNT(DISTINCT user_email) as count
      FROM email_logs
      WHERE (
        campaign_id = ${parseInt(campaignId)}
        OR email_type = ${`campaign-${parseInt(campaignId)}`}
        OR email_type LIKE ${`campaign-${parseInt(campaignId)}-%`}
      )
      AND status = 'sent'
    `

    // Count recipients in welcome_back_sequence
    const sequenceCount = await sql`
      SELECT COUNT(*) as count
      FROM welcome_back_sequence
      WHERE initial_campaign_id = ${parseInt(campaignId)}
    `

    return NextResponse.json({
      success: true,
      campaign: campaign[0],
      tracking: {
        totalSent: emailLogsCount[0]?.count || 0,
        inSequence: sequenceCount[0]?.count || 0,
        notTracked: (emailLogsCount[0]?.count || 0) - (sequenceCount[0]?.count || 0),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error checking campaign tracking:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check campaign tracking",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
