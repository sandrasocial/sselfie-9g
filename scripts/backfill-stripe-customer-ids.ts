/**
 * Script to backfill Stripe customer IDs for existing users
 * 
 * Usage:
 *   npx tsx scripts/backfill-stripe-customer-ids.ts <email>
 *   npx tsx scripts/backfill-stripe-customer-ids.ts --all
 *   npx tsx scripts/backfill-stripe-customer-ids.ts --userId <user-id>
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

// Check for required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required")
  console.error("Make sure you have a .env.local or .env file with STRIPE_SECRET_KEY")
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is required")
  console.error("Make sure you have a .env.local or .env file with DATABASE_URL")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

interface BackfillResult {
  email: string
  userId: string
  customerId: string | null
  status: string
}

async function backfillCustomerIdForEmail(
  email: string,
): Promise<BackfillResult> {
  try {
    // Get user from database
    const users = await sql`
      SELECT id, email, stripe_customer_id FROM users WHERE email = ${email} LIMIT 1
    `

    if (users.length === 0) {
      return {
        email,
        userId: "",
        customerId: null,
        status: "User not found in database",
      }
    }

    const user = users[0]

    // If user already has a customer ID, skip
    if (user.stripe_customer_id) {
      return {
        email,
        userId: user.id,
        customerId: user.stripe_customer_id,
        status: "Already has customer ID",
      }
    }

    console.log(`[BACKFILL] Searching Stripe for ${email}...`)

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    })

    if (customers.data.length === 0) {
      // Try searching checkout sessions as fallback
      console.log(`[BACKFILL] No Stripe customer found, searching checkout sessions...`)
      const customerIdFromSessions = await findCustomerIdFromCheckoutSessions(email)

      if (customerIdFromSessions) {
        // Update user with found customer ID
        await sql`
          UPDATE users 
          SET stripe_customer_id = ${customerIdFromSessions}
          WHERE id = ${user.id}
        `
        console.log(`[BACKFILL] ✓ Updated ${email} with customer ID from checkout session: ${customerIdFromSessions}`)
        return {
          email,
          userId: user.id,
          customerId: customerIdFromSessions,
          status: "success",
        }
      }

      return {
        email,
        userId: user.id,
        customerId: null,
        status: "No Stripe customer or checkout sessions found",
      }
    }

    // Use the most recent customer (or first one if multiple)
    const customerId = customers.data[0].id

    // Update user with customer ID
    await sql`
      UPDATE users 
      SET stripe_customer_id = ${customerId}
      WHERE id = ${user.id}
    `

    console.log(`[BACKFILL] ✓ Updated ${email} with customer ID: ${customerId}`)

    return {
      email,
      userId: user.id,
      customerId,
      status: "success",
    }
  } catch (error: any) {
    console.error(`[BACKFILL] ✗ Error for ${email}:`, error.message)
    return {
      email,
      userId: "",
      customerId: null,
      status: `Error: ${error.message}`,
    }
  }
}

async function findCustomerIdFromCheckoutSessions(email: string): Promise<string | null> {
  try {
    // Search for checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    })

    // Search through checkout sessions for this email
    for (const session of sessions.data) {
      if (
        (session.customer_details?.email === email || session.customer_email === email) &&
        session.customer
      ) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
        console.log(`[BACKFILL] Found customer ID from checkout session: ${customerId}`)
        return customerId
      }
    }

    // Also try searching payment intents
    const payments = await stripe.paymentIntents.list({
      limit: 100,
    })

    for (const payment of payments.data) {
      if (payment.receipt_email === email && payment.customer) {
        const customerId = typeof payment.customer === "string" ? payment.customer : payment.customer.id
        console.log(`[BACKFILL] Found customer ID from payment intent: ${customerId}`)
        return customerId
      }
    }

    return null
  } catch (error) {
    console.error(`[BACKFILL] Error searching checkout sessions:`, error)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage:
  npx tsx scripts/backfill-stripe-customer-ids.ts <email>
  npx tsx scripts/backfill-stripe-customer-ids.ts --all
  npx tsx scripts/backfill-stripe-customer-ids.ts --userId <user-id>
`)
    process.exit(1)
  }

  console.log("=".repeat(80))
  console.log("[BACKFILL] Starting Stripe Customer ID Backfill")
  console.log("=".repeat(80))

  const results: BackfillResult[] = []

  if (args[0] === "--all") {
    console.log("[BACKFILL] Backfilling all users missing customer IDs...\n")

    // Get all users without customer IDs who might have purchases
    const users = await sql`
      SELECT DISTINCT u.id, u.email, u.created_at
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.email IS NOT NULL
      AND (u.stripe_customer_id IS NULL OR u.stripe_customer_id = '')
      AND (
        EXISTS (SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id AND uc.balance > 0)
        OR EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = u.id)
      )
      ORDER BY u.created_at DESC
    `

    console.log(`[BACKFILL] Found ${users.length} users to process\n`)

    for (const user of users) {
      const result = await backfillCustomerIdForEmail(user.email)
      results.push(result)
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  } else if (args[0] === "--userId" && args[1]) {
    const userId = args[1]
    console.log(`[BACKFILL] Backfilling for user ID: ${userId}\n`)

    const users = await sql`
      SELECT id, email FROM users WHERE id = ${userId} LIMIT 1
    `

    if (users.length === 0) {
      console.error(`[BACKFILL] ✗ User not found: ${userId}`)
      process.exit(1)
    }

    const result = await backfillCustomerIdForEmail(users[0].email)
    results.push(result)
  } else {
    // Single email
    const email = args[0]
    console.log(`[BACKFILL] Backfilling for email: ${email}\n`)

    const result = await backfillCustomerIdForEmail(email)
    results.push(result)
  }

  // Print results
  console.log("\n" + "=".repeat(80))
  console.log("[BACKFILL] Results Summary")
  console.log("=".repeat(80))

  const successCount = results.filter((r) => r.status === "success").length
  const alreadyHasCount = results.filter((r) => r.status === "Already has customer ID").length
  const failedCount = results.filter((r) => r.status !== "success" && r.status !== "Already has customer ID").length

  console.log(`Total processed: ${results.length}`)
  console.log(`✓ Successfully backfilled: ${successCount}`)
  console.log(`- Already had customer ID: ${alreadyHasCount}`)
  console.log(`✗ Failed/Not found: ${failedCount}\n`)

  if (results.length > 0) {
    console.log("Detailed Results:")
    console.log("-".repeat(80))
    results.forEach((result) => {
      const icon = result.status === "success" ? "✓" : result.status.includes("Already") ? "-" : "✗"
      console.log(`${icon} ${result.email.padEnd(40)} ${result.status}`)
      if (result.customerId) {
        console.log(`  Customer ID: ${result.customerId}`)
      }
    })
  }

  console.log("\n" + "=".repeat(80))
  console.log("[BACKFILL] Complete")
  console.log("=".repeat(80))
}

main().catch((error) => {
  console.error("[BACKFILL] Fatal error:", error)
  process.exit(1)
})
