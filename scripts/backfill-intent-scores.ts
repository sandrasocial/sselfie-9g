/**
 * Backfill Intent Scores for Existing Blueprint Subscribers
 * Sets default intent_score and readiness_label for all existing subscribers
 * Run this script once after deploying Phase 7 - Block 3
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function backfillIntentScores() {
  console.log("[Backfill] Starting intent score backfill...")

  try {
    // Update all subscribers without intent_score
    const result = await sql`
      UPDATE blueprint_subscribers
      SET 
        intent_score = 0,
        readiness_label = 'cold'
      WHERE intent_score IS NULL
      RETURNING id
    `

    console.log(`[Backfill] Updated ${result.length} subscribers with default intent scores`)

    return {
      success: true,
      updated: result.length,
    }
  } catch (error) {
    console.error("[Backfill] Error during backfill:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Run backfill if this script is executed directly
if (require.main === module) {
  backfillIntentScores()
    .then((result) => {
      console.log("[Backfill] Complete:", result)
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error("[Backfill] Fatal error:", error)
      process.exit(1)
    })
}

export { backfillIntentScores }
