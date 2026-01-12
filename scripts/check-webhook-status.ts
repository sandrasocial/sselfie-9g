/**
 * Check Webhook Status for Paid Blueprint Purchase
 * 
 * This script checks if a webhook was processed for a specific checkout session
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function checkWebhookStatus(sessionId: string) {
  try {
    console.log(`\n🔍 Checking webhook status for session: ${sessionId}\n`)
    
    // Check webhook_events table
    const webhookEvents = await sql`
      SELECT stripe_event_id, processed_at
      FROM webhook_events
      WHERE stripe_event_id LIKE ${`%${sessionId}%`}
      ORDER BY processed_at DESC
      LIMIT 10
    ` as any[]
    
    console.log(`📊 Webhook Events Found: ${webhookEvents.length}`)
    if (webhookEvents.length > 0) {
      webhookEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. Event ID: ${event.stripe_event_id}`)
        console.log(`      Processed: ${event.processed_at}`)
      })
    } else {
      console.log(`   ⚠️  No webhook events found for this session`)
    }
    
    // Check stripe_payments table
    const payments = await sql`
      SELECT 
        stripe_payment_id,
        user_id,
        amount_cents,
        status,
        product_type,
        payment_date
      FROM stripe_payments
      WHERE stripe_payment_id = ${sessionId}
         OR stripe_payment_id LIKE ${`%${sessionId}%`}
      ORDER BY payment_date DESC
      LIMIT 5
    ` as any[]
    
    console.log(`\n💰 Stripe Payments Found: ${payments.length}`)
    if (payments.length > 0) {
      payments.forEach((payment, i) => {
        console.log(`   ${i + 1}. Payment ID: ${payment.stripe_payment_id}`)
        console.log(`      User ID: ${payment.user_id || "NULL"}`)
        console.log(`      Amount: $${(payment.amount_cents / 100).toFixed(2)}`)
        console.log(`      Status: ${payment.status}`)
        console.log(`      Product: ${payment.product_type}`)
        console.log(`      Date: ${payment.payment_date}`)
      })
    } else {
      console.log(`   ⚠️  No payment records found`)
    }
    
    // Check blueprint_subscribers for paid_blueprint_purchased
    const blueprintSubs = await sql`
      SELECT 
        id,
        user_id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_stripe_payment_id
      FROM blueprint_subscribers
      WHERE paid_blueprint_stripe_payment_id = ${sessionId}
         OR paid_blueprint_stripe_payment_id LIKE ${`%${sessionId}%`}
      ORDER BY paid_blueprint_purchased_at DESC
      LIMIT 5
    ` as any[]
    
    console.log(`\n📋 Blueprint Subscribers Found: ${blueprintSubs.length}`)
    if (blueprintSubs.length > 0) {
      blueprintSubs.forEach((sub, i) => {
        console.log(`   ${i + 1}. ID: ${sub.id}`)
        console.log(`      User ID: ${sub.user_id || "NULL"}`)
        console.log(`      Email: ${sub.email || "NULL"}`)
        console.log(`      Paid Blueprint: ${sub.paid_blueprint_purchased ? "✅ TRUE" : "❌ FALSE"}`)
        console.log(`      Purchased At: ${sub.paid_blueprint_purchased_at || "NULL"}`)
        console.log(`      Payment ID: ${sub.paid_blueprint_stripe_payment_id || "NULL"}`)
      })
    } else {
      console.log(`   ⚠️  No blueprint_subscribers records found`)
    }
    
    // Check subscriptions table
    const subscriptions = await sql`
      SELECT 
        id,
        user_id,
        product_type,
        status,
        stripe_customer_id,
        created_at
      FROM subscriptions
      WHERE product_type = 'paid_blueprint'
      ORDER BY created_at DESC
      LIMIT 5
    ` as any[]
    
    console.log(`\n💳 Subscriptions Found: ${subscriptions.length}`)
    if (subscriptions.length > 0) {
      subscriptions.forEach((sub, i) => {
        console.log(`   ${i + 1}. ID: ${sub.id}`)
        console.log(`      User ID: ${sub.user_id || "NULL"}`)
        console.log(`      Status: ${sub.status}`)
        console.log(`      Created: ${sub.created_at}`)
      })
    } else {
      console.log(`   ⚠️  No paid_blueprint subscriptions found`)
    }
    
    console.log(`\n✅ Check complete\n`)
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
    console.error(error)
    process.exit(1)
  }
}

// Get session ID from command line or use the one from logs
const sessionId = process.argv[2] || "cs_live_b1rAEeGkKAKFBRRbXfPACvVJh5VHTGqdtui7CGEgr0m5vwCWp4vRCjDuhk"
checkWebhookStatus(sessionId)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
