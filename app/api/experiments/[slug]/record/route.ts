import { type NextRequest, NextResponse } from "next/server"
import { recordEvent } from "@/lib/experiments/abEngine"

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    const body = await request.json()
    const { event, variant, session_id, metadata } = body

    if (!event || !variant || !session_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await recordEvent({
      experimentSlug: slug,
      variant,
      event,
      sessionId: session_id,
      metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error recording A/B event:", error)
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 })
  }
}
