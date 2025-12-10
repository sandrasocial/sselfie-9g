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

/**
 * Convert a guest customer to a regular customer and link to user account
 */
async function convertGuestToCustomer(email: string, guestCustomerId: string, paymentIntentId?: string) {
  console.log(`\nConverting guest customer ${guestCustomerId} for ${email}\n`)
  console.log("=".repeat(80))

  // Get user from database
  const users = await sql`
    SELECT id, email FROM users WHERE email = ${email} LIMIT 1
  `

  if (users.length === 0) {
    console.log("✗ User not found in database")
    return
  }

  const user = users[0]
  console.log(`✓ Found user: ${user.email} (ID: ${user.id})`)

    // Retrieve payment intent to get customer details
    // Guest customers can't be retrieved directly, but we can get info from the payment
  try {
    console.log(`\nRetrieving payment information...`)
    
    let userPayment
    
    if (paymentIntentId) {
      // Get specific payment intent
      console.log(`Retrieving payment intent: ${paymentIntentId}`)
      userPayment = await stripe.paymentIntents.retrieve(paymentIntentId)
      console.log(`✓ Found payment: ${userPayment.id}`)
    } else {
      // Search for payment intents with this email
      const payments = await stripe.paymentIntents.list({
        limit: 100,
      })
      
      userPayment = payments.data.find(
        (p) => p.receipt_email === email && p.customer === guestCustomerId
      )
      
      if (!userPayment) {
        // Try to get payment by email
        console.log(`Searching by email for payments...`)
        const emailPayments = payments.data.filter((p) => p.receipt_email === email)
        
        if (emailPayments.length === 0) {
          throw new Error(`No payment found for email ${email}`)
        }
        
        userPayment = emailPayments[0]
        console.log(`Found payment: ${userPayment.id}`)
      }
    }
    
    const customerEmail = userPayment.receipt_email || email
    const customerName = userPayment.metadata?.name || undefined
    
    console.log(`Payment email: ${customerEmail}`)
    console.log(`Payment amount: $${(userPayment.amount / 100).toFixed(2)}`)

    // Check if a regular customer already exists for this email
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    })
    
    let regularCustomerId: string
    
    if (existingCustomers.data.length > 0) {
      // Use existing customer
      regularCustomerId = existingCustomers.data[0].id
      console.log(`\n✓ Found existing regular customer: ${regularCustomerId}`)
    } else {
      // Create a regular customer with the same email and details
      console.log(`\nCreating regular customer...`)
      const regularCustomer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          user_id: user.id,
          migrated_from_guest: guestCustomerId,
          payment_intent: userPayment.id,
        },
      })
      regularCustomerId = regularCustomer.id
      console.log(`✓ Created regular customer: ${regularCustomerId}`)
    }

    // Update user in database
    await sql`
      UPDATE users 
      SET stripe_customer_id = ${regularCustomerId}
      WHERE id = ${user.id}
    `

    console.log(`✓ Updated user record with customer ID: ${regularCustomerId}`)

    // Note: We can't directly convert a guest customer or update past payments
    // But future payments will use the new customer, and the user can access the portal
    
    console.log("\n" + "=".repeat(80))
    console.log("✓ Conversion complete!")
    console.log(`  Guest Customer: ${guestCustomerId}`)
    console.log(`  Regular Customer: ${regularCustomerId}`)
    console.log(`  User can now access the Stripe Customer Portal`)
    console.log(`\nNote: The original payment is still associated with the guest customer.`)
    console.log(`However, the user can now access invoices for future payments.`)
    
    return regularCustomerId
  } catch (error: any) {
    if (error.code === "resource_missing") {
      console.log(`✗ Guest customer not found: ${guestCustomerId}`)
    } else {
      console.error(`✗ Error:`, error.message)
    }
    throw error
  }
}

async function main() {
  const email = process.argv[2] || "mariastegemeyer@gmail.com"
  const guestCustomerId = process.argv[3] || "gcus_1SSNMXEVJvME7vkw9E9x4C1Q"
  const paymentIntentId = process.argv[4] || "pi_3SSNMTEVJvME7vkw0NKAxSm7"

  await convertGuestToCustomer(email, guestCustomerId, paymentIntentId)
}

main().catch((error) => {
  console.error("\n✗ Fatal error:", error)
  process.exit(1)
})
