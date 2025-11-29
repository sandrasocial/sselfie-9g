import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { subscriberId, campaignId, sequenceId, stepId, emailType, linkUrl } = await request.json()

    if (!subscriberId) {
      return NextResponse.json({ error: "subscriberId is required" }, { status: 400 })
    }

    await sql`
      INSERT INTO email_events (
        subscriber_id,
        email_type,
        campaign_id,
        sequence_id,
        step_id,
        status,
        metadata,
        created_at
      ) VALUES (
        ${subscriberId},
        ${emailType || "unknown"},
        ${campaignId || null},
        ${sequenceId || null},
        ${stepId || null},
        'clicked',
        ${JSON.stringify({ linkUrl: linkUrl || null })},
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging email click:", error)
    return NextResponse.json({ error: "Failed to log email click" }, { status: 500 })
  }
}
