import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { computeOfferPathway } from "@/agents/admin/adminSupervisorAgent"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriber_id } = body

    if (!subscriber_id) {
      return NextResponse.json({ error: "subscriber_id is required" }, { status: 400 })
    }

    // Compute offer pathway
    const result = await computeOfferPathway(Number(subscriber_id))

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to compute offer pathway",
        },
        { status: 500 },
      )
    }

    // Fetch current sequence
    const [subscriber] = await sql`
      SELECT offer_sequence
      FROM blueprint_subscribers
      WHERE id = ${subscriber_id}
    `

    return NextResponse.json({
      recommendation: result.recommendation,
      confidence: result.confidence,
      nextSequence: subscriber?.offer_sequence || [],
      rationale: result.rationale,
    })
  } catch (error) {
    console.error("[API] Error in offer recommendation endpoint:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
