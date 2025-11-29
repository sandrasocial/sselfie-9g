import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) return guard

    const { searchParams } = new URL(request.url)
    const subscriberId = searchParams.get("id")

    if (!subscriberId) {
      return NextResponse.json({ success: false, error: "Missing subscriber ID" }, { status: 400 })
    }

    // Fetch subscriber data with signals
    const subscriber = await sql`
      SELECT 
        bs.*,
        (
          SELECT signal_value 
          FROM blueprint_signals 
          WHERE subscriber_id = bs.id AND signal_type = 'focus' 
          ORDER BY created_at DESC LIMIT 1
        ) as focus,
        (
          SELECT signal_value 
          FROM blueprint_signals 
          WHERE subscriber_id = bs.id AND signal_type = 'stuck' 
          ORDER BY created_at DESC LIMIT 1
        ) as stuck,
        (
          SELECT signal_value 
          FROM blueprint_signals 
          WHERE subscriber_id = bs.id AND signal_type = 'timeline' 
          ORDER BY created_at DESC LIMIT 1
        ) as timeline
      FROM blueprint_subscribers bs
      WHERE bs.id = ${Number.parseInt(subscriberId)}
    `

    if (subscriber.length === 0) {
      return NextResponse.json({ success: false, error: "Subscriber not found" }, { status: 404 })
    }

    const data = subscriber[0]

    return NextResponse.json({
      success: true,
      data: {
        email: data.email,
        name: data.name,
        readiness_label: data.readiness_label || "cold",
        intent_score: data.intent_score || 0,
        focus: data.focus || "Not specified",
        stuck: data.stuck || "Not specified",
        timeline: data.timeline || "Not specified",
        maya_alignment_notes: data.maya_alignment_notes || "",
      },
    })
  } catch (error) {
    console.error("[NextStep] Error fetching next step data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch data" }, { status: 500 })
  }
}
