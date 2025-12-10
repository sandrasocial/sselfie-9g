import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) {
  console.error("Missing environment variables")
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})
const sql = neon(process.env.DATABASE_URL)

async function checkUser(email: string) {
  console.log(`\nChecking user: ${email}\n`)
  console.log("=".repeat(80))

  // Check database
  const users = await sql`
    SELECT id, email, stripe_customer_id, created_at
    FROM users 
    WHERE email = ${email} 
    LIMIT 1
  `

  if (users.length === 0) {
    console.log("✗ User not found in database")
    return
  }

  const user = users[0]
  console.log("Database Info:")
  console.log(`  User ID: ${user.id}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Stripe Customer ID: ${user.stripe_customer_id || "NOT SET"}`)
  console.log(`  Created: ${user.created_at}`)

  // Check subscriptions
  const subscriptions = await sql`
    SELECT product_type, status, stripe_customer_id, stripe_subscription_id
    FROM subscriptions
    WHERE user_id = ${user.id}
  `
  
  if (subscriptions.length > 0) {
    console.log("\nSubscriptions:")
    subscriptions.forEach((sub, i) => {
      console.log(`  ${i + 1}. ${sub.product_type} - ${sub.status}`)
      console.log(`     Customer ID: ${sub.stripe_customer_id || "NOT SET"}`)
    })
  } else {
    console.log("\n✗ No subscriptions found")
  }

  // Check credits
  const credits = await sql`
    SELECT balance FROM user_credits WHERE user_id = ${user.id} LIMIT 1
  `
  if (credits.length > 0) {
    console.log(`\nCredits: ${credits[0].balance}`)
  }

  // Search Stripe for customer
  console.log("\n" + "=".repeat(80))
  console.log("Searching Stripe...\n")

  const customers = await stripe.customers.list({
    email: email,
    limit: 10,
  })

  if (customers.data.length > 0) {
    console.log(`✓ Found ${customers.data.length} Stripe customer(s):`)
    customers.data.forEach((customer, i) => {
      console.log(`  ${i + 1}. Customer ID: ${customer.id}`)
      console.log(`     Created: ${new Date(customer.created * 1000).toISOString()}`)
      console.log(`     Metadata:`, customer.metadata)
    })
  } else {
    console.log("✗ No Stripe customer found by email")
  }

  // Search checkout sessions
  console.log("\nSearching checkout sessions...")
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
  })

  const matchingSessions = sessions.data.filter(
    (s) =>
      (s.customer_details?.email === email || s.customer_email === email) &&
      s.customer
  )

  if (matchingSessions.length > 0) {
    console.log(`✓ Found ${matchingSessions.length} checkout session(s):`)
    matchingSessions.forEach((session, i) => {
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id
      console.log(`  ${i + 1}. Session: ${session.id}`)
      console.log(`     Customer ID: ${customerId}`)
      console.log(`     Mode: ${session.mode}`)
      console.log(`     Status: ${session.status}`)
      console.log(`     Created: ${new Date(session.created * 1000).toISOString()}`)
    })
  } else {
    console.log("✗ No matching checkout sessions found")
  }

  // Search payment intents
  console.log("\nSearching payment intents...")
  const payments = await stripe.paymentIntents.list({
    limit: 100,
  })

  const matchingPayments = payments.data.filter(
    (p) => p.receipt_email === email && p.customer
  )

  if (matchingPayments.length > 0) {
    console.log(`✓ Found ${matchingPayments.length} payment intent(s):`)
    matchingPayments.forEach((payment, i) => {
      const customerId =
        typeof payment.customer === "string"
          ? payment.customer
          : payment.customer?.id
      console.log(`  ${i + 1}. Payment: ${payment.id}`)
      console.log(`     Customer ID: ${customerId}`)
      console.log(`     Amount: $${(payment.amount / 100).toFixed(2)}`)
      console.log(`     Status: ${payment.status}`)
    })
  } else {
    console.log("✗ No matching payment intents found")
  }

  console.log("\n" + "=".repeat(80))
}

async function main() {
  const email = process.argv[2] || "mariastegemeyer@gmail.com"
  await checkUser(email)
}

main().catch(console.error)
