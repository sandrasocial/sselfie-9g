import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/feature-flags/blueprint-welcome
 * 
 * Returns whether the blueprint welcome wizard is enabled.
 * 
 * Priority order:
 * 1. FEATURE_BLUEPRINT_WELCOME_ENABLED env var (if set)
 * 2. admin_feature_flags table (key = 'blueprint_welcome_enabled')
 * 3. Default: true (enabled by default for new feature)
 */
export async function GET() {
  try {
    // Check env var first (faster, no DB call)
    const envFlag = process.env.FEATURE_BLUEPRINT_WELCOME_ENABLED
    if (envFlag !== undefined) {
      const enabled = envFlag === "true" || envFlag === "1"
      return NextResponse.json({ enabled })
    }

    // Fallback to DB flag
    try {
      const result = await sql`
        SELECT value FROM admin_feature_flags
        WHERE key = 'blueprint_welcome_enabled'
        LIMIT 1
      `
      
      if (result.length === 0) {
        // Flag doesn't exist, default to true (enabled by default)
        return NextResponse.json({ enabled: true })
      }
      
      const enabled = result[0].value === true || result[0].value === "true"
      return NextResponse.json({ enabled })
    } catch (dbError) {
      // If DB query fails (table doesn't exist, etc.), default to true
      console.error("[v0] [Feature Flag] Error checking admin_feature_flags:", dbError)
      return NextResponse.json({ enabled: true })
    }
  } catch (error) {
    // Fail safe: default to true (enabled)
    console.error("[v0] [Feature Flag] Error checking blueprint welcome flag:", error)
    return NextResponse.json({ enabled: true })
  }
}
