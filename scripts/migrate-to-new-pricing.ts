/**
 * Migration Script: Migrate Existing Users to New Pricing Model
 *
 * This script migrates all existing users from the old tier system
 * (Starter, Pro, Elite) to the new simplified pricing model:
 * - All "Starter" users → "sselfie_studio_membership"
 * - Pro and Elite users → "sselfie_studio_membership" (with note)
 *
 * Run this script once during deployment to production.
 */

import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function migrateUsersToNewPricing() {
  console.log("[v0] Starting migration to new pricing model...")

  try {
    // Step 1: Get all active subscriptions with old tier names
    const oldSubscriptions = await sql`
      SELECT 
        id,
        user_id,
        plan_name,
        tier,
        status,
        stripe_subscription_id,
        stripe_customer_id,
        current_period_start,
        current_period_end
      FROM subscriptions
      WHERE status = 'active'
      AND (
        plan_name IN ('starter', 'pro', 'elite', 'STARTER', 'PRO', 'ELITE')
        OR tier IN ('starter', 'pro', 'elite')
      )
    `

    console.log(`[v0] Found ${oldSubscriptions.length} subscriptions to migrate`)

    let starterCount = 0
    let proCount = 0
    let eliteCount = 0

    // Step 2: Migrate each subscription
    for (const subscription of oldSubscriptions) {
      const oldTier = (subscription.plan_name || subscription.tier || "").toLowerCase()
      const newProductType = "sselfie_studio_membership"

      // Track migration counts
      if (oldTier === "starter") {
        starterCount++
      } else if (oldTier === "pro") {
        proCount++
      } else if (oldTier === "elite") {
        eliteCount++
      }

      console.log(`[v0] Migrating user ${subscription.user_id} from ${oldTier} to ${newProductType}`)

      // Update subscription record with new product type
      await sql`
        UPDATE subscriptions
        SET 
          product_type = ${newProductType},
          plan_name = NULL,
          tier = NULL,
          updated_at = NOW()
        WHERE id = ${subscription.id}
      `

      // Add migration note to user record
      await sql`
        UPDATE users
        SET 
          plan = ${newProductType},
          updated_at = NOW()
        WHERE id = ${subscription.user_id}
      `

      console.log(`[v0] ✓ Migrated user ${subscription.user_id}`)
    }

    // Step 3: Update database schema to add product_type column if it doesn't exist
    console.log("[v0] Ensuring product_type column exists...")

    await sql`
      ALTER TABLE subscriptions 
      ADD COLUMN IF NOT EXISTS product_type TEXT
    `

    // Step 4: Summary
    console.log("\n[v0] ========== MIGRATION SUMMARY ==========")
    console.log(`[v0] Total subscriptions migrated: ${oldSubscriptions.length}`)
    console.log(`[v0] - Starter users migrated: ${starterCount}`)
    console.log(`[v0] - Pro users migrated: ${proCount}`)
    console.log(`[v0] - Elite users migrated: ${eliteCount}`)
    console.log(`[v0] All users now have: sselfie_studio_membership`)
    console.log("[v0] ==========================================\n")

    // Step 5: Verify migration
    const migratedSubscriptions = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE product_type = 'sselfie_studio_membership'
      AND status = 'active'
    `

    console.log(`[v0] Verification: ${migratedSubscriptions[0].count} active Studio Memberships`)

    console.log("[v0] ✓ Migration completed successfully!")

    return {
      success: true,
      totalMigrated: oldSubscriptions.length,
      starterCount,
      proCount,
      eliteCount,
    }
  } catch (error) {
    console.error("[v0] Migration failed:", error)
    throw error
  }
}

// Run migration if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  migrateUsersToNewPricing()
    .then((result) => {
      console.log("[v0] Migration result:", result)
      process.exit(0)
    })
    .catch((error) => {
      console.error("[v0] Migration error:", error)
      process.exit(1)
    })
}

export { migrateUsersToNewPricing }
