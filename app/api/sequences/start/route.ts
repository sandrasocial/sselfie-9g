import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { sequenceId, subscriberIds } = await request.json()

    if (!sequenceId || !subscriberIds || subscriberIds.length === 0) {
      return NextResponse.json({ success: false, error: "sequenceId and subscriberIds are required" }, { status: 400 })
    }

    for (const subscriberId of subscriberIds) {
      await sql`
        INSERT INTO email_sequence_instances (sequence_id, subscriber_id, started_at, status)
        VALUES (${sequenceId}, ${subscriberId}, NOW(), 'running')
      `

      await sql`
        INSERT INTO workflow_queue (
          subscriber_id, workflow_type, status, metadata, created_at
        )
        SELECT 
          ${subscriberId},
          'run_sequence_step',
          'pending',
          jsonb_build_object('sequenceId', ${sequenceId}, 'subscriberId', ${subscriberId}, 'stepNumber', 1),
          NOW()
        FROM blueprint_subscribers
        WHERE id = ${subscriberId}
        LIMIT 1
      `
    }

    return NextResponse.json({ success: true, message: `Sequence started for ${subscriberIds.length} subscribers` })
  } catch (error) {
    console.error("[API] Error starting sequence:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
