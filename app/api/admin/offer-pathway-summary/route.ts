import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Fetch latest offer pathway data
    const result = await sql`
      SELECT 
        id as subscriber_id,
        offer_recommendation as current_recommendation,
        offer_sequence,
        offer_last_computed_at as last_computed_at
      FROM blueprint_subscribers
      WHERE offer_last_computed_at IS NOT NULL
      ORDER BY offer_last_computed_at DESC
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({
        subscriberId: null,
        currentRecommendation: null,
        confidence: null,
        offerSequence: [],
        lastComputedAt: null,
      })
    }

    const subscriber = result[0]

    // Fetch confidence from log
    const [logEntry] = await sql`
      SELECT confidence
      FROM offer_pathway_log
      WHERE subscriber_id = ${subscriber.subscriber_id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      subscriberId: subscriber.subscriber_id,
      currentRecommendation: subscriber.current_recommendation,
      confidence: logEntry?.confidence || null,
      offerSequence: subscriber.offer_sequence || [],
      lastComputedAt: subscriber.last_computed_at,
    })
  } catch (error) {
    console.error("[API] Error fetching offer pathway summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
