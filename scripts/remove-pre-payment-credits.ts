/**
 * Script to remove 150 credits from users who received subscription credits
 * BEFORE their subscription payment was confirmed.
 * 
 * This fixes the issue where credits were granted on subscription creation
 * instead of after invoice.payment_succeeded.
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"

// Load environment variables
config({ path: ".env.local" })
config({ path: ".env" })

const sql = neon(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const DRY_RUN = process.argv.includes("--dry-run")

// List of known test user emails (should not have credits removed)
const TEST_USER_EMAILS = [
  "co@levelpartner.ai",
  // Add other test emails here if needed
]

interface CreditTransaction {
  id: number
  user_id: string
  amount: number
  created_at: Date
  description: string | null
}

interface SubscriptionData {
  user_id: string
  email: string
  stripe_subscription_id: string
  current_credits: number | null
}

async function findFirstPaidInvoiceDate(
  stripeSubscriptionId: string,
): Promise<Date | null> {
  try {
    // Get all paid invoices for this subscription, ordered by date (oldest first)
    const invoices = await stripe.invoices.list({
      subscription: stripeSubscriptionId,
      status: "paid",
      limit: 100,
      expand: ["data.payment_intent"],
    })

    if (invoices.data.length === 0) {
      return null
    }

    // Sort by date to get the earliest paid invoice
    const sortedInvoices = invoices.data.sort(
      (a, b) => (a.status_transitions.paid_at || 0) - (b.status_transitions.paid_at || 0),
    )

    const firstPaidInvoice = sortedInvoices[0]
    const paidAt = firstPaidInvoice.status_transitions.paid_at

    if (!paidAt) {
      console.log(`   ⚠️  Invoice ${firstPaidInvoice.id} has no paid_at timestamp`)
      return null
    }

    return new Date(paidAt * 1000)
  } catch (error: any) {
    console.error(`   ❌ Error fetching invoices: ${error.message}`)
    return null
  }
}

async function removeCreditsFromUser(
  userId: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  try {
    // Get current balance
    const [currentBalance] = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${userId}
    `
    
    if (!currentBalance) {
      console.log(`   ⚠️  User has no credit record - skipping`)
      return false
    }

    const balance = Number(currentBalance.balance || 0)
    const newBalance = Math.max(0, balance - amount) // Don't go below 0

    if (DRY_RUN) {
      console.log(`   🔍 [DRY RUN] Would remove ${amount} credits`)
      console.log(`   🔍 [DRY RUN] Balance: ${balance} → ${newBalance}`)
      return true
    }

    // Update balance
    await sql`
      UPDATE user_credits
      SET 
        balance = ${newBalance},
        updated_at = NOW()
      WHERE user_id = ${userId}
    `

    // Record the removal as a refund transaction
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description, balance_after, created_at
      )
      VALUES (
        ${userId}, 
        ${-amount}, 
        'refund',
        ${reason},
        ${newBalance},
        NOW()
      )
    `

    console.log(`   ✅ Removed ${amount} credits. Balance: ${balance} → ${newBalance}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error removing credits: ${error.message}`)
    return false
  }
}

async function processUser(sub: SubscriptionData): Promise<void> {
  console.log(`\n📋 ${sub.email}`)
  console.log(`   User ID: ${sub.user_id}`)
  console.log(`   Stripe subscription: ${sub.stripe_subscription_id}`)
  console.log(`   Current credits: ${sub.current_credits || 0}`)

  // Skip test users
  if (TEST_USER_EMAILS.includes(sub.email.toLowerCase())) {
    console.log(`   ⏭️  Skipping - test user`)
    return
  }

  try {
    // Find subscription_grant credit transactions for this user
    const grants = await sql<CreditTransaction[]>`
      SELECT id, user_id, amount, created_at, description
      FROM credit_transactions
      WHERE user_id = ${sub.user_id}
      AND transaction_type = 'subscription_grant'
      ORDER BY created_at ASC
    `

    if (grants.length === 0) {
      console.log(`   ℹ️  No subscription_grant transactions found`)
      return
    }

    console.log(`   Found ${grants.length} subscription_grant transaction(s)`)

    // Get the first paid invoice date from Stripe
    const firstPaymentDate = await findFirstPaidInvoiceDate(sub.stripe_subscription_id)

    if (!firstPaymentDate) {
      console.log(`   ⚠️  No paid invoices found in Stripe - skipping`)
      return
    }

    console.log(`   First payment date: ${firstPaymentDate.toISOString()}`)

    // Also check the MOST RECENT paid invoice to ensure credits weren't granted
    // to users who haven't renewed (haven't paid recently)
    let mostRecentPaymentDate: Date | null = null
    try {
      const recentInvoices = await stripe.invoices.list({
        subscription: sub.stripe_subscription_id,
        status: "paid",
        limit: 1,
      })

      if (recentInvoices.data.length > 0) {
        const latestInvoice = recentInvoices.data[0]
        const paidAt = latestInvoice.status_transitions?.paid_at
        if (paidAt) {
          mostRecentPaymentDate = new Date(paidAt * 1000)
          console.log(`   Most recent payment date: ${mostRecentPaymentDate.toISOString()}`)
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not fetch most recent invoice: ${error.message}`)
    }

    // Find grants that happened BEFORE the first payment
    const invalidGrantsBeforeFirst = grants.filter(
      (grant) => new Date(grant.created_at) < firstPaymentDate,
    )

    // Find grants that happened when user hasn't renewed
    // (meaning they were granted even though the user hasn't paid recently)
    const invalidGrantsNotRenewed: typeof grants = []
    if (mostRecentPaymentDate) {
      for (const grant of grants) {
        if (invalidGrantsBeforeFirst.includes(grant)) {
          continue // Already flagged as invalid
        }

        const grantDate = new Date(grant.created_at)
        const daysSincePayment = (grantDate.getTime() - mostRecentPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
        
        // If grant is more than 32 days after the last payment, the user likely hasn't renewed
        // Monthly subscriptions should renew every ~30 days, so grants more than 32 days
        // after payment suggest the user hasn't paid their renewal yet
        if (daysSincePayment > 32) {
          console.log(`   ⚠️  Grant ${grant.id} (${grant.amount} credits) on ${grantDate.toISOString()} is ${Math.round(daysSincePayment)} days after last payment`)
          console.log(`       User hasn't renewed - this grant is invalid`)
          invalidGrantsNotRenewed.push(grant)
        }
      }
    }

    // Combine both types of invalid grants
    const invalidGrants = [...invalidGrantsBeforeFirst, ...invalidGrantsNotRenewed]

    if (invalidGrants.length === 0) {
      console.log(`   ✅ All grants occurred after payment - no action needed`)
      return
    }

    console.log(`   ⚠️  Found ${invalidGrants.length} grant(s) before payment:`)
    
    let totalToRemove = 0
    const invalidGrantDetails: Array<{ id: number; amount: number; date: Date }> = []
    
    for (const grant of invalidGrants) {
      const grantDate = new Date(grant.created_at)
      const daysDiff = Math.round(
        (firstPaymentDate.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      console.log(`      - Transaction ID ${grant.id}: ${grant.amount} credits on ${grantDate.toISOString()} (${daysDiff} days before payment)`)
      totalToRemove += grant.amount
      invalidGrantDetails.push({ id: grant.id, amount: grant.amount, date: grantDate })
    }

    // Double-check: Only remove if these are subscription_grant transactions
    // and only remove the exact amounts from those transactions
    if (totalToRemove > 0) {
      // Get current balance before removal
      const [before] = await sql`
        SELECT balance FROM user_credits WHERE user_id = ${sub.user_id}
      `
      const balanceBefore = before ? Number(before.balance || 0) : 0
      
      console.log(`   Current balance: ${balanceBefore} credits`)
      console.log(`   Will remove: ${totalToRemove} credits (only from subscription_grant transactions before payment)`)
      console.log(`   New balance will be: ${Math.max(0, balanceBefore - totalToRemove)} credits`)
      
      // Safety check: Don't remove more than was granted in these transactions
      // (This should never happen, but adding as a safety measure)
      if (totalToRemove > balanceBefore) {
        console.log(`   ⚠️  WARNING: Total to remove (${totalToRemove}) exceeds current balance (${balanceBefore})`)
        console.log(`   This should not happen - skipping to protect existing credits`)
        return
      }

      // Remove the credits (only the exact amounts from those specific transactions)
      const reason = `Removed ${totalToRemove} credits from ${invalidGrants.length} subscription_grant transaction(s) granted before payment confirmation. Transaction IDs: ${invalidGrantDetails.map(g => g.id).join(", ")}`
      await removeCreditsFromUser(sub.user_id, totalToRemove, reason)
    }

  } catch (error: any) {
    console.error(`   ❌ Error processing user: ${error.message}`)
    console.error(`   Stack: ${error.stack}`)
  }
}

async function main() {
  console.log("=".repeat(80))
  console.log("REMOVE PRE-PAYMENT CREDITS")
  console.log("=".repeat(80))
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes will be made)" : "✅ LIVE (changes will be applied)"}`)
  console.log(`Test users excluded: ${TEST_USER_EMAILS.join(", ")}`)
  console.log("=".repeat(80))

  try {
    // Find all active studio membership subscriptions
    const subscriptions = await sql<SubscriptionData[]>`
      SELECT 
        s.user_id,
        u.email,
        s.stripe_subscription_id,
        uc.balance as current_credits
      FROM subscriptions s
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN user_credits uc ON uc.user_id = s.user_id
      WHERE s.product_type = 'sselfie_studio_membership'
      AND s.status = 'active'
      AND s.stripe_subscription_id IS NOT NULL
      ORDER BY u.email
    `

    console.log(`\nFound ${subscriptions.length} active studio membership subscriptions\n`)

    let processed = 0
    let creditsRemoved = 0
    let usersAffected = 0
    let skipped = 0
    let errors = 0

    for (const sub of subscriptions) {
      processed++
      
      try {
        const beforeCredits = sub.current_credits || 0
        await processUser(sub)
        
        // Check if credits were actually removed (in live mode)
        if (!DRY_RUN) {
          const [after] = await sql`
            SELECT balance FROM user_credits WHERE user_id = ${sub.user_id}
          `
          const afterCredits = after ? Number(after.balance || 0) : 0
          const removed = beforeCredits - afterCredits
          
          if (removed > 0) {
            usersAffected++
            creditsRemoved += removed
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to process ${sub.email}: ${error.message}`)
        errors++
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("SUMMARY")
    console.log("=".repeat(80))
    console.log(`Total subscriptions processed: ${processed}`)
    if (!DRY_RUN) {
      console.log(`Users affected: ${usersAffected}`)
      console.log(`Total credits removed: ${creditsRemoved}`)
    }
    console.log(`Errors: ${errors}`)
    console.log("=".repeat(80))

    if (DRY_RUN) {
      console.log("\n⚠️  This was a DRY RUN. No changes were made.")
      console.log("Run without --dry-run to apply changes.")
    }
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })









