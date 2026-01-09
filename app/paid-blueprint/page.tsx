import { notFound } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import PaidBlueprintLanding from "@/components/paid-blueprint/paid-blueprint-landing"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Check if paid blueprint feature is enabled
 * Checks env var first, falls back to DB flag
 * Same logic as checkout page for consistency
 */
async function isPaidBlueprintEnabled(): Promise<boolean> {
  try {
    // Check env var first (faster, no DB call)
    const envFlag = process.env.FEATURE_PAID_BLUEPRINT_ENABLED
    if (envFlag !== undefined) {
      return envFlag === "true" || envFlag === "1"
    }

    // Fallback to DB flag
    const result = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'paid_blueprint_enabled'
    `
    if (result.length === 0) {
      return false // Default to false if flag doesn't exist
    }
    return result[0].value === true || result[0].value === "true"
  } catch (error) {
    console.error("[Paid Blueprint Landing] Error checking feature flag:", error)
    return false // Fail safe: default to false
  }
}

export default async function PaidBlueprintLandingPage() {
  // Check feature flag first - same logic as checkout
  const featureEnabled = await isPaidBlueprintEnabled()
  if (!featureEnabled) {
    console.log("[Paid Blueprint Landing] Feature disabled, returning 404")
    return notFound()
  }

  return <PaidBlueprintLanding />
}
