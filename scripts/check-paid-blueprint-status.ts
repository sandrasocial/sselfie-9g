/**
 * Check Paid Blueprint Status
 * 
 * This script checks the current state of a user's paid blueprint subscription
 * and related payments in the database.
 */

// Load environment variables first
require("dotenv").config({ path: ".env.local" })

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function checkPaidBlueprintStatus(userEmail: string) {
  console.log(`[Check] Checking paid blueprint status for: ${userEmail}`)
  
  try {
    // Find user
    const users = await sql`
      SELECT id, email FROM users WHERE email = ${userEmail} LIMIT 1
    `
    
    if (users.length === 0) {
      console.error(`[Check] ❌ User not found: ${userEmail}`)
      process.exit(1)
    }
    
    const userId = users[0].id
    console.log(`[Check] Found user: ${userId}`)
    
    // Check subscription
    const subscriptions = await sql`
      SELECT id, product_type, status, stripe_customer_id, created_at
      FROM subscriptions
      WHERE user_id = ${userId}
      AND product_type = 'paid_blueprint'
      ORDER BY created_at DESC
    `
    
    console.log(`\n[Check] Subscriptions (paid_blueprint):`)
    if (subscriptions.length === 0) {
      console.log(`  ❌ No paid_blueprint subscription found`)
    } else {
      subscriptions.forEach((sub: any) => {
        console.log(`  ✅ Subscription ID: ${sub.id}`)
        console.log(`     Status: ${sub.status}`)
        console.log(`     Stripe Customer ID: ${sub.stripe_customer_id}`)
        console.log(`     Created: ${sub.created_at}`)
      })
    }
    
    // Check stripe_payments
    const payments = await sql`
      SELECT 
        stripe_payment_id,
        stripe_customer_id,
        user_id,
        amount_cents,
        status,
        product_type,
        metadata,
        created_at
      FROM stripe_payments
      WHERE product_type = 'paid_blueprint'
      AND (
        user_id = ${userId}
        OR metadata::text LIKE ${`%${userEmail}%`}
      )
      ORDER BY created_at DESC
    `
    
    console.log(`\n[Check] Stripe Payments (paid_blueprint):`)
    if (payments.length === 0) {
      console.log(`  ❌ No paid_blueprint payments found`)
    } else {
      payments.forEach((payment: any) => {
        console.log(`  Payment ID: ${payment.stripe_payment_id}`)
        console.log(`     User ID: ${payment.user_id || 'NULL'}`)
        console.log(`     Status: ${payment.status}`)
        console.log(`     Amount: $${(payment.amount_cents / 100).toFixed(2)}`)
        console.log(`     Created: ${payment.created_at}`)
        if (payment.metadata) {
          const metadata = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata
          console.log(`     Metadata:`, JSON.stringify(metadata, null, 2))
        }
      })
    }
    
    // Check credit transactions
    const creditTransactions = await sql`
      SELECT 
        id,
        amount,
        transaction_type,
        description,
        stripe_payment_id,
        balance_after,
        created_at
      FROM credit_transactions
      WHERE user_id = ${userId}
      AND transaction_type = 'purchase'
      AND description LIKE '%Paid Blueprint%'
      ORDER BY created_at DESC
    `
    
    console.log(`\n[Check] Credit Transactions (paid_blueprint):`)
    if (creditTransactions.length === 0) {
      console.log(`  ❌ No paid_blueprint credit transactions found`)
    } else {
      creditTransactions.forEach((tx: any) => {
        console.log(`  Transaction ID: ${tx.id}`)
        console.log(`     Amount: ${tx.amount} credits`)
        console.log(`     Description: ${tx.description}`)
        console.log(`     Stripe Payment ID: ${tx.stripe_payment_id}`)
        console.log(`     Balance After: ${tx.balance_after}`)
        console.log(`     Created: ${tx.created_at}`)
      })
    }
    
    // Check blueprint_subscribers
    const blueprintSubscribers = await sql`
      SELECT 
        id,
        user_id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_stripe_payment_id,
        created_at
      FROM blueprint_subscribers
      WHERE user_id = ${userId}
      OR email = ${userEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `
    
    console.log(`\n[Check] Blueprint Subscribers:`)
    if (blueprintSubscribers.length === 0) {
      console.log(`  ❌ No blueprint_subscribers record found`)
    } else {
      blueprintSubscribers.forEach((bs: any) => {
        console.log(`  Record ID: ${bs.id}`)
        console.log(`     User ID: ${bs.user_id || 'NULL'}`)
        console.log(`     Email: ${bs.email}`)
        console.log(`     Paid Blueprint Purchased: ${bs.paid_blueprint_purchased}`)
        console.log(`     Purchased At: ${bs.paid_blueprint_purchased_at || 'NULL'}`)
        console.log(`     Stripe Payment ID: ${bs.paid_blueprint_stripe_payment_id || 'NULL'}`)
      })
    }
    
  } catch (error: any) {
    console.error("[Check] ❌ Error:", error.message)
    console.error(error)
    process.exit(1)
  }
}

const userEmail = process.argv[2]
if (!userEmail) {
  console.error("Usage: npx tsx scripts/check-paid-blueprint-status.ts <user-email>")
  process.exit(1)
}

checkPaidBlueprintStatus(userEmail)
