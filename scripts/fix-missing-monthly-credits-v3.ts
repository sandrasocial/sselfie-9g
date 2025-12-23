/**
 * Script to fix missing monthly credits for subscription renewals
 * Version 3: Only grants credits to users who have actually paid (verified via Stripe)
 * 
 * This script:
 * 1. Finds all active studio membership subscriptions
 * 2. Checks Stripe invoices to verify if payment was successful
 * 3. Checks if credits were granted after the payment date
 * 4. Only grants credits if payment was successful but credits are missing
 * 
 * Usage:
 *   pnpm exec tsx scripts/fix-missing-monthly-credits-v3.ts
 *   pnpm exec tsx scripts/fix-missing-monthly-credits-v3.ts --dry-run
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { grantMonthlyCredits } from "../lib/credits"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) {
  console.error("❌ Error: STRIPE_SECRET_KEY and DATABASE_URL environment variables are required")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})
const sql = neon(process.env.DATABASE_URL!)
const DRY_RUN = process.argv.includes("--dry-run")

async function fixMissingMonthlyCredits() {
  console.log("=".repeat(80))
  console.log("Checking for missing monthly credits (payment-verified only)...")
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
      u.email,
      uc.balance as current_credits
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN user_credits uc ON uc.user_id = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
    AND s.status = 'active'
    AND s.stripe_subscription_id IS NOT NULL
    ORDER BY s.user_id
  `

  console.log(`\nFound ${subscriptions.length} active studio membership subscriptions\n`)

  // List of known test user emails (should not receive real credits)
  const TEST_USER_EMAILS = [
    "co@levelpartner.ai",
    // Add other test emails here
  ]

  const results: Array<{
    userId: string
    email: string
    subscriptionId: string
    stripeSubscriptionId: string
    paymentDate: Date | null
    creditsGrantedAfterPayment: boolean
    action: string
    error?: string
    newBalance?: number
  }> = []

  for (const sub of subscriptions) {
    if (!sub.stripe_subscription_id) {
      console.log(`⏭️  Skipping ${sub.email} - no Stripe subscription ID`)
      continue
    }

    console.log(`\n📋 ${sub.email}`)
    console.log(`   Stripe subscription: ${sub.stripe_subscription_id}`)
    console.log(`   Current credits: ${sub.current_credits || 0}`)

    // Skip test users
    if (TEST_USER_EMAILS.includes(sub.email.toLowerCase())) {
      console.log(`   ⏭️  Skipping - test user (no credits for test payments)`)
      results.push({
        userId: sub.user_id,
        email: sub.email,
        subscriptionId: sub.id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        paymentDate: null,
        creditsGrantedAfterPayment: false,
        action: "skipped - test user",
      })
      continue
    }

    try {
      // Get the subscription from Stripe to check its status
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      
      // Check if subscription is in test mode (has test mode indicator)
      // Note: livemode field on subscription indicates if it's a real subscription
      if (stripeSubscription.livemode === false) {
        console.log(`   ⏭️  Skipping - test mode subscription (no credits for test payments)`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          paymentDate: null,
          creditsGrantedAfterPayment: false,
          action: "skipped - test mode subscription",
        })
        continue
      }

      // Get the most recent paid invoice for this subscription
      const invoices = await stripe.invoices.list({
        subscription: sub.stripe_subscription_id,
        status: "paid",
        limit: 5,
      })
      
      // If subscription is in test mode, skip (no credits for test payments)
      if (!stripeSubscription.livemode) {
        console.log(`   ⏭️  Subscription is in test mode - skipping (no credits for test payments)`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          paymentDate: null,
          creditsGrantedAfterPayment: false,
          action: "skipped - test mode subscription",
        })
        continue
      }
      
      const invoicesToCheck = invoices.data

      if (invoicesToCheck.length === 0) {
        console.log(`   ⚠️  No paid invoices found - skipping (may not have paid yet or is test mode)`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          paymentDate: null,
          creditsGrantedAfterPayment: false,
          action: "skipped - no paid invoices",
        })
        continue
      }

      // Get the most recent paid invoice (from live mode only)
      const latestInvoice = invoicesToCheck[0]
      const paymentDate = new Date(latestInvoice.status_transitions.paid_at * 1000)

      console.log(`   Latest payment: ${paymentDate.toISOString().split("T")[0]} (Invoice: ${latestInvoice.id})`)
      console.log(`   Payment status: ${latestInvoice.status}`)

      // Check if credits were granted after this payment date
      const creditsAfterPayment = await sql`
        SELECT COUNT(*) as count
        FROM credit_transactions
        WHERE user_id = ${sub.user_id}
        AND transaction_type = 'subscription_grant'
        AND created_at >= ${paymentDate}
      `

      const hasCreditsAfterPayment = Number(creditsAfterPayment[0]?.count || 0) > 0

      if (hasCreditsAfterPayment) {
        console.log(`   ✅ Credits already granted after payment`)
        results.push({
          userId: sub.user_id,
          email: sub.email,
          subscriptionId: sub.id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          paymentDate,
          creditsGrantedAfterPayment: true,
          action: "already granted",
        })
      } else {
        // Check if payment is recent (within last 45 days) - only grant for recent payments
        const daysSincePayment = Math.floor(
          (Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (daysSincePayment > 45) {
          console.log(
            `   ⏭️  Payment was ${daysSincePayment} days ago (too old for automatic grant) - skipping`,
          )
          results.push({
            userId: sub.user_id,
            email: sub.email,
            subscriptionId: sub.id,
            stripeSubscriptionId: sub.stripe_subscription_id,
            paymentDate,
            creditsGrantedAfterPayment: false,
            action: "skipped - payment too old",
          })
          continue
        }

        console.log(`   ⚠️  Payment confirmed but credits missing (payment ${daysSincePayment} days ago)`)

        if (DRY_RUN) {
          console.log(`   🔍 [DRY RUN] Would grant 150 credits`)
          results.push({
            userId: sub.user_id,
            email: sub.email,
            subscriptionId: sub.id,
            stripeSubscriptionId: sub.stripe_subscription_id,
            paymentDate,
            creditsGrantedAfterPayment: false,
            action: "would grant - payment verified",
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
                subscriptionId: sub.id,
                stripeSubscriptionId: sub.stripe_subscription_id,
                paymentDate,
                creditsGrantedAfterPayment: true,
                action: "granted - payment verified",
                newBalance: result.newBalance,
              })
            } else {
              console.error(`   ❌ Failed: ${result.error}`)
              results.push({
                userId: sub.user_id,
                email: sub.email,
                subscriptionId: sub.id,
                stripeSubscriptionId: sub.stripe_subscription_id,
                paymentDate,
                creditsGrantedAfterPayment: false,
                action: "failed",
                error: result.error,
              })
            }
          } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}`)
            results.push({
              userId: sub.user_id,
              email: sub.email,
              subscriptionId: sub.id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              paymentDate,
              creditsGrantedAfterPayment: false,
              action: "error",
              error: error.message,
            })
          }
        }
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error: any) {
      console.error(`   ❌ Error checking Stripe subscription: ${error.message}`)
      results.push({
        userId: sub.user_id,
        email: sub.email,
        subscriptionId: sub.id,
        stripeSubscriptionId: sub.stripe_subscription_id || "unknown",
        paymentDate: null,
        creditsGrantedAfterPayment: false,
        action: "error",
        error: error.message,
      })
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80))
  console.log("Summary")
  console.log("=".repeat(80))

  const granted = results.filter((r) => r.action.includes("granted - payment verified") && !r.action.includes("would"))
  const wouldGrant = results.filter((r) => r.action === "would grant - payment verified")
  const alreadyHad = results.filter((r) => r.action === "already granted")
  const skipped = results.filter(
    (r) =>
      r.action.includes("skipped") ||
      r.action === "skipped - no paid invoices" ||
      r.action === "skipped - payment too old",
  )
  const failed = results.filter((r) => r.action === "failed" || r.action === "error")

  console.log(`Total subscriptions checked: ${results.length}`)
  console.log(`✅ Already had credits: ${alreadyHad.length}`)
  console.log(`${DRY_RUN ? "🔍 Would grant" : "✅ Granted"} credits: ${granted.length + wouldGrant.length}`)
  console.log(`⏭️  Skipped (no payment/too old): ${skipped.length}`)
  console.log(`❌ Failed: ${failed.length}`)

  if (granted.length > 0 || wouldGrant.length > 0) {
    console.log(`\n${DRY_RUN ? "Would grant" : "Granted"} credits to (payment verified):`)
    ;[...granted, ...wouldGrant].forEach((r) => {
      const paymentDateStr = r.paymentDate ? r.paymentDate.toISOString().split("T")[0] : "unknown"
      console.log(`  - ${r.email}`)
      console.log(`    Payment date: ${paymentDateStr}`)
      if (r.newBalance !== undefined) {
        console.log(`    New balance: ${r.newBalance} credits`)
      }
    })
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (need verification):`)
    skipped.forEach((r) => {
      console.log(`  - ${r.email}: ${r.action}`)
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



































