/**
 * Script to manually fix a paid blueprint purchase
 * This can be used if the webhook didn't fire or failed
 * 
 * Usage: npx tsx scripts/fix-paid-blueprint-purchase.ts <email> [stripe-payment-intent-id]
 */

import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"
import { config } from "dotenv"
import { randomUUID } from "crypto"

config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

async function fixPurchase(email: string, paymentIntentId?: string) {
  console.log("=".repeat(80))
  console.log(`🔧 Fixing paid blueprint purchase for: ${email}`)
  if (paymentIntentId) {
    console.log(`💳 Payment Intent ID: ${paymentIntentId}`)
  }
  console.log("=".repeat(80))

  try {
    // Check if record exists
    const existing = await sql`
      SELECT id, email, access_token, paid_blueprint_purchased
      FROM blueprint_subscribers
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if (existing.length === 0) {
      console.log("❌ No blueprint_subscribers record found. Creating one...")
      
      const accessToken = randomUUID()
      const customerName = email.split("@")[0]
      
      await sql`
        INSERT INTO blueprint_subscribers (
          email,
          name,
          access_token,
          paid_blueprint_purchased,
          paid_blueprint_purchased_at,
          paid_blueprint_stripe_payment_id,
          converted_to_user,
          converted_at,
          created_at,
          updated_at
        )
        VALUES (
          ${email},
          ${customerName},
          ${accessToken},
          TRUE,
          NOW(),
          ${paymentIntentId || null},
          TRUE,
          NOW(),
          NOW(),
          NOW()
        )
      `
      console.log(`✅ Created blueprint_subscribers record with access_token: ${accessToken}`)
    } else {
      const record = existing[0]
      console.log(`✅ Found existing record (ID: ${record.id})`)
      
      // Update the record
      const accessToken = record.access_token || randomUUID()
      
      await sql`
        UPDATE blueprint_subscribers
        SET 
          paid_blueprint_purchased = TRUE,
          paid_blueprint_purchased_at = NOW(),
          paid_blueprint_stripe_payment_id = COALESCE(${paymentIntentId || null}, paid_blueprint_stripe_payment_id),
          converted_to_user = TRUE,
          converted_at = COALESCE(converted_at, NOW()),
          access_token = ${accessToken},
          updated_at = NOW()
        WHERE LOWER(email) = LOWER(${email})
      `
      
      console.log(`✅ Updated blueprint_subscribers record`)
      console.log(`   - paid_blueprint_purchased: TRUE`)
      console.log(`   - paid_blueprint_purchased_at: NOW()`)
      console.log(`   - access_token: ${accessToken}`)
    }

    // Verify the update
    const verify = await sql`
      SELECT 
        email,
        access_token,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_stripe_payment_id
      FROM blueprint_subscribers
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if (verify.length > 0 && verify[0].paid_blueprint_purchased) {
      console.log("\n✅ VERIFICATION SUCCESSFUL:")
      console.log(`   Email: ${verify[0].email}`)
      console.log(`   Access Token: ${verify[0].access_token}`)
      console.log(`   Paid Blueprint Purchased: ${verify[0].paid_blueprint_purchased}`)
      console.log(`   Purchased At: ${verify[0].paid_blueprint_purchased_at}`)
      console.log(`   Payment ID: ${verify[0].paid_blueprint_stripe_payment_id || 'NULL'}`)
      console.log("\n✅ The access token endpoint should now work!")
    } else {
      console.log("\n❌ VERIFICATION FAILED - Record not updated correctly")
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ Fix complete")
    console.log("=".repeat(80))
  } catch (error: any) {
    console.error("❌ Error fixing purchase:", error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// If payment intent ID is provided, try to fetch session details from Stripe
async function getSessionFromPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['invoice', 'latest_charge']
    })
    
    console.log(`\n💳 Payment Intent Details:`)
    console.log(`   Status: ${paymentIntent.status}`)
    console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`)
    console.log(`   Customer: ${paymentIntent.customer || 'N/A'}`)
    
    // Try to find the checkout session
    if (paymentIntent.metadata?.session_id) {
      const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata.session_id)
      console.log(`   Session ID: ${session.id}`)
      console.log(`   Session Metadata:`, JSON.stringify(session.metadata, null, 2))
      return session
    }
    
    return null
  } catch (error: any) {
    console.error(`⚠️ Could not retrieve payment intent: ${error.message}`)
    return null
  }
}

const email = process.argv[2]
const paymentIntentId = process.argv[3]

if (!email) {
  console.error("❌ Please provide an email address")
  console.error("Usage: npx tsx scripts/fix-paid-blueprint-purchase.ts <email> [stripe-payment-intent-id]")
  process.exit(1)
}

if (paymentIntentId) {
  getSessionFromPaymentIntent(paymentIntentId).then(() => {
    fixPurchase(email, paymentIntentId).then(() => process.exit(0))
  })
} else {
  fixPurchase(email).then(() => process.exit(0))
}
