import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { adminSupervisorAgent } from "@/agents/admin/adminSupervisorAgent"
import { marketingAutomationAgent } from "@/agents/marketing/marketingAutomationAgent"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriber_id, signal_type, value } = body

    if (!subscriber_id || !signal_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Validate subscriber exists
    const subscriber = await sql`
      SELECT * FROM blueprint_subscribers WHERE id = ${subscriber_id}
    `

    if (subscriber.length === 0) {
      return NextResponse.json({ success: false, error: "Subscriber not found" }, { status: 404 })
    }

    // Insert signal into blueprint_signals table
    await sql`
      INSERT INTO blueprint_signals (subscriber_id, signal_type, signal_value)
      VALUES (${subscriber_id}, ${signal_type}, ${value})
    `

    // Update intent_score (+3 per signal) and last_signal_at
    const result = await sql`
      UPDATE blueprint_subscribers
      SET 
        intent_score = COALESCE(intent_score, 0) + 3,
        last_signal_at = NOW()
      WHERE id = ${subscriber_id}
      RETURNING intent_score, first_high_intent_at
    `

    const currentScore = result[0].intent_score
    const firstHighIntentAt = result[0].first_high_intent_at

    // If score > 9 and first_high_intent_at is NULL, trigger high intent nurture
    if (currentScore > 9 && !firstHighIntentAt) {
      await sql`
        UPDATE blueprint_subscribers
        SET first_high_intent_at = NOW()
        WHERE id = ${subscriber_id}
      `

      // Trigger MarketingAutomationAgent method (async, non-blocking)
      marketingAutomationAgent
        .recordBlueprintSignal(subscriber_id, signal_type, value)
        .catch((err) => console.error("[Signal] recordBlueprintSignal failed:", err))
    }

    // Trigger AdminSupervisorAgent method (async, non-blocking)
    adminSupervisorAgent
      .updateIntentPrediction(subscriber_id)
      .catch((err) => console.error("[Signal] updateIntentPrediction failed:", err))

    console.log(`[Signal] Recorded: ${signal_type} for subscriber ${subscriber_id} (+3 pts, total: ${currentScore})`)

    return NextResponse.json({
      success: true,
      intent_score: currentScore,
    })
  } catch (error) {
    console.error("[Signal] Error recording signal:", error)
    return NextResponse.json({ success: false, error: "Failed to record signal" }, { status: 500 })
  }
}
