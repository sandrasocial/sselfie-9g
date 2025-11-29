import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendStudioOffer, sendStarterOffer, sendTrialInvite } from "@/agents/marketing/marketingAutomationAgent"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Part 5 - Queue System Integration
 * POST endpoint to queue APA actions
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriber_id, offer_type } = await request.json()

    if (!subscriber_id || !offer_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate subscriber exists
    const subscribers = await sql`
      SELECT * FROM blueprint_subscribers WHERE id = ${subscriber_id}
    `

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = subscribers[0]

    // Execute the appropriate offer method
    let result
    if (offer_type === "studio") {
      result = await sendStudioOffer(subscriber)
    } else if (offer_type === "starter") {
      result = await sendStarterOffer(subscriber)
    } else if (offer_type === "trial") {
      result = await sendTrialInvite(subscriber)
    } else {
      return NextResponse.json({ error: "Invalid offer type" }, { status: 400 })
    }

    // Insert log
    await sql`
      INSERT INTO apa_activity_log (subscriber_id, offer_type, action)
      VALUES (${subscriber_id}, ${offer_type}, 'MANUAL_TRIGGER')
    `

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("[API] Error queueing APA action:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
