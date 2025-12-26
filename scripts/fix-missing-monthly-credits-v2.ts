/**
 * Script to fix missing monthly credits for subscription renewals
 * Version 2: Checks based on last credit grant date, not billing period dates
 * 
 * This script:
 * 1. Finds all active studio membership subscriptions
 * 2. Checks when they last received subscription_grant credits
 * 3. If it's been more than 25 days since last grant, grants credits
 * 
 * Usage:
 *   pnpm exec tsx scripts/fix-missing-monthly-credits-v2.ts
 *   pnpm exec tsx scripts/fix-missing-monthly-credits-v2.ts --dry-run
 */

import { neon } from "@neondatabase/serverless"
import { grantMonthlyCredits } from "../lib/credits"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is required")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)
const DRY_RUN = process.argv.includes("--dry-run")

async function fixMissingMonthlyCredits() {
  console.log("=".repeat(80))
  console.log("Checking for missing monthly credits (based on last grant date)...")
  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No changes will be made")
  }
  console.log("=".repeat(80))

  // Find all studio membership subscriptions (including canceled ones still in paid period)
  // Note: Canceled subscriptions with current_period_end in the future are still in their paid period
  const subscriptions = await sql`
    SELECT 
      s.id,
      s.user_id,
      s.product_type,
      s.stripe_subscription_id,
      s.current_period_start,
      s.current_period_end,
      s.status,
      u.email,
      uc.balance as current_credits
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_credits uc ON uc.user_id = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
    AND (
      s.status = 'active'
      OR (s.status = 'cancelled' AND s.current_period_end > NOW())
    )
    ORDER BY s.status DESC, s.user_id
  `

  console.log(`\nFound ${subscriptions.length} active studio membership subscriptions\n`)

  const results: Array<{
    userId: string
    email: string
    subscriptionId: string
    lastGrant: Date | null
    daysSinceGrant: number | null
    currentCredits: number
    action: string
    error?: string
    newBalance?: number
  }> = []

  const now = new Date()

  for (const sub of subscriptions) {
    // Check when they last received subscription_grant credits
    const lastGrant = await sql`
      SELECT MAX(created_at) as last_grant_date
      FROM credit_transactions
      WHERE user_id = ${sub.user_id}
      AND transaction_type = 'subscription_grant'
    `

    const lastGrantDate = lastGrant[0]?.last_grant_date
      ? new Date(lastGrant[0].last_grant_date)
      : null

    const daysSinceGrant = lastGrantDate
      ? Math.floor((now.getTime() - lastGrantDate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const currentCredits = Number(sub.current_credits || 0)

    console.log(`\n📋 ${sub.email}`)
    console.log(`   Current credits: ${currentCredits}`)

    if (!lastGrantDate) {
      console.log(`   ⚠️  Never received subscription credits!`)
      
      if (DRY_RUN) {
        console.log(`   🔍 [DRY RUN] Would grant 150 credits`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.stripe_subscription_id || "unknown",
          lastGrant: null,
          daysSinceGrant: null,
          currentCredits,
          action: "would grant - never received",
        })
      } else {
        try {
          console.log(`   ✅ Granting 150 monthly credits (first time)...`)
          const result = await grantMonthlyCredits(sub.user_id, "sselfie_studio_membership", false)
          
          if (result.success) {
            console.log(`   ✅ Successfully granted credits. New balance: ${result.newBalance}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.stripe_subscription_id || "unknown",
              lastGrant: null,
              daysSinceGrant: null,
              currentCredits,
              action: "granted - first time",
              newBalance: result.newBalance,
            })
          } else {
            console.error(`   ❌ Failed: ${result.error}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.stripe_subscription_id || "unknown",
              lastGrant: null,
              daysSinceGrant: null,
              currentCredits,
              action: "failed",
              error: result.error,
            })
          }
        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`)
          results.push({
            userId: sub.user_id,
            email: sub.email,
            subscriptionId: sub.stripe_subscription_id || "unknown",
            lastGrant: null,
            daysSinceGrant: null,
            currentCredits,
            action: "error",
            error: error.message,
          })
        }
      }
    } else if (daysSinceGrant !== null && daysSinceGrant >= 25) {
      // If it's been 25+ days since last grant, they likely missed a monthly grant
      console.log(`   Last grant: ${lastGrantDate.toISOString().split("T")[0]} (${daysSinceGrant} days ago)`)
      console.log(`   ⚠️  Missing monthly credits (${daysSinceGrant} days since last grant)!`)
      
      if (DRY_RUN) {
        console.log(`   🔍 [DRY RUN] Would grant 150 credits`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.stripe_subscription_id || "unknown",
          lastGrant: lastGrantDate,
          daysSinceGrant,
          currentCredits,
          action: "would grant - overdue",
        })
      } else {
        try {
          console.log(`   ✅ Granting 150 monthly credits...`)
          const result = await grantMonthlyCredits(sub.user_id, "sselfie_studio_membership", false)
          
          if (result.success) {
            console.log(`   ✅ Successfully granted credits. New balance: ${result.newBalance}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.stripe_subscription_id || "unknown",
              lastGrant: lastGrantDate,
              daysSinceGrant,
              currentCredits,
              action: "granted - overdue",
              newBalance: result.newBalance,
            })
          } else {
            console.error(`   ❌ Failed: ${result.error}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.stripe_subscription_id || "unknown",
              lastGrant: lastGrantDate,
              daysSinceGrant,
              currentCredits,
              action: "failed",
              error: result.error,
            })
          }
        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`)
          results.push({
            userId: sub.user_id,
            email: sub.email,
            subscriptionId: sub.stripe_subscription_id || "unknown",
            lastGrant: lastGrantDate,
            daysSinceGrant,
            currentCredits,
            action: "error",
            error: error.message,
          })
        }
      }
    } else {
      console.log(
        `   ✅ Last grant: ${lastGrantDate.toISOString().split("T")[0]} (${daysSinceGrant} days ago) - OK`,
      )
      results.push({
        userId: sub.user_id,
        email: sub.email,
        subscriptionId: sub.stripe_subscription_id || "unknown",
        lastGrant: lastGrantDate,
        daysSinceGrant,
        currentCredits,
        action: "up to date",
      })
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  // Print summary
  console.log("\n" + "=".repeat(80))
  console.log("Summary")
  console.log("=".repeat(80))

  const granted = results.filter((r) => r.action.includes("granted"))
  const wouldGrant = results.filter((r) => r.action.includes("would grant"))
  const upToDate = results.filter((r) => r.action === "up to date")
  const failed = results.filter((r) => r.action === "failed" || r.action === "error")

  console.log(`Total subscriptions checked: ${results.length}`)
  console.log(`✅ Up to date: ${upToDate.length}`)
  console.log(`${DRY_RUN ? "🔍 Would grant" : "✅ Granted"} credits: ${granted.length + wouldGrant.length}`)
  console.log(`❌ Failed: ${failed.length}`)

  if (granted.length > 0 || wouldGrant.length > 0) {
    console.log(`\n${DRY_RUN ? "Would grant" : "Granted"} credits to:`)
    ;[...granted, ...wouldGrant].forEach((r) => {
      const daysText = r.daysSinceGrant !== null ? `${r.daysSinceGrant} days ago` : "never"
      console.log(`  - ${r.email} (last grant: ${daysText})`)
      if (r.newBalance !== undefined) {
        console.log(`    New balance: ${r.newBalance} credits`)
      }
    })
  }

  if (failed.length > 0) {
    console.log(`\nFailed:`)
    failed.forEach((r) => {
      console.log(`  - ${r.email}: ${r.error || "unknown error"}`)
    })
  }

  console.log("\n" + "=".repeat(80))
}

fixMissingMonthlyCredits().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})









































