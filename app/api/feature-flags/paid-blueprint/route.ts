import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/feature-flags/paid-blueprint
 * 
 * Returns whether the paid blueprint feature is enabled.
 * Uses the SAME logic as server-side checkout page to ensure consistency.
 * 
 * Priority order:
 * 1. FEATURE_PAID_BLUEPRINT_ENABLED env var (if set)
 * 2. admin_feature_flags table (key = 'paid_blueprint_enabled')
 * 3. Default: false (safe)
 * 
 * This ensures CTA visibility matches checkout page availability.
 */
export async function GET() {
  try {
    // Check env var first (faster, no DB call)
    const envFlag = process.env.FEATURE_PAID_BLUEPRINT_ENABLED
    if (envFlag !== undefined) {
      const enabled = envFlag === "true" || envFlag === "1"
      return NextResponse.json({ enabled })
    }

    // Fallback to DB flag
    try {
      const result = await sql`
        SELECT value FROM admin_feature_flags
        WHERE key = 'paid_blueprint_enabled'
        LIMIT 1
      `
      
      if (result.length === 0) {
        // Flag doesn't exist, default to false
        return NextResponse.json({ enabled: false })
      }
      
      const enabled = result[0].value === true || result[0].value === "true"
      return NextResponse.json({ enabled })
    } catch (dbError) {
      // If DB query fails (table doesn't exist, etc.), default to false
      console.error("[v0] [Feature Flag] Error checking admin_feature_flags:", dbError)
      return NextResponse.json({ enabled: false })
    }
  } catch (error) {
    // Fail safe: default to false
    console.error("[v0] [Feature Flag] Error checking paid blueprint flag:", error)
    return NextResponse.json({ enabled: false })
  }
}
