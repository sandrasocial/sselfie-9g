import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get("sequenceId")

    if (!sequenceId) {
      return NextResponse.json({ success: false, error: "sequenceId is required" }, { status: 400 })
    }

    const sequences = await sql`
      SELECT id, name, description, created_at, updated_at
      FROM email_sequences
      WHERE id = ${sequenceId}
      LIMIT 1
    `

    if (sequences.length === 0) {
      return NextResponse.json({ success: false, error: "Sequence not found" }, { status: 404 })
    }

    const steps = await sql`
      SELECT id, step_number, subject, preview, body, delay_hours, ai_generated, created_at
      FROM email_sequence_steps
      WHERE sequence_id = ${sequenceId}
      ORDER BY step_number ASC
    `

    return NextResponse.json({ success: true, sequence: sequences[0], steps })
  } catch (error) {
    console.error("[API] Error fetching sequence detail:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
