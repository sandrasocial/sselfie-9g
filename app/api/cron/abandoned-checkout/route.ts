import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/abandoned-checkout
 * Detects abandoned checkout sessions (24h after creation)
 * Triggers Revenue Recovery pipeline for abandoned_checkout type
 */
export async function GET(request: NextRequest) {
  try {
    // Admin auth check (for manual triggers)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Check if admin
      const { requireAdmin } = await import("@/lib/security/require-admin")
      const guard = await requireAdmin(request)
      if (guard instanceof NextResponse) {
        return guard
      }
    }

    console.log("[AbandonedCheckout] Checking for abandoned sessions...")

    // Find sessions created 24+ hours ago that haven't been recovered
    const abandonedSessions = await sql`
      SELECT 
        id,
        user_id,
        email,
        session_id,
        created_at
      FROM abandoned_checkouts
      WHERE 
        recovered = FALSE
        AND created_at < NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 50
    `

    if (abandonedSessions.length === 0) {
      console.log("[AbandonedCheckout] No abandoned sessions found")
      return NextResponse.json({
        success: true,
        recovered: 0,
        message: "No abandoned sessions found",
      })
    }

    console.log(`[AbandonedCheckout] Found ${abandonedSessions.length} abandoned sessions`)

    let recovered = 0
    const errors: string[] = []

    for (const session of abandonedSessions) {
      try {
        console.log(`[AbandonedCheckout] Processing session ${session.session_id} for ${session.email}`)

        const { createRevenueRecoveryPipeline } = await import("@/agents/pipelines/revenue-recovery")
        const pipeline = createRevenueRecoveryPipeline({
          type: "abandoned_checkout",
          userId: session.user_id,
          email: session.email,
          context: {
            sessionId: session.session_id,
            abandonedAt: session.created_at,
          },
        })
        const result = await pipeline.run({
          type: "abandoned_checkout",
          userId: session.user_id,
          email: session.email,
          context: {
            sessionId: session.session_id,
            abandonedAt: session.created_at,
          },
        })

        if (result.success) {
          // Mark as recovered
          await sql`
            UPDATE abandoned_checkouts
            SET 
              recovered = TRUE,
              recovered_at = NOW()
            WHERE id = ${session.id}
          `
          recovered++
          console.log(`[AbandonedCheckout] Successfully recovered session ${session.session_id}`)
        } else {
          errors.push(`Session ${session.session_id}: ${result.error || "Unknown error"}`)
          console.error(`[AbandonedCheckout] Failed to recover session ${session.session_id}:`, result.error)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(`Session ${session.session_id}: ${errorMsg}`)
        console.error(`[AbandonedCheckout] Error processing session ${session.session_id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      total: abandonedSessions.length,
      recovered,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[AbandonedCheckout] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

