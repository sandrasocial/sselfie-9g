import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Checking campaign status")

    const audienceId = process.env.RESEND_AUDIENCE_ID
    let totalSubscribers = 0

    if (audienceId) {
      const contacts = await getAudienceContacts(audienceId)
      totalSubscribers = contacts.length
    } else {
      const result = await sql`SELECT COUNT(*) as count FROM freebie_subscribers WHERE email IS NOT NULL`
      totalSubscribers = Number.parseInt(result[0]?.count || "0")
    }

    const sentResult = await sql`
      SELECT COUNT(*) as count 
      FROM launch_campaign_sends 
      WHERE campaign_name = 'launch-beta' AND status = 'sent'
    `
    const emailsSent = Number.parseInt(sentResult[0]?.count || "0")

    const remainingToSend = totalSubscribers - emailsSent
    const percentComplete = totalSubscribers > 0 ? Math.round((emailsSent / totalSubscribers) * 100) : 0

    console.log("[v0] Campaign status:", { totalSubscribers, emailsSent, remainingToSend, percentComplete })

    return NextResponse.json({
      totalSubscribers,
      emailsSent,
      emailsFailed: 0, // Keep for compatibility
      remainingToSend,
      percentComplete,
    })
  } catch (error) {
    console.error("[v0] Error checking campaign status:", error)
    return NextResponse.json(
      {
        error: "Failed to check campaign status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
