import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * APA Trigger API
 *
 * Queues APA workflow for a subscriber
 * NEVER executes APA logic in real-time
 * Must ALWAYS queue for admin approval
 * Maya and user flows must not be touched
 *
 * @returns Queue result
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscriberId, probability, nurture_stage, behavior_score, last_activity } = body

    console.log(`[APA Trigger API] Queuing APA for subscriber ${subscriberId}`)

    // <PLACEHOLDER> This will be implemented in Phase 6
    // Will:
    // 1. Validate subscriber exists
    // 2. Check APA conditions with evaluateAPAForSubscriber()
    // 3. Queue workflow in workflow_queue with status "pending"
    // 4. Log to apa_log table
    // 5. Return queue ID

    // Safe placeholder: just return success without doing anything
    return NextResponse.json({ status: "queued", message: "not_implemented" })
  } catch (error) {
    console.error("[APA Trigger API] Error:", error)
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
