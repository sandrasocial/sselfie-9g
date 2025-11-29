import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { upsellId, reason } = await request.json()

    if (!upsellId) {
      return NextResponse.json({ success: false, error: "upsellId is required" }, { status: 400 })
    }

    // Fetch the upsell queue item
    const upsell = await sql`
      SELECT subscriber_id FROM upsell_queue WHERE id = ${upsellId} LIMIT 1
    `

    if (upsell.length === 0) {
      return NextResponse.json({ success: false, error: "Upsell not found" }, { status: 404 })
    }

    const subscriberId = upsell[0].subscriber_id

    // Mark as rejected and processed
    await sql`
      UPDATE upsell_queue
      SET approved = FALSE, processed = TRUE
      WHERE id = ${upsellId}
    `

    // Log the rejection event
    await sql`
      INSERT INTO upsell_history (subscriber_id, event, metadata, created_at)
      VALUES (
        ${subscriberId},
        'upsell_rejected',
        ${JSON.stringify({ upsellId, reason: reason || "No reason provided" })},
        NOW()
      )
    `

    console.log(`[API] Upsell rejected for subscriber ${subscriberId}`)

    return NextResponse.json({
      success: true,
      message: "Upsell rejected",
    })
  } catch (error) {
    console.error("[API] Error rejecting upsell:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
