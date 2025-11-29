import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 })
    }

    const events = await sql`
      SELECT event_type, event_name, url, metadata, created_at
      FROM funnel_events
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ events })
  } catch (error) {
    console.error("[API] Funnel events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
