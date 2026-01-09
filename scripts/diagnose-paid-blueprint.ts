/**
 * Diagnostic script to check paid blueprint purchase status
 * Usage: npx tsx scripts/diagnose-paid-blueprint.ts <email>
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function diagnose(email: string) {
  console.log("=".repeat(80))
  console.log(`🔍 Diagnosing paid blueprint purchase for: ${email}`)
  console.log("=".repeat(80))

  try {
    // Check blueprint_subscribers
    console.log("\n📋 Checking blueprint_subscribers table...")
    const subscribers = await sql`
      SELECT 
        id,
        email,
        name,
        access_token,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_stripe_payment_id,
        converted_to_user,
        created_at,
        updated_at
      FROM blueprint_subscribers
      WHERE LOWER(email) = LOWER(${email})
      ORDER BY created_at DESC
    `
    
    if (subscribers.length === 0) {
      console.log("❌ No blueprint_subscribers record found for this email")
    } else {
      console.log(`✅ Found ${subscribers.length} record(s):`)
      subscribers.forEach((sub, idx) => {
        console.log(`\n  Record ${idx + 1}:`)
        console.log(`    ID: ${sub.id}`)
        console.log(`    Email: ${sub.email}`)
        console.log(`    Name: ${sub.name}`)
        console.log(`    Access Token: ${sub.access_token ? 'SET' : 'MISSING'}`)
        console.log(`    Paid Blueprint Purchased: ${sub.paid_blueprint_purchased}`)
        console.log(`    Purchased At: ${sub.paid_blueprint_purchased_at || 'NULL'}`)
        console.log(`    Stripe Payment ID: ${sub.paid_blueprint_stripe_payment_id || 'NULL'}`)
        console.log(`    Converted to User: ${sub.converted_to_user}`)
        console.log(`    Created At: ${sub.created_at}`)
        console.log(`    Updated At: ${sub.updated_at}`)
      })
    }

    // Check stripe_payments
    console.log("\n💳 Checking stripe_payments table...")
    const payments = await sql`
      SELECT 
        id,
        stripe_payment_id,
        stripe_customer_id,
        user_id,
        amount_cents,
        currency,
        status,
        payment_type,
        product_type,
        description,
        payment_date,
        is_test_mode,
        created_at
      FROM stripe_payments
      WHERE metadata::text LIKE ${`%${email}%`}
         OR metadata->>'customer_email' = ${email}
      ORDER BY created_at DESC
      LIMIT 5
    `
    
    if (payments.length === 0) {
      console.log("❌ No stripe_payments records found for this email")
    } else {
      console.log(`✅ Found ${payments.length} payment record(s):`)
      payments.forEach((payment, idx) => {
        console.log(`\n  Payment ${idx + 1}:`)
        console.log(`    Stripe Payment ID: ${payment.stripe_payment_id}`)
        console.log(`    Product Type: ${payment.product_type}`)
        console.log(`    Amount: $${(payment.amount_cents / 100).toFixed(2)}`)
        console.log(`    Status: ${payment.status}`)
        console.log(`    Test Mode: ${payment.is_test_mode}`)
        console.log(`    Payment Date: ${payment.payment_date}`)
      })
    }

    // Check email_logs for paid blueprint delivery
    console.log("\n📧 Checking email_logs for paid blueprint delivery...")
    const emailLogs = await sql`
      SELECT 
        id,
        user_email,
        email_type,
        status,
        sent_at
      FROM email_logs
      WHERE LOWER(user_email) = LOWER(${email})
        AND email_type = 'paid-blueprint-delivery'
      ORDER BY sent_at DESC
    `
    
    if (emailLogs.length === 0) {
      console.log("❌ No paid-blueprint-delivery email logs found")
    } else {
      console.log(`✅ Found ${emailLogs.length} email log(s):`)
      emailLogs.forEach((log, idx) => {
        console.log(`\n  Email ${idx + 1}:`)
        console.log(`    Status: ${log.status}`)
        console.log(`    Sent At: ${log.sent_at}`)
      })
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ Diagnosis complete")
    console.log("=".repeat(80))
  } catch (error: any) {
    console.error("❌ Error during diagnosis:", error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

const email = process.argv[2]
if (!email) {
  console.error("❌ Please provide an email address")
  console.error("Usage: npx tsx scripts/diagnose-paid-blueprint.ts <email>")
  process.exit(1)
}

diagnose(email).then(() => process.exit(0))
