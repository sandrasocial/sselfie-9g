#!/usr/bin/env tsx

/**
 * Blueprint Checkout Verification Script
 * 
 * Verifies end-to-end paid blueprint checkout flow:
 * - Subscription entry created
 * - Credits granted (60 credits)
 * - blueprint_subscribers linked to user_id
 * - Stripe payment recorded
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

interface VerificationResult {
  test: string
  passed: boolean
  details: string
  data?: any
}

async function verifyAuthenticatedCheckout(userId: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  // Test 1: Subscription entry exists
  const subscription = await sql`
    SELECT id, product_type, status, stripe_customer_id, created_at
    FROM subscriptions
    WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `

  results.push({
    test: "Subscription entry created",
    passed: subscription.length > 0,
    details: subscription.length > 0
      ? `✅ Subscription found: ${subscription[0].id} (status: ${subscription[0].status})`
      : "❌ No subscription entry found",
    data: subscription[0] || null,
  })

  // Test 2: Credits granted (60 credits)
  const credits = await sql`
    SELECT balance
    FROM user_credits
    WHERE user_id = ${userId}
  `

  const creditTransaction = await sql`
    SELECT credits, transaction_type, description, stripe_payment_id, created_at
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND description LIKE '%Paid blueprint%'
    ORDER BY created_at DESC
    LIMIT 1
  `

  const creditsGranted = creditTransaction.length > 0 && creditTransaction[0].credits === 60
  const hasBalance = credits.length > 0 && (credits[0].balance >= 60 || creditTransaction.length > 0)

  results.push({
    test: "60 credits granted",
    passed: creditsGranted && hasBalance,
    details: creditsGranted
      ? `✅ 60 credits granted (balance: ${credits[0]?.balance || 0})`
      : "❌ Credits not granted or incorrect amount",
    data: {
      balance: credits[0]?.balance || 0,
      transaction: creditTransaction[0] || null,
    },
  })

  // Test 3: blueprint_subscribers linked to user_id
  const blueprintSubscriber = await sql`
    SELECT id, user_id, email, paid_blueprint_purchased, paid_blueprint_purchased_at, 
           paid_blueprint_stripe_payment_id, converted_to_user, converted_at
    FROM blueprint_subscribers
    WHERE user_id = ${userId}
      AND paid_blueprint_purchased = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `

  results.push({
    test: "blueprint_subscribers linked to user_id",
    passed: blueprintSubscriber.length > 0 && blueprintSubscriber[0].user_id === userId,
    details: blueprintSubscriber.length > 0
      ? `✅ Linked to user_id: ${blueprintSubscriber[0].user_id}`
      : "❌ blueprint_subscribers not linked to user_id",
    data: blueprintSubscriber[0] || null,
  })

  // Test 4: Stripe payment recorded
  if (creditTransaction.length > 0 && creditTransaction[0].stripe_payment_id) {
    const stripePayment = await sql`
      SELECT id, stripe_payment_id, product_type, status, amount_cents, created_at
      FROM stripe_payments
      WHERE stripe_payment_id = ${creditTransaction[0].stripe_payment_id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    results.push({
      test: "Stripe payment recorded",
      passed: stripePayment.length > 0 && stripePayment[0].product_type === "paid_blueprint",
      details: stripePayment.length > 0
        ? `✅ Payment recorded: ${stripePayment[0].stripe_payment_id} (${stripePayment[0].amount_cents / 100}$)`
        : "❌ Stripe payment not recorded",
      data: stripePayment[0] || null,
    })
  } else {
    results.push({
      test: "Stripe payment recorded",
      passed: false,
      details: "⚠️ No payment ID in credit transaction",
      data: null,
    })
  }

  return results
}

async function verifyUnauthenticatedCheckout(email: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  // Test 1: blueprint_subscribers record exists (may not have user_id yet)
  const blueprintSubscriber = await sql`
    SELECT id, user_id, email, paid_blueprint_purchased, paid_blueprint_purchased_at,
           paid_blueprint_stripe_payment_id, converted_to_user
    FROM blueprint_subscribers
    WHERE LOWER(email) = LOWER(${email})
      AND paid_blueprint_purchased = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `

  results.push({
    test: "blueprint_subscribers record created",
    passed: blueprintSubscriber.length > 0,
    details: blueprintSubscriber.length > 0
      ? `✅ Record found (user_id: ${blueprintSubscriber[0].user_id || "NULL - will be linked on signup"})`
      : "❌ blueprint_subscribers record not found",
    data: blueprintSubscriber[0] || null,
  })

  // Test 2: User account exists (after signup)
  const user = await sql`
    SELECT id, email
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  if (user.length > 0) {
    // User has signed up - verify linking and credits
    const userId = user[0].id

    // Check if blueprint_subscribers is now linked
    const linked = blueprintSubscriber.length > 0 && blueprintSubscriber[0].user_id === userId

    results.push({
      test: "blueprint_subscribers linked after signup",
      passed: linked,
      details: linked
        ? `✅ Linked to user_id: ${userId}`
        : `⚠️ Not yet linked (user_id: ${blueprintSubscriber[0]?.user_id || "NULL"})`,
      data: { userId, linked },
    })

    // Check subscription entry
    const subscription = await sql`
      SELECT id, product_type, status
      FROM subscriptions
      WHERE user_id = ${userId}
        AND product_type = 'paid_blueprint'
      LIMIT 1
    `

    results.push({
      test: "Subscription entry created after signup",
      passed: subscription.length > 0,
      details: subscription.length > 0
        ? `✅ Subscription found: ${subscription[0].id}`
        : "⚠️ Subscription entry not yet created (may be delayed)",
      data: subscription[0] || null,
    })

    // Check credits
    const credits = await sql`
      SELECT balance
      FROM user_credits
      WHERE user_id = ${userId}
    `

    results.push({
      test: "Credits granted after signup",
      passed: credits.length > 0 && credits[0].balance >= 60,
      details: credits.length > 0
        ? `✅ Credits balance: ${credits[0].balance}`
        : "⚠️ Credits not yet granted (may be delayed)",
      data: { balance: credits[0]?.balance || 0 },
    })
  } else {
    results.push({
      test: "User account created",
      passed: false,
      details: "⚠️ User account not yet created (user needs to sign up)",
      data: null,
    })
  }

  return results
}

async function verifyPayment(paymentIntentId: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = []

  // Find payment record
  const payment = await sql`
    SELECT id, stripe_payment_id, user_id, product_type, status, amount_cents, created_at
    FROM stripe_payments
    WHERE stripe_payment_id = ${paymentIntentId}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (payment.length === 0) {
    results.push({
      test: "Payment record found",
      passed: false,
      details: "❌ Payment record not found",
      data: null,
    })
    return results
  }

  results.push({
    test: "Payment record found",
    passed: true,
    details: `✅ Payment found: ${payment[0].stripe_payment_id} (${payment[0].amount_cents / 100}$)`,
    data: payment[0],
  })

  const userId = payment[0].user_id
  if (userId) {
    // Verify all related records
    const subscription = await sql`
      SELECT id, product_type, status
      FROM subscriptions
      WHERE user_id = ${userId}
        AND product_type = 'paid_blueprint'
      LIMIT 1
    `

    results.push({
      test: "Subscription linked to payment",
      passed: subscription.length > 0,
      details: subscription.length > 0
        ? `✅ Subscription found: ${subscription[0].id}`
        : "⚠️ Subscription not found",
      data: subscription[0] || null,
    })
  }

  return results
}

async function main() {
  const args = process.argv.slice(2)
  const testType = args.find((a) => a.startsWith("--test"))?.split("=")[1]
  const userId = args.find((a) => a.startsWith("--user-id"))?.split("=")[1]
  const email = args.find((a) => a.startsWith("--email"))?.split("=")[1]
  const paymentId = args.find((a) => a.startsWith("--payment-id"))?.split("=")[1]

  console.log("=".repeat(80))
  console.log("Blueprint Checkout Verification Script")
  console.log("=".repeat(80))
  console.log()

  let results: VerificationResult[] = []

  try {
    if (paymentId) {
      console.log(`Verifying payment: ${paymentId}`)
      results = await verifyPayment(paymentId)
    } else if (testType === "authenticated" && userId) {
      console.log(`Verifying authenticated checkout for user: ${userId}`)
      results = await verifyAuthenticatedCheckout(userId)
    } else if (testType === "unauthenticated" && email) {
      console.log(`Verifying unauthenticated checkout for email: ${email}`)
      results = await verifyUnauthenticatedCheckout(email)
    } else {
      console.error("Usage:")
      console.error("  --test=authenticated --user-id={USER_ID}")
      console.error("  --test=unauthenticated --email={EMAIL}")
      console.error("  --payment-id={PAYMENT_INTENT_ID}")
      process.exit(1)
    }

    console.log()
    console.log("=".repeat(80))
    console.log("Verification Results")
    console.log("=".repeat(80))
    console.log()

    let passedCount = 0
    let failedCount = 0

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}`)
      console.log(`   ${result.details}`)
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`   Data:`, JSON.stringify(result.data, null, 2).split("\n").join("\n   "))
      }
      console.log()

      if (result.passed) {
        passedCount++
      } else {
        failedCount++
      }
    })

    console.log("=".repeat(80))
    console.log(`Summary: ${passedCount} passed, ${failedCount} failed`)
    console.log("=".repeat(80))

    if (failedCount > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}

main()
