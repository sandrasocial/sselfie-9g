import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { subscriberId, campaignId, sequenceId, stepId, emailType } = await request.json()

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
        created_at
      ) VALUES (
        ${subscriberId},
        ${emailType || "unknown"},
        ${campaignId || null},
        ${sequenceId || null},
        ${stepId || null},
        'opened',
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error logging email open:", error)
    return NextResponse.json({ error: "Failed to log email open" }, { status: 500 })
  }
}
