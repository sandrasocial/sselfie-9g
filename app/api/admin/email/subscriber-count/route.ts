import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAudienceContactCount } from "@/lib/resend/get-audience-contacts"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET(request: Request) {
  console.log("[v0] Subscriber count API called")
  try {
    // Require admin authentication
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) return guard
    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (audienceId) {
      console.log("[v0] Using Resend audience ID:", audienceId)
      const count = await getAudienceContactCount(audienceId)
      console.log("[v0] Resend subscriber count:", count)
      return NextResponse.json({ count })
    }

    console.log("[v0] No RESEND_AUDIENCE_ID, falling back to database")
    const sql = neon(process.env.DATABASE_URL!)
    console.log("[v0] Database connection created")

    const result = await sql`
      SELECT COUNT(*) as count 
      FROM freebie_subscribers
    `

    console.log("[v0] Query result:", result)
    const count = Number(result[0].count)
    console.log("[v0] Subscriber count:", count)

    return NextResponse.json({
      count,
    })
  } catch (error) {
    console.error("[v0] Error fetching subscriber count:", error)
    return NextResponse.json(
      {
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
