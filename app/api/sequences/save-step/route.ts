import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { sequenceId, stepNumber, subject, preview, body, delayHours, aiGenerated } = await request.json()

    if (!sequenceId || !stepNumber) {
      return NextResponse.json({ success: false, error: "sequenceId and stepNumber are required" }, { status: 400 })
    }

    await sql`
      INSERT INTO email_sequence_steps (
        sequence_id, step_number, subject, preview, body, delay_hours, ai_generated, created_at
      )
      VALUES (
        ${sequenceId}, ${stepNumber}, ${subject || null}, ${preview || null}, ${body || null}, 
        ${delayHours || 24}, ${aiGenerated || false}, NOW()
      )
      ON CONFLICT (sequence_id, step_number)
      DO UPDATE SET
        subject = EXCLUDED.subject,
        preview = EXCLUDED.preview,
        body = EXCLUDED.body,
        delay_hours = EXCLUDED.delay_hours,
        ai_generated = EXCLUDED.ai_generated
    `

    await sql`
      UPDATE email_sequences
      SET updated_at = NOW()
      WHERE id = ${sequenceId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error saving step:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
