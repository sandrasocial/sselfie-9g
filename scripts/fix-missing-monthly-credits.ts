/**
 * Script to fix missing monthly credits for subscription renewals
 * 
 * This script:
 * 1. Finds all active studio membership subscriptions
 * 2. Checks their current_period_start date
 * 3. Checks if they received credits for the current billing period
 * 4. Grants missing credits if needed
 * 
 * Usage:
 *   pnpm exec tsx scripts/fix-missing-monthly-credits.ts
 *   pnpm exec tsx scripts/fix-missing-monthly-credits.ts --dry-run
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
  console.log("Checking for missing monthly credits...")
  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No changes will be made")
  }
  console.log("=".repeat(80))

  // Find all active studio membership subscriptions
  const subscriptions = await sql`
    SELECT 
      s.id,
      s.user_id,
      s.product_type,
      s.stripe_subscription_id,
      s.current_period_start,
      s.current_period_end,
      s.status,
      u.email
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
    AND s.status = 'active'
    ORDER BY s.current_period_start DESC
  `

  console.log(`\nFound ${subscriptions.length} active studio membership subscriptions\n`)

  const results: Array<{
    userId: string
    email: string
    subscriptionId: string
    periodStart: Date
    periodEnd: Date
    hasCredits: boolean
    creditCount: number
    action: string
    error?: string
  }> = []

  for (const sub of subscriptions) {
    const periodStart = new Date(sub.current_period_start)
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()

    // Check if billing period has passed (ended more than 7 days ago = definitely should have gotten credits)
    const daysSincePeriodEnd = (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24)
    const isCurrentPeriod = now >= periodStart && now <= periodEnd
    const isRecentPeriod = daysSincePeriodEnd >= 0 && daysSincePeriodEnd <= 7 // Within 7 days of period end
    
    // Skip only if period hasn't started yet or ended more than 7 days ago
    if (now < periodStart || (daysSincePeriodEnd > 7 && !isCurrentPeriod)) {
      console.log(`⏭️  Skipping ${sub.email} - period ${now < periodStart ? 'not started yet' : 'ended ' + Math.round(daysSincePeriodEnd) + ' days ago'}`)
      results.push({
        userId: sub.user_id,
        email: sub.email,
        subscriptionId: sub.stripe_subscription_id || "unknown",
        periodStart,
        periodEnd,
        hasCredits: false,
        creditCount: 0,
        action: `skipped - ${now < periodStart ? 'period not started' : 'period too old'}`,
      })
      continue
    }

    // Check if credits were granted for this billing period
    const creditGrants = await sql`
      SELECT COUNT(*) as count, MAX(created_at) as last_grant
      FROM credit_transactions
      WHERE user_id = ${sub.user_id}
      AND transaction_type = 'subscription_grant'
      AND created_at >= ${periodStart}
      AND created_at <= ${now}
    `

    const grantCount = Number(creditGrants[0]?.count || 0)
    const hasCredits = grantCount > 0

    console.log(`\n📋 ${sub.email}`)
    console.log(`   Period: ${periodStart.toISOString().split("T")[0]} to ${periodEnd.toISOString().split("T")[0]}`)
    console.log(`   Credits granted this period: ${grantCount}`)

    if (!hasCredits) {
      console.log(`   ⚠️  Missing monthly credits!`)
      
      if (DRY_RUN) {
        console.log(`   🔍 [DRY RUN] Would grant 150 credits`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.stripe_subscription_id || "unknown",
          periodStart,
          periodEnd,
          hasCredits: false,
          creditCount: 0,
          action: "would grant - dry run",
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
              periodStart,
              periodEnd,
              hasCredits: true,
              creditCount: 150,
              action: "granted",
            })
          } else {
            console.error(`   ❌ Failed to grant credits: ${result.error}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.stripe_subscription_id || "unknown",
              periodStart,
              periodEnd,
              hasCredits: false,
              creditCount: 0,
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
            periodStart,
            periodEnd,
            hasCredits: false,
            creditCount: 0,
            action: "error",
            error: error.message,
          })
        }
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } else {
      console.log(`   ✅ Credits already granted`)
      results.push({
        userId: sub.user_id,
        email: sub.email,
        subscriptionId: sub.stripe_subscription_id || "unknown",
        periodStart,
        periodEnd,
        hasCredits: true,
        creditCount: grantCount * 150, // Assuming 150 per grant
        action: "already granted",
      })
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80))
  console.log("Summary")
  console.log("=".repeat(80))

  const missing = results.filter((r) => !r.hasCredits && r.action !== "skipped - outside billing period")
  const granted = results.filter((r) => r.action === "granted" || r.action === "would grant - dry run")
  const alreadyHad = results.filter((r) => r.hasCredits && r.action === "already granted")
  const failed = results.filter((r) => r.action === "failed" || r.action === "error")

  console.log(`Total subscriptions checked: ${results.length}`)
  console.log(`✅ Already had credits: ${alreadyHad.length}`)
  console.log(`${DRY_RUN ? "🔍 Would grant" : "✅ Granted"} credits: ${granted.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`⚠️  Missing credits: ${missing.length}`)

  if (missing.length > 0) {
    console.log("\nUsers missing credits:")
    missing.forEach((r) => {
      console.log(`  - ${r.email} (${r.action})`)
      if (r.error) {
        console.log(`    Error: ${r.error}`)
      }
    })
  }

  console.log("\n" + "=".repeat(80))
}

fixMissingMonthlyCredits().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})











