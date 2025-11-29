import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { computeOfferPathway } from "@/agents/admin/adminSupervisorAgent"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[Cron] Starting nightly offer pathway recompute")

    // Select all subscribers whose:
    // 1. Intent changed (new signals in last 24h)
    // 2. Last signal < 24h
    // 3. offer_last_computed_at is NULL or > 24h old
    const subscribers = await sql`
      SELECT DISTINCT bs.id
      FROM blueprint_subscribers bs
      WHERE 
        (
          EXISTS (
            SELECT 1 FROM blueprint_signals bsg
            WHERE bsg.subscriber_id = bs.id
              AND bsg.created_at >= NOW() - INTERVAL '24 hours'
          )
          OR bs.last_signal_at >= NOW() - INTERVAL '24 hours'
          OR bs.offer_last_computed_at IS NULL
          OR bs.offer_last_computed_at < NOW() - INTERVAL '24 hours'
        )
        AND bs.apa_disabled != true
      LIMIT 100
    `

    console.log(`[Cron] Found ${subscribers.length} subscribers to recompute`)

    let successCount = 0
    let errorCount = 0

    for (const sub of subscribers) {
      try {
        const result = await computeOfferPathway(sub.id)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }

        // Rate limiting: wait 100ms between computations
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`[Cron] Error computing pathway for subscriber ${sub.id}:`, error)
        errorCount++
      }
    }

    console.log(`[Cron] Nightly offer pathway recompute complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      total: subscribers.length,
      successCount,
      errorCount,
    })
  } catch (error) {
    console.error("[Cron] Error in nightly offer pathway recompute:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
