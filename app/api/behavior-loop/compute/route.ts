import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/behavior-loop/compute
 * Computes behavior loop for a subscriber
 * Returns score, stage, signals, and recommended action
 */
export async function POST(request: Request) {
  try {
    const { subscriber_id } = await request.json()

    if (!subscriber_id) {
      return NextResponse.json({ error: "subscriber_id is required" }, { status: 400 })
    }

    const { computeBehaviorLoop } = await import("@/lib/behavior/behaviorLoopEngine")
    const result = await computeBehaviorLoop(subscriber_id)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Error computing behavior loop:", error)
    return NextResponse.json({ error: "Failed to compute behavior loop" }, { status: 500 })
  }
}
