import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"

interface AnalyticsBody {
  eventType: "impression" | "dismiss" | "cta_click"
  opportunityType?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    const body = (await req.json().catch(() => ({}))) as AnalyticsBody
    if (!body.eventType) {
      return NextResponse.json({ success: false, error: "Missing eventType" }, { status: 400 })
    }

    const sql = getDb()

    await sql`
      CREATE TABLE IF NOT EXISTS upgrade_analytics (
        id SERIAL PRIMARY KEY,
        user_id UUID,
        event_type TEXT,
        opportunity_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await sql`
      INSERT INTO upgrade_analytics (user_id, event_type, opportunity_type)
      VALUES (${neonUser.id}, ${body.eventType}, ${body.opportunityType || null})
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] [UPGRADE_ANALYTICS] Error recording event:", error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
