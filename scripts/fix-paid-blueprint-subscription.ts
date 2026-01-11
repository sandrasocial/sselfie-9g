/**
 * Fix Paid Blueprint Subscription
 * 
 * This script fixes paid blueprint purchases where the webhook processed the payment
 * but failed to create the subscription row (e.g., due to userId resolution issues).
 * 
 * It:
 * 1. Finds stripe_payments with product_type='paid_blueprint' and user_id IS NULL or missing subscription
 * 2. Attempts to resolve user_id from customer email
 * 3. Creates the missing subscription row
 * 4. Grants credits if missing
 * 
 * Usage:
 *   npx tsx scripts/fix-paid-blueprint-subscription.ts [user-email]
 */

// Load environment variables first
require("dotenv").config({ path: ".env.local" })

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function fixPaidBlueprintSubscription(userEmail?: string) {
  console.log("[Fix] Starting paid blueprint subscription fix...")
  
  try {
    // If user email provided, fix specific user
    if (userEmail) {
      console.log(`[Fix] Fixing subscription for user: ${userEmail}`)
      
      // Find user by email
      const users = await sql`
        SELECT id, email FROM users WHERE email = ${userEmail} LIMIT 1
      `
      
      if (users.length === 0) {
        console.error(`[Fix] ❌ User not found: ${userEmail}`)
        process.exit(1)
      }
      
      const userId = users[0].id
      console.log(`[Fix] Found user: ${userId}`)
      
      // Check if subscription exists
      const existingSubscription = await sql`
        SELECT id FROM subscriptions
        WHERE user_id = ${userId}
        AND product_type = 'paid_blueprint'
        AND status = 'active'
        LIMIT 1
      `
      
      if (existingSubscription.length > 0) {
        console.log(`[Fix] ✅ Subscription already exists for user ${userId}`)
        process.exit(0)
      }
      
      // Find stripe_payments for this user (by email in metadata or customer)
      const payments = await sql`
        SELECT 
          stripe_payment_id,
          stripe_customer_id,
          amount_cents,
          metadata,
          created_at
        FROM stripe_payments
        WHERE product_type = 'paid_blueprint'
        AND status = 'succeeded'
        AND (
          metadata::text LIKE ${`%${userEmail}%`}
          OR user_id = ${userId}
        )
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (payments.length === 0) {
        console.error(`[Fix] ❌ No paid blueprint payment found for user ${userEmail}`)
        console.log(`[Fix] 💡 Make sure the payment was processed and stored in stripe_payments table`)
        process.exit(1)
      }
      
      const payment = payments[0]
      console.log(`[Fix] Found payment: ${payment.stripe_payment_id}`)
      
      // Create subscription row
      await sql`
        INSERT INTO subscriptions (
          user_id,
          product_type,
          status,
          stripe_customer_id,
          created_at,
          updated_at
        )
        VALUES (
          ${userId},
          'paid_blueprint',
          'active',
          ${payment.stripe_customer_id || null},
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `
      
      console.log(`[Fix] ✅ Created subscription row for user ${userId}`)
      
      // Check if credits were granted
      const creditTransactions = await sql`
        SELECT id FROM credit_transactions
        WHERE user_id = ${userId}
        AND stripe_payment_id = ${payment.stripe_payment_id}
        AND transaction_type = 'purchase'
        LIMIT 1
      `
      
      if (creditTransactions.length === 0) {
        console.log(`[Fix] ⚠️ Credits not granted for this payment. Granting 60 credits...`)
        const { grantPaidBlueprintCredits } = await import("@/lib/credits")
        const result = await grantPaidBlueprintCredits(userId, payment.stripe_payment_id, true)
        if (result.success) {
          console.log(`[Fix] ✅ Granted 60 credits. New balance: ${result.newBalance}`)
        } else {
          console.error(`[Fix] ❌ Failed to grant credits: ${result.error}`)
        }
      } else {
        console.log(`[Fix] ✅ Credits already granted`)
      }
      
      console.log(`[Fix] ✅ Fix complete for user ${userEmail}`)
      process.exit(0)
    }
    
    // Otherwise, list all payments that need fixing
    console.log("[Fix] Finding all paid blueprint payments that need subscription rows...")
    
    // First, try to find payments where user_id is NULL (needs resolution)
    const paymentsWithNullUserId = await sql`
      SELECT 
        sp.stripe_payment_id,
        sp.stripe_customer_id,
        sp.metadata,
        sp.created_at
      FROM stripe_payments sp
      WHERE sp.product_type = 'paid_blueprint'
      AND sp.status = 'succeeded'
      AND sp.user_id IS NULL
      ORDER BY sp.created_at DESC
    `
    
    // Also find payments with user_id but missing subscription
    const paymentsNeedingFix = await sql`
      SELECT 
        sp.stripe_payment_id,
        sp.stripe_customer_id,
        sp.metadata,
        sp.created_at,
        u.id as user_id,
        u.email as user_email
      FROM stripe_payments sp
      LEFT JOIN users u ON (
        sp.metadata->>'customer_email' = u.email
        OR sp.user_id = u.id
      )
      LEFT JOIN subscriptions s ON (
        s.user_id = u.id
        AND s.product_type = 'paid_blueprint'
        AND s.status = 'active'
      )
      WHERE sp.product_type = 'paid_blueprint'
      AND sp.status = 'succeeded'
      AND s.id IS NULL
      AND u.id IS NOT NULL
      AND sp.user_id IS NOT NULL
      ORDER BY sp.created_at DESC
    `
    
    const totalNeedingFix = paymentsWithNullUserId.length + paymentsNeedingFix.length
    
    if (totalNeedingFix === 0) {
      console.log("[Fix] ✅ No payments need fixing - all subscriptions exist")
      process.exit(0)
    }
    
    if (paymentsWithNullUserId.length > 0) {
      console.log(`[Fix] Found ${paymentsWithNullUserId.length} payments with user_id = NULL (need email resolution):`)
      paymentsWithNullUserId.forEach((payment: any) => {
        const email = payment.metadata?.customer_email || payment.metadata?.email || 'unknown'
        console.log(`  - Payment: ${payment.stripe_payment_id}, Email: ${email} (user_id = NULL)`)
      })
      console.log("\n[Fix] ⚠️  Payments with user_id = NULL need manual fixing with email:")
      console.log(`  npx tsx scripts/fix-paid-blueprint-subscription.ts <user-email>`)
    }
    
    if (paymentsNeedingFix.length > 0) {
      console.log(`\n[Fix] Found ${paymentsNeedingFix.length} payments with user_id but missing subscription rows:`)
      paymentsNeedingFix.forEach((payment: any) => {
        console.log(`  - Payment: ${payment.stripe_payment_id}, User: ${payment.user_email} (${payment.user_id})`)
      })
      console.log("\n[Fix] To fix a specific user, run:")
      console.log(`  npx tsx scripts/fix-paid-blueprint-subscription.ts <user-email>`)
    }
    
  } catch (error: any) {
    console.error("[Fix] ❌ Error:", error.message)
    console.error(error)
    process.exit(1)
  }
}

const userEmail = process.argv[2]
fixPaidBlueprintSubscription(userEmail)
