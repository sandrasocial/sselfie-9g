/**
 * Backfill Historical Stripe Payments
 * 
 * Fetches ALL historical payments from Stripe and stores them in:
 * 1. stripe_payments table (comprehensive)
 * 2. credit_transactions.payment_amount_cents (legacy support)
 * 
 * This ensures all revenue data is in the database for fast queries.
 */

import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set")
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Initialize Stripe directly (avoid server-only wrapper)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL)

interface PaymentRecord {
  stripe_payment_id: string
  stripe_invoice_id?: string
  stripe_subscription_id?: string
  stripe_customer_id: string
  user_id?: string
  amount_cents: number
  currency: string
  status: string
  payment_type: "subscription" | "one_time_session" | "credit_topup"
  product_type?: string
  description?: string
  metadata: Record<string, any>
  payment_date: Date
  is_test_mode: boolean
}

async function findUserIdByCustomerId(customerId: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT id FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
    `
    if (result.length > 0) {
      return result[0].id
    }
    
    // Also check subscriptions table
    const subResult = await sql`
      SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1
    `
    if (subResult.length > 0) {
      return subResult[0].user_id
    }
    
    return null
  } catch (error) {
    console.error(`Error finding user for customer ${customerId}:`, error)
    return null
  }
}

async function identifyPaymentType(
  paymentIntent: any,
  charge?: any
): Promise<{ payment_type: "subscription" | "one_time_session" | "credit_topup"; product_type?: string }> {
  const metadata = paymentIntent.metadata || {}
  const description = paymentIntent.description || charge?.description || ""
  
  // Check metadata first
  if (metadata.product_type === "credit_topup" || metadata.package_id?.includes("credit")) {
    return { payment_type: "credit_topup", product_type: "credit_topup" }
  }
  
  if (metadata.product_type === "one_time_session") {
    return { payment_type: "one_time_session", product_type: "one_time_session" }
  }
  
  // Check if it's a subscription payment (has invoice)
  if (paymentIntent.invoice) {
    try {
      const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string, {
        expand: ["subscription"],
      })
      if (invoice.subscription) {
        return { 
          payment_type: "subscription", 
          product_type: metadata.product_type || "sselfie_studio_membership" 
        }
      }
    } catch (err) {
      // If we can't retrieve invoice, continue checking
    }
  }
  
  // Check description
  if (description.toLowerCase().includes("credit")) {
    return { payment_type: "credit_topup", product_type: "credit_topup" }
  }
  
  // Default to one-time if no invoice
  if (!paymentIntent.invoice) {
    return { payment_type: "one_time_session", product_type: "one_time_session" }
  }
  
  // Default fallback
  return { payment_type: "one_time_session" }
}

async function backfillPaymentIntents() {
  console.log("=".repeat(80))
  console.log("Starting Payment Intents Backfill")
  console.log("=".repeat(80))
  
  let hasMore = true
  let startingAfter: string | undefined
  let totalProcessed = 0
  let totalStored = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  try {
    while (hasMore) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        starting_after: startingAfter,
      })
      
      console.log(`\nProcessing batch of ${paymentIntents.data.length} payment intents...`)
      
      for (const pi of paymentIntents.data) {
        totalProcessed++
        
        try {
          // Skip if not succeeded
          if (pi.status !== "succeeded") {
            totalSkipped++
            continue
          }
          
          // Get customer ID
          const customerId = typeof pi.customer === 'string' 
            ? pi.customer 
            : pi.customer?.id || null
          
          if (!customerId) {
            totalSkipped++
            continue
          }
          
          // Find user ID
          const userId = await findUserIdByCustomerId(customerId)
          
          // Get charge to determine amount and test mode
          let charge: any = null
          let amountCents = pi.amount
          let isTestMode = !pi.livemode
          
          if (pi.latest_charge) {
            try {
              charge = typeof pi.latest_charge === 'string'
                ? await stripe.charges.retrieve(pi.latest_charge)
                : pi.latest_charge
              
              if (charge.status === "succeeded") {
                amountCents = charge.amount
                isTestMode = !charge.livemode
              }
            } catch (err) {
              // Use payment intent amount if charge retrieval fails
            }
          }
          
          // Identify payment type
          const { payment_type, product_type } = await identifyPaymentType(pi, charge)
          
          // Get invoice/subscription info if subscription payment
          let invoiceId: string | null = null
          let subscriptionId: string | null = null
          
          if (pi.invoice) {
            invoiceId = typeof pi.invoice === 'string' ? pi.invoice : pi.invoice?.id || null
            if (invoiceId) {
              try {
                const invoice = await stripe.invoices.retrieve(invoiceId, {
                  expand: ["subscription"],
                })
                if (invoice.subscription) {
                  subscriptionId = typeof invoice.subscription === 'string' 
                    ? invoice.subscription 
                    : invoice.subscription?.id || null
                }
              } catch (err) {
                // Continue without subscription ID
              }
            }
          }
          
          // Create payment record
          const paymentRecord: PaymentRecord = {
            stripe_payment_id: pi.id,
            stripe_invoice_id: invoiceId || undefined,
            stripe_subscription_id: subscriptionId || undefined,
            stripe_customer_id: customerId,
            user_id: userId || undefined,
            amount_cents: amountCents,
            currency: pi.currency || "usd",
            status: "succeeded",
            payment_type,
            product_type,
            description: pi.description || charge?.description || undefined,
            metadata: pi.metadata || {},
            payment_date: new Date(pi.created * 1000),
            is_test_mode: isTestMode,
          }
          
            // Store in stripe_payments table
          try {
            await sql`
              INSERT INTO stripe_payments (
                stripe_payment_id,
                stripe_invoice_id,
                stripe_subscription_id,
                stripe_customer_id,
                user_id,
                amount_cents,
                currency,
                status,
                payment_type,
                product_type,
                description,
                metadata,
                payment_date,
                is_test_mode,
                created_at,
                updated_at
              )
              VALUES (
                ${paymentRecord.stripe_payment_id},
                ${paymentRecord.stripe_invoice_id || null},
                ${paymentRecord.stripe_subscription_id || null},
                ${paymentRecord.stripe_customer_id},
                ${paymentRecord.user_id || null},
                ${paymentRecord.amount_cents},
                ${paymentRecord.currency},
                ${paymentRecord.status},
                ${paymentRecord.payment_type},
                ${paymentRecord.product_type || null},
                ${paymentRecord.description || null},
                ${JSON.stringify(paymentRecord.metadata)},
                ${paymentRecord.payment_date},
                ${paymentRecord.is_test_mode},
                NOW(),
                NOW()
              )
              ON CONFLICT (stripe_payment_id) 
              DO UPDATE SET
                payment_type = ${paymentRecord.payment_type},
                product_type = ${paymentRecord.product_type || null},
                updated_at = NOW()
            `
            totalStored++
            
            // Also update credit_transactions if it exists
            if (userId && (payment_type === "credit_topup" || payment_type === "one_time_session")) {
              try {
                await sql`
                  UPDATE credit_transactions
                  SET 
                    payment_amount_cents = ${amountCents},
                    product_type = ${product_type || null}
                  WHERE user_id = ${userId}
                    AND stripe_payment_id = ${pi.id}
                    AND (payment_amount_cents IS NULL OR product_type IS NULL)
                `
              } catch (err) {
                // Non-critical - credit_transactions update is optional
              }
            }
            
            if (totalStored % 50 === 0) {
              console.log(`  ✅ Stored ${totalStored} payments so far...`)
            }
          } catch (dbError: any) {
            if (dbError.message?.includes("duplicate") || dbError.message?.includes("unique")) {
              totalSkipped++ // Already exists
            } else {
              console.error(`  ❌ Error storing payment ${pi.id}:`, dbError.message)
              totalErrors++
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Error processing payment intent ${pi.id}:`, error.message)
          totalErrors++
        }
      }
      
      hasMore = paymentIntents.has_more
      if (paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id
      }
      
      // Progress update
      console.log(`Progress: ${totalProcessed} processed, ${totalStored} stored, ${totalSkipped} skipped, ${totalErrors} errors`)
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("Payment Intents Backfill Complete")
    console.log("=".repeat(80))
    console.log(`Total Processed: ${totalProcessed}`)
    console.log(`Total Stored: ${totalStored}`)
    console.log(`Total Skipped: ${totalSkipped}`)
    console.log(`Total Errors: ${totalErrors}`)
    console.log("=".repeat(80))
    
  } catch (error: any) {
    console.error("Fatal error during backfill:", error.message)
    throw error
  }
}

