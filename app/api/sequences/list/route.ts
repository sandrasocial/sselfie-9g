import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const sequences = await sql`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        COUNT(st.id) as step_count
      FROM email_sequences s
      LEFT JOIN email_sequence_steps st ON st.sequence_id = s.id
      GROUP BY s.id, s.name, s.description, s.created_at, s.updated_at
      ORDER BY s.updated_at DESC
    `

    return NextResponse.json({ success: true, sequences })
  } catch (error) {
    console.error("[API] Error listing sequences:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
