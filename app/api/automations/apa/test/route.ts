import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { evaluateAPAForSubscriber } from "@/agents/admin/adminSupervisorAgent"
import type { SubscriberInput } from "@/lib/automations/apaEngine"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Part 9 - Test Route
 * Manual test endpoint for APA decision
 * POST { subscriber_id } → Runs APA decision immediately → Returns full JSON
 */
export async function POST(request: NextRequest) {
  try {
    const { subscriber_id } = await request.json()

    if (!subscriber_id) {
      return NextResponse.json({ error: "subscriber_id required" }, { status: 400 })
    }

    // Fetch subscriber
    const subscribers = await sql`
      SELECT 
        id,
        email,
        name,
        predicted_conversion_score,
        predicted_conversion_window,
        prediction_confidence,
        nurture_stage,
        behavior_score,
        last_apa_action_at,
        apa_disabled,
        blueprint_completed_at
      FROM blueprint_subscribers
      WHERE id = ${subscriber_id}
    `

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = subscribers[0] as SubscriberInput

    // Run APA evaluation
    const result = await evaluateAPAForSubscriber(subscriber)

    return NextResponse.json({
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        predicted_conversion_score: subscriber.predicted_conversion_score,
        predicted_conversion_window: subscriber.predicted_conversion_window,
        nurture_stage: subscriber.nurture_stage,
        behavior_score: subscriber.behavior_score,
        last_apa_action_at: subscriber.last_apa_action_at,
        apa_disabled: subscriber.apa_disabled,
      },
      evaluation: result,
    })
  } catch (error) {
    console.error("[API] Error testing APA:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
