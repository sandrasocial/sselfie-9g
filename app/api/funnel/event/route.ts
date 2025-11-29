import { type NextRequest, NextResponse } from "next/server"
import { createFunnelEvent } from "@/lib/tracking/funnel"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_type, event_name, url, metadata, user_id, email, session_id } = body

    // Validate required fields
    if (!event_type || !event_name || !session_id) {
      return NextResponse.json(
        { error: "Missing required fields: event_type, event_name, session_id" },
        { status: 400 },
      )
    }

    // Track the event
    await createFunnelEvent({
      event_type,
      event_name,
      url,
      metadata,
      user_id,
      email,
      session_id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Funnel event error:", error)
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 })
  }
}
