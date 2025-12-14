import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getEmailContent } from "@/lib/email/run-scheduled-campaigns"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

/**
 * GET endpoint to preview email content for a campaign
 * Generates email content using templates if needed
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
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 })
    }

    // Get campaign from database
    const campaigns = await sql`
      SELECT * FROM admin_email_campaigns
      WHERE id = ${parseInt(campaignId)}
      LIMIT 1
    `

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const campaign = campaigns[0]

    // Generate email content (uses template if campaign_type matches)
    // Use admin email as test recipient for preview
    const emailContent = getEmailContent(campaign, ADMIN_EMAIL, "Sandra")

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaign_name: campaign.campaign_name,
        campaign_type: campaign.campaign_type,
        subject_line: campaign.subject_line,
        preview_text: campaign.preview_text,
      },
      email: {
        html: emailContent.html,
        text: emailContent.text,
        templateUsed: emailContent.templateUsed,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error previewing campaign:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to preview campaign",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}












