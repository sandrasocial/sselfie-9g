import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const upsellId = params.id

    const upsell = await sql`
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
        bs.dream_client,
        bs.struggle,
        bs.form_data,
        bs.blueprint_score,
        bs.blueprint_completed_at,
        bs.pdf_downloaded,
        bs.cta_clicked
      FROM upsell_queue uq
      JOIN blueprint_subscribers bs ON uq.subscriber_id = bs.id
      WHERE uq.id = ${upsellId}
      LIMIT 1
    `

    if (upsell.length === 0) {
      return NextResponse.json({ success: false, error: "Upsell not found" }, { status: 404 })
    }

    // Fetch recent activity
    const activity = await sql`
      SELECT event, metadata, created_at
      FROM upsell_history
      WHERE subscriber_id = ${upsell[0].subscriber_id}
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Fetch draft upsell emails if they exist
    const drafts = await sql`
      SELECT id, title, content_json, created_at
      FROM content_drafts
      WHERE type = 'upsell_sequence'
        AND (content_json->>'subscriberId')::INTEGER = ${upsell[0].subscriber_id}
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      upsell: upsell[0],
      activity,
      drafts,
    })
  } catch (error) {
    console.error("[API] Error fetching upsell:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
