/**
 * Test script to simulate $0 payment webhook for paid_blueprint with coupon code
 * 
 * This simulates what Stripe sends when a 100% off coupon is used
 * Run with: npx tsx scripts/test-coupon-webhook.ts
 */

import { neon } from "@neondatabase/serverless"
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const sql = neon(process.env.DATABASE_URL!)

interface MockWebhookEvent {
  id: string
  type: "checkout.session.completed"
  livemode: boolean
  data: {
    object: {
      id: string
      mode: "payment"
      payment_status: "no_payment_required" | "paid"
      amount_total: number
      customer_details?: {
        email: string
        name?: string
      }
      customer_email?: string
      customer?: string
      payment_intent?: string | null
      metadata: {
        product_id?: string
        product_type?: string
        user_id?: string
        credits?: string
        source?: string
        promo_code?: string
      }
    }
  }
}

async function testCouponWebhook() {
  console.log("=".repeat(80))
  console.log("🧪 TESTING COUPON WEBHOOK FOR $0 PAYMENT")
  console.log("=".repeat(80))

  // Get a test user
  const testUser = await sql`
    SELECT id, email FROM users 
    WHERE email LIKE '%test%' OR email LIKE '%playwright%'
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (testUser.length === 0) {
    console.error("❌ No test user found. Please create a test user first.")
    return
  }

  const userId = testUser[0].id
  const userEmail = testUser[0].email

  console.log(`\n📋 Using test user: ${userEmail} (ID: ${userId})\n`)

  // Simulate webhook event for $0 payment with coupon
  const mockEvent: MockWebhookEvent = {
    id: `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    livemode: true, // Simulating live mode
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        mode: "payment",
        payment_status: "no_payment_required", // Key: This is what Stripe sends for $0 payments
        amount_total: 0, // $0 payment
        customer_details: {
          email: userEmail,
          name: userEmail.split("@")[0],
        },
        customer_email: userEmail,
        customer: `cus_test_${Date.now()}`,
        payment_intent: null, // No payment intent for $0 payments
        metadata: {
          product_id: "paid_blueprint",
          product_type: "paid_blueprint", // CRITICAL: This must be present
          user_id: userId, // CRITICAL: This must be present for authenticated users
          credits: "60",
          source: "app", // or "landing_page"
          promo_code: "LIVE_TEST_100",
        },
      },
    },
  }

  console.log("📦 Mock Webhook Event:")
  console.log(JSON.stringify(mockEvent, null, 2))
  console.log("\n" + "=".repeat(80))

  // Simulate the webhook processing logic
  const session = mockEvent.data.object
  const isPaymentPaid = session.payment_status === "paid" || 
    (session.payment_status === "no_payment_required" && session.amount_total === 0)

  console.log("\n🔍 WEBHOOK PROCESSING ANALYSIS:")
  console.log(`  Payment Status: ${session.payment_status}`)
  console.log(`  Amount Total: $${(session.amount_total / 100).toFixed(2)}`)
  console.log(`  isPaymentPaid: ${isPaymentPaid}`)
  console.log(`  Product Type: ${session.metadata.product_type}`)
  console.log(`  User ID: ${session.metadata.user_id}`)
  console.log(`  Payment Intent: ${session.payment_intent || "NULL (expected for $0)"}`)

  if (!isPaymentPaid) {
    console.log("\n❌ ISSUE FOUND: isPaymentPaid is FALSE")
    console.log("   This will cause the webhook to skip processing!")
    console.log(`   Payment status: ${session.payment_status}`)
    console.log(`   Amount total: ${session.amount_total}`)
  } else {
    console.log("\n✅ isPaymentPaid is TRUE - webhook should process")
  }

  if (!session.metadata.product_type) {
    console.log("\n❌ ISSUE FOUND: product_type is missing from metadata!")
    console.log("   This will cause the webhook to skip paid_blueprint processing!")
  } else {
    console.log("\n✅ product_type is present in metadata")
  }

  if (!session.metadata.user_id) {
    console.log("\n⚠️  WARNING: user_id is missing from metadata")
    console.log("   Webhook will try to resolve by email, but may fail")
  } else {
    console.log("\n✅ user_id is present in metadata")
  }

  // Check what would happen in the webhook
  console.log("\n" + "=".repeat(80))
  console.log("🔬 SIMULATING WEBHOOK PROCESSING:")
  console.log("=".repeat(80))

  if (session.mode === "payment" && session.metadata.product_type === "paid_blueprint") {
    console.log("\n✅ Entering paid_blueprint processing block")
    
    if (!isPaymentPaid) {
      console.log("❌ BLOCKED: Payment not confirmed - webhook will skip processing")
      console.log("   This is the likely issue!")
    } else {
      console.log("✅ Payment confirmed - processing will continue")
      
      // Check user ID resolution
      let resolvedUserId = session.metadata.user_id
      if (!resolvedUserId && session.customer_details?.email) {
        console.log("⚠️  user_id missing, attempting email lookup...")
        const userByEmail = await sql`
          SELECT id FROM users WHERE email = ${session.customer_details.email} LIMIT 1
        `
        if (userByEmail.length > 0) {
          resolvedUserId = userByEmail[0].id
          console.log(`✅ Resolved user_id from email: ${resolvedUserId}`)
        } else {
          console.log("❌ Could not resolve user_id from email")
        }
      }

      if (resolvedUserId) {
        console.log(`\n✅ User ID resolved: ${resolvedUserId}`)
        console.log("   Webhook would grant credits and create subscription")
        
        // Check if already processed
        const existingSubscription = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${resolvedUserId}
          AND product_type = 'paid_blueprint'
          AND status = 'active'
          LIMIT 1
        `
        
        if (existingSubscription.length > 0) {
          console.log("⚠️  Subscription already exists - would skip (idempotency)")
        } else {
          console.log("✅ Would create new subscription")
        }

        // Check credits
        const creditCheck = await sql`
          SELECT balance, total_purchased FROM user_credits WHERE user_id = ${resolvedUserId} LIMIT 1
        `
        if (creditCheck.length > 0) {
          console.log(`   Current credits: ${creditCheck[0].balance}, Total purchased: ${creditCheck[0].total_purchased}`)
        }
      } else {
        console.log("\n❌ CRITICAL: Cannot resolve user_id")
        console.log("   Webhook will return error and skip processing")
      }
    }
  } else {
    console.log("\n❌ Not entering paid_blueprint block")
    console.log(`   Mode: ${session.mode}`)
    console.log(`   Product type: ${session.metadata.product_type}`)
  }

  console.log("\n" + "=".repeat(80))
  console.log("📊 RECOMMENDATIONS:")
  console.log("=".repeat(80))
  console.log("1. Check Vercel logs for actual webhook events")
  console.log("2. Verify Stripe is sending checkout.session.completed for $0 payments")
  console.log("3. Check if metadata.product_type is being set correctly")
  console.log("4. Verify user_id is in metadata for authenticated checkouts")
  console.log("5. Check if webhook secret is correct (test vs live)")
}

testCouponWebhook().catch(console.error)
