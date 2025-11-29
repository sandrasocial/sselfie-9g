import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const upsells = await sql`
      SELECT 
        uq.id,
        uq.subscriber_id,
        uq.intelligence,
        uq.stage,
        uq.created_at,
        uq.approved,
        uq.processed,
        bs.email,
        bs.name,
        bs.business,
        bs.blueprint_score
      FROM upsell_queue uq
      JOIN blueprint_subscribers bs ON uq.subscriber_id = bs.id
      WHERE uq.approved = FALSE AND uq.processed = FALSE
      ORDER BY (uq.intelligence->>'buyingLikelihood')::INTEGER DESC, uq.created_at DESC
    `

    return NextResponse.json({ success: true, upsells })
  } catch (error) {
    console.error("[API] Error listing upsells:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
