import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Get all automation sequences for the email library
 */
export async function GET(request: Request) {
  try {
    // Check authentication
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

    const sequences = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        status,
        subject_line,
        body_html,
        target_audience,
        created_at,
        updated_at
      FROM admin_email_campaigns
      WHERE campaign_type = 'resend_automation_sequence'
      ORDER BY created_at DESC
    `

    // Parse sequence data and format for display
    const formattedSequences = sequences.map((seq: any) => {
      let sequenceData = null
      try {
        sequenceData = typeof seq.body_html === 'string' 
          ? JSON.parse(seq.body_html)
          : seq.body_html
      } catch (e) {
        // If parsing fails, construct from campaign data
        const targetAudience = seq.target_audience || {}
        sequenceData = {
          sequenceName: seq.campaign_name,
          segmentId: targetAudience.resend_segment_id,
          segmentName: targetAudience.segment_name,
          triggerType: targetAudience.trigger_type || 'immediate',
          emails: targetAudience.sequence_emails || [],
          totalEmails: targetAudience.sequence_emails?.length || 0,
          status: seq.status || 'draft'
        }
      }

      const targetAudience = seq.target_audience || {}

      return {
        id: seq.id,
        name: seq.campaign_name,
        type: 'automation_sequence',
        status: seq.status || 'draft',
        emailCount: sequenceData?.emails?.length || sequenceData?.totalEmails || 0,
        segmentName: targetAudience.segment_name || 'Unknown Segment',
        createdAt: seq.created_at,
        updatedAt: seq.updated_at,
        sequenceData: sequenceData
      }
    })

    return NextResponse.json({
      success: true,
      sequences: formattedSequences
    })
  } catch (error: any) {
    console.error("[v0] Error getting automation sequences:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get automation sequences", details: error.message },
      { status: 500 }
    )
  }
}