async function backfillInvoices() {
  console.log("\n" + "=".repeat(80))
  console.log("Starting Invoice Payments Backfill (Subscriptions)")
  console.log("=".repeat(80))
  
  let hasMore = true
  let startingAfter: string | undefined
  let totalProcessed = 0
  let totalStored = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  try {
    while (hasMore) {
      const invoices = await stripe.invoices.list({
        limit: 100,
        starting_after: startingAfter,
        status: "paid",
      })
      
      console.log(`\nProcessing batch of ${invoices.data.length} invoices...`)
      
      for (const invoice of invoices.data) {
        totalProcessed++
        
        try {
          // Skip if no subscription
          if (!invoice.subscription) {
            totalSkipped++
            continue
          }
          
          const subscriptionId = typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription?.id || null
          
          if (!subscriptionId) {
            totalSkipped++
            continue
          }
          
          // Get customer ID
          const customerId = typeof invoice.customer === 'string' 
            ? invoice.customer 
            : invoice.customer?.id || null
          
          if (!customerId) {
            totalSkipped++
            continue
          }
          
          // Find user ID
          const userId = await findUserIdByCustomerId(customerId)
          
          // Get subscription to determine product type
          let productType = "sselfie_studio_membership"
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            productType = subscription.metadata?.product_type || "sselfie_studio_membership"
          } catch (err) {
            // Use default
          }
          
          // Get payment identifier
          const chargeId = typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id || null
          const paymentIntentId = invoice.payment_intent 
            ? (typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id)
            : null
          const paymentId = chargeId || paymentIntentId || invoice.id
          
          const isTestMode = !invoice.livemode
          
          // Store in stripe_payments table
          try {
            await sql`
              INSERT INTO stripe_payments (
                stripe_payment_id,
                stripe_invoice_id,
                stripe_subscription_id,
                stripe_customer_id,
                user_id,
                amount_cents,
                currency,
                status,
                payment_type,
                product_type,
                description,
                metadata,
                payment_date,
                is_test_mode,
                created_at,
                updated_at
              )
              VALUES (
                ${paymentId},
                ${invoice.id},
                ${subscriptionId},
                ${customerId},
                ${userId || null},
                ${invoice.amount_paid},
                ${invoice.currency || "usd"},
                ${invoice.status || "succeeded"},
                'subscription',
                ${productType},
                ${invoice.description || `Subscription payment - ${productType}`},
                ${JSON.stringify(invoice.metadata || {})},
                to_timestamp(${invoice.created}),
                ${isTestMode},
                NOW(),
                NOW()
              )
              ON CONFLICT (stripe_payment_id) DO NOTHING
            `
            totalStored++
            
            if (totalStored % 50 === 0) {
              console.log(`  ✅ Stored ${totalStored} subscription payments so far...`)
            }
          } catch (dbError: any) {
            if (dbError.message?.includes("duplicate") || dbError.message?.includes("unique")) {
              totalSkipped++ // Already exists
            } else {
              console.error(`  ❌ Error storing invoice ${invoice.id}:`, dbError.message)
              totalErrors++
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Error processing invoice ${invoice.id}:`, error.message)
          totalErrors++
        }
      }
      
      hasMore = invoices.has_more
      if (invoices.data.length > 0) {
        startingAfter = invoices.data[invoices.data.length - 1].id
      }
      
      console.log(`Progress: ${totalProcessed} processed, ${totalStored} stored, ${totalSkipped} skipped, ${totalErrors} errors`)
    }
    
    console.log("\n" + "=".repeat(80))
    console.log("Invoice Payments Backfill Complete")
    console.log("=".repeat(80))
    console.log(`Total Processed: ${totalProcessed}`)
    console.log(`Total Stored: ${totalStored}`)
    console.log(`Total Skipped: ${totalSkipped}`)
    console.log(`Total Errors: ${totalErrors}`)
    console.log("=".repeat(80))
    
  } catch (error: any) {
    console.error("Fatal error during invoice backfill:", error.message)
    throw error
  }
}

async function main() {
  console.log("🚀 Starting Historical Stripe Payments Backfill")
  console.log("This will fetch ALL payments from Stripe and store them in the database.")
  console.log("This may take several minutes depending on your payment volume.\n")
  
  try {
    // Backfill payment intents (one-time and credit purchases)
    await backfillPaymentIntents()
    
    // Backfill invoices (subscription payments)
    await backfillInvoices()
    
    // Final summary
    const [summary] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE payment_type = 'subscription') as subscription_payments,
        COUNT(*) FILTER (WHERE payment_type = 'one_time_session') as one_time_payments,
        COUNT(*) FILTER (WHERE payment_type = 'credit_topup') as credit_payments,
        COUNT(*) FILTER (WHERE is_test_mode = FALSE) as live_payments,
        COUNT(*) FILTER (WHERE is_test_mode = TRUE) as test_payments,
        SUM(amount_cents) FILTER (WHERE status = 'succeeded' AND is_test_mode = FALSE) / 100.0 as total_revenue
      FROM stripe_payments
    `
    
    console.log("\n" + "=".repeat(80))
    console.log("📊 Backfill Summary")
    console.log("=".repeat(80))
    console.log(`Subscription Payments: ${summary?.subscription_payments || 0}`)
    console.log(`One-Time Payments: ${summary?.one_time_payments || 0}`)
    console.log(`Credit Purchases: ${summary?.credit_payments || 0}`)
    console.log(`Live Payments: ${summary?.live_payments || 0}`)
    console.log(`Test Payments: ${summary?.test_payments || 0}`)
    console.log(`Total Revenue (Live): $${Number(summary?.total_revenue || 0).toLocaleString()}`)
    console.log("=".repeat(80))
    console.log("\n✅ Backfill complete! All historical payments are now in the database.")
    
  } catch (error: any) {
    console.error("\n❌ Backfill failed:", error.message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { main as backfillStripePayments }

