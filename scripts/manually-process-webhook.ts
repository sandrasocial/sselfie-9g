/**
 * Manually process a Stripe checkout session webhook
 * 
 * Use this when webhooks aren't being received in development
 * Run with: npx tsx scripts/manually-process-webhook.ts <session_id>
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import dotenv from 'dotenv'
// Note: Can't import from @/lib/credits due to server-only restriction
// Will grant credits directly using SQL

dotenv.config({ path: '.env.local' })
dotenv.config()

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set")
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

async function manuallyProcessWebhook(sessionId: string) {
  console.log("=".repeat(80))
  console.log("🔧 MANUALLY PROCESSING WEBHOOK")
  console.log("=".repeat(80))
  console.log(`Session ID: ${sessionId}\n`)

  try {
    // Retrieve the checkout session
    console.log("📥 Retrieving checkout session from Stripe...")
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent', 'line_items'],
    })

    console.log("✅ Session retrieved:")
    console.log(`   ID: ${session.id}`)
    console.log(`   Mode: ${session.mode}`)
    console.log(`   Payment status: ${session.payment_status}`)
    console.log(`   Amount total: ${session.amount_total} (${session.amount_total === 0 ? '$0' : `$${(session.amount_total / 100).toFixed(2)}`})`)
    console.log(`   Customer email: ${session.customer_details?.email || session.customer_email}`)
    console.log(`   Metadata:`, JSON.stringify(session.metadata, null, 2))

    // Check if it's a paid_blueprint purchase
    const productType = session.metadata?.product_type
    if (productType !== "paid_blueprint") {
      console.log(`\n⚠️  This is not a paid_blueprint purchase (product_type: ${productType})`)
      console.log("   This script only processes paid_blueprint purchases")
      return
    }

    // Check payment status
    const isPaymentPaid = session.payment_status === "paid" || 
      (session.payment_status === "no_payment_required" && session.amount_total === 0)

    if (!isPaymentPaid) {
      console.log(`\n⚠️  Payment not confirmed (status: ${session.payment_status})`)
      console.log("   Skipping processing")
      return
    }

    console.log(`\n✅ Payment confirmed - processing...`)

    // Get user ID
    let userId = session.metadata?.user_id
    const customerEmail = session.customer_details?.email || session.customer_email

    if (!userId && customerEmail) {
      console.log(`\n🔍 Looking up user by email: ${customerEmail}`)
      const users = await sql`
        SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
      `
      if (users.length > 0) {
        userId = users[0].id
        console.log(`✅ Found user: ${userId}`)
      } else {
        console.log(`❌ User not found for email: ${customerEmail}`)
        return
      }
    }

    if (!userId) {
      console.log(`\n❌ Cannot resolve user_id`)
      return
    }

    // Check if already processed
    const existingSubscription = await sql`
      SELECT id FROM subscriptions
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      AND status = 'active'
      LIMIT 1
    `

    if (existingSubscription.length > 0) {
      console.log(`\n⚠️  Subscription already exists - checking credits...`)
    } else {
      // Create subscription
      console.log(`\n📝 Creating subscription entry...`)
      try {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null
        
        await sql`
          INSERT INTO subscriptions (
            user_id,
            product_type,
            plan,
            status,
            stripe_customer_id,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            'paid_blueprint',
            'paid_blueprint',
            'active',
            ${customerId || null},
            NOW(),
            NOW()
          )
        `
        console.log(`✅ Subscription created`)
      } catch (error: any) {
        if (error.code === '23505' || error.message?.includes('unique constraint')) {
          console.log(`⚠️  Subscription already exists (race condition)`)
        } else {
          throw error
        }
      }
    }

    // Grant credits (60 credits for paid blueprint)
    console.log(`\n💰 Granting credits...`)
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id
    const paymentIdForCredits = paymentIntentId || session.id
    const isTestMode = !session.livemode
    const creditsToGrant = 60

    // Check if credits already granted
    const existingCredit = await sql`
      SELECT id FROM credit_transactions
      WHERE user_id = ${userId}
      AND stripe_payment_id = ${paymentIdForCredits}
      AND transaction_type = 'purchase'
      LIMIT 1
    `

    if (existingCredit.length > 0) {
      console.log(`⚠️  Credits already granted for this payment`)
    } else {
      // Get current balance
      const currentCredits = await sql`
        SELECT balance, total_purchased FROM user_credits WHERE user_id = ${userId} LIMIT 1
      `
      const currentBalance = currentCredits[0]?.balance || 0
      const currentTotalPurchased = currentCredits[0]?.total_purchased || 0
      const newBalance = currentBalance + creditsToGrant
      const newTotalPurchased = currentTotalPurchased + creditsToGrant

      // Update user_credits
      await sql`
        INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
        VALUES (${userId}, ${newBalance}, ${newTotalPurchased}, 0, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET
          balance = ${newBalance},
          total_purchased = ${newTotalPurchased},
          updated_at = NOW()
      `

      // Record transaction
      await sql`
        INSERT INTO credit_transactions (
          user_id, amount, transaction_type, description, 
          stripe_payment_id, balance_after, is_test_mode, created_at
        )
        VALUES (
          ${userId}, ${creditsToGrant}, 'purchase', 
          'Paid Blueprint purchase (60 credits - 30 images)',
          ${paymentIdForCredits}, ${newBalance}, ${isTestMode}, NOW()
        )
      `

      console.log(`✅ Granted ${creditsToGrant} credits (new balance: ${newBalance})`)
    }

    // Update blueprint_subscribers
    console.log(`\n📝 Updating blueprint_subscribers...`)
    await sql`
      UPDATE blueprint_subscribers
      SET 
        paid_blueprint_purchased = true,
        user_id = ${userId},
        updated_at = NOW()
      WHERE email = ${customerEmail}
      OR user_id = ${userId}
    `
    console.log(`✅ Updated blueprint_subscribers`)

    // Verify final state
    console.log(`\n🔍 Verifying final state...`)
    const finalCredits = await sql`
      SELECT balance FROM user_credits WHERE user_id = ${userId} LIMIT 1
    `
    const finalSubscription = await sql`
      SELECT * FROM subscriptions 
      WHERE user_id = ${userId} AND product_type = 'paid_blueprint' LIMIT 1
    `
    const finalBlueprint = await sql`
      SELECT paid_blueprint_purchased FROM blueprint_subscribers 
      WHERE user_id = ${userId} LIMIT 1
    `

    console.log(`\n✅ FINAL STATE:`)
    console.log(`   Credits: ${finalCredits[0]?.balance || 0}`)
    console.log(`   Subscription: ${finalSubscription.length > 0 ? 'Active' : 'Missing'}`)
    console.log(`   Blueprint purchased: ${finalBlueprint[0]?.paid_blueprint_purchased || false}`)

    console.log("\n" + "=".repeat(80))
    console.log("✅ PROCESSING COMPLETE")
    console.log("=".repeat(80))

  } catch (error: any) {
    console.error("\n❌ Error:", error.message)
    throw error
  }
}

const sessionId = process.argv[2]
if (!sessionId) {
  console.error("❌ Please provide a session ID")
  console.log("Usage: npx tsx scripts/manually-process-webhook.ts <session_id>")
  process.exit(1)
}

manuallyProcessWebhook(sessionId).catch(console.error)
