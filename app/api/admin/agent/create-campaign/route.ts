import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

// All available segments with their IDs
const SEGMENTS = {
  all_subscribers: "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd",
  beta_users: "31080fb1-e957-4b41-af72-6f042e4fa869",
  paid_users: "f7ed7f32-b103-400a-a8e8-ddbbe0e4d97b",
  cold_users: "e515e2d6-1f0e-4a4c-beec-323b8758be61",
}

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

    const body = await request.json()
    const {
      campaign_name,
      subject_line,
      html_content,
      preview_text,
      create_for_all_segments = true, // Default to creating for all segments
      specific_segments, // Optional: array of segment names to create for
      scheduled_for, // Optional: ISO date string for scheduling
    } = body

    // Validate required fields
    if (!subject_line || !html_content) {
      return NextResponse.json(
        { error: "Missing required fields: subject_line, html_content" },
        { status: 400 }
      )
    }

    // Determine which segments to create campaigns for
    let segmentsToCreate: string[] = []
    if (create_for_all_segments) {
      segmentsToCreate = Object.keys(SEGMENTS)
    } else if (specific_segments && Array.isArray(specific_segments)) {
      segmentsToCreate = specific_segments.filter((seg: string) => SEGMENTS[seg as keyof typeof SEGMENTS])
    } else {
      return NextResponse.json(
        { error: "Must specify create_for_all_segments=true or provide specific_segments array" },
        { status: 400 }
      )
    }

    // Determine status based on scheduled_for
    let status = "draft"
    if (scheduled_for) {
      const scheduledDate = new Date(scheduled_for)
      if (scheduledDate > new Date()) {
        status = "scheduled"
      }
    }

    const createdCampaigns = []

    // Create a campaign for each segment
    for (const segmentName of segmentsToCreate) {
      const segmentId = SEGMENTS[segmentName as keyof typeof SEGMENTS]
      const campaignName = campaign_name || `${subject_line} - ${segmentName.replace('_', ' ')}`

      try {
        const result = await sql`
          INSERT INTO admin_email_campaigns (
            campaign_name, campaign_type, subject_line, preview_text,
            body_html, body_text, status, target_audience,
            scheduled_for, created_by, created_at, updated_at
          ) VALUES (
            ${campaignName}, 'newsletter', ${subject_line}, ${preview_text || null},
            ${html_content}, ${html_content.replace(/<[^>]*>/g, '')}, ${status},
            ${JSON.stringify({ resend_segment_id: segmentId })},
            ${scheduled_for || null}, ${ADMIN_EMAIL}, NOW(), NOW()
          )
          RETURNING id, campaign_name, campaign_type, subject_line, status, target_audience
        `

        const campaign = result[0]
        createdCampaigns.push({
          id: campaign.id,
          campaign_name: campaign.campaign_name,
          segment: segmentName,
          segment_id: segmentId,
          status: campaign.status,
        })

        console.log(`[v0] ✅ Created campaign ${campaign.id} for segment: ${segmentName}`)
      } catch (error: any) {
        console.error(`[v0] ❌ Error creating campaign for ${segmentName}:`, error)
        createdCampaigns.push({
          segment: segmentName,
          error: error.message || "Failed to create campaign",
        })
      }
    }

    const successCount = createdCampaigns.filter((c: any) => c.id).length
    const failCount = createdCampaigns.filter((c: any) => c.error).length

    return NextResponse.json({
      success: true,
      message: `Created ${successCount} campaign(s) for ${segmentsToCreate.length} segment(s)`,
      campaigns: createdCampaigns,
      summary: {
        total: segmentsToCreate.length,
        successful: successCount,
        failed: failCount,
      },
      next_steps: [
        "Campaigns are saved as drafts in admin_email_campaigns table",
        "Preview them at /admin/test-campaigns",
        "Set scheduled_for date to schedule them",
        "Or use /api/admin/email/run-scheduled-campaigns to send them",
      ],
    })
  } catch (error: any) {
    console.error("[v0] Error creating campaigns:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create campaigns",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

