import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Update a specific email in an automation sequence
 */
export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { sequenceId, emailIndex, html } = body

    if (!sequenceId || emailIndex === undefined || !html) {
      return NextResponse.json(
        { error: "Sequence ID, email index, and HTML content are required" },
        { status: 400 }
      )
    }

    console.log(`[v0] Updating email ${emailIndex} in sequence ${sequenceId}...`)

    // Get sequence from database
    const sequenceRecord = await sql`
      SELECT id, campaign_name, body_html, target_audience
      FROM admin_email_campaigns
      WHERE id = ${sequenceId}
      AND campaign_type = 'resend_automation_sequence'
    `

    if (sequenceRecord.length === 0) {
      return NextResponse.json(
        { error: `Sequence ${sequenceId} not found` },
        { status: 404 }
      )
    }

    const sequence = sequenceRecord[0]
    
    // Parse sequence data
    let sequenceData: any
    try {
      sequenceData = typeof sequence.body_html === 'string' 
        ? JSON.parse(sequence.body_html)
        : sequence.body_html
    } catch (e) {
      console.error("Error parsing sequence data:", e)
      return NextResponse.json(
        { error: "Invalid sequence data format" },
        { status: 400 }
      )
    }

    // Validate email index
    if (!sequenceData.emails || !Array.isArray(sequenceData.emails)) {
      return NextResponse.json(
        { error: "Sequence has no emails" },
        { status: 400 }
      )
    }

    if (emailIndex < 0 || emailIndex >= sequenceData.emails.length) {
      return NextResponse.json(
        { error: `Invalid email index. Sequence has ${sequenceData.emails.length} emails.` },
        { status: 400 }
      )
    }

    // Update the specific email
    sequenceData.emails[emailIndex].html = html

    // Save updated sequence data back to database
    await sql`
      UPDATE admin_email_campaigns
      SET 
        body_html = ${JSON.stringify(sequenceData)},
        updated_at = NOW()
      WHERE id = ${sequenceId}
    `

    console.log(`[v0] ✅ Updated email ${emailIndex} in sequence ${sequenceId}`)

    return NextResponse.json({
      success: true,
      sequenceId,
      emailIndex,
      message: `Email ${emailIndex + 1} updated successfully`,
    })
  } catch (error: any) {
    console.error("[v0] Error updating sequence email:", error)
    return NextResponse.json(
      { error: "Failed to update email", details: error.message },
      { status: 500 }
    )
  }
}

