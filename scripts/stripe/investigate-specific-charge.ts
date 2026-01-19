/**
 * Investigate specific charge for eveliene@gmail.com
 * Amount: $235.49
 */

import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const sql = neon(process.env.DATABASE_URL!)

async function investigateCharge() {
  console.log("=" .repeat(80))
  console.log("INVESTIGATING: eveliene@gmail.com - $235.49 charge")
  console.log("=" .repeat(80))
  console.log()
  
  const email = "eveliene@gmail.com"
  
  // Get user from database
  const users = await sql`
    SELECT 
      u.id,
      u.email,
      u.stripe_customer_id,
      u.created_at
    FROM users u
    WHERE u.email = ${email}
  `
  
  if (users.length === 0) {
    console.log("❌ User not found in database")
    return
  }
  
  const user = users[0]
  console.log("✅ User found:")
  console.log(`   User ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Customer ID: ${user.stripe_customer_id}`)
  console.log(`   Created: ${new Date(user.created_at as string).toISOString()}`)
  console.log()
  
  if (!user.stripe_customer_id) {
    console.log("❌ No Stripe customer ID")
    return
  }
  
  const customerId = user.stripe_customer_id as string
  
  // Get all subscriptions
  console.log("-".repeat(80))
  console.log("SUBSCRIPTIONS")
  console.log("-".repeat(80))
  console.log()
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 100,
    expand: ['data.items.data.price', 'data.discount'],
  })
  
  for (const sub of subscriptions.data) {
    console.log(`Subscription: ${sub.id}`)
    console.log(`  Status: ${sub.status}`)
    console.log(`  Created: ${new Date(sub.created * 1000).toISOString()}`)
    console.log(`  Current period: ${new Date(sub.current_period_start * 1000).toISOString()} to ${new Date(sub.current_period_end * 1000).toISOString()}`)
    console.log(`  Price: ${sub.items.data[0]?.price?.id} - $${(sub.items.data[0]?.price?.unit_amount || 0) / 100}`)
    
    if (sub.discount) {
      console.log(`  Discount: ${sub.discount.coupon.id} - ${sub.discount.coupon.percent_off}% off (${sub.discount.coupon.duration})`)
    } else {
      console.log(`  Discount: None`)
    }
    
    console.log()
  }
  
  // Get all invoices
  console.log("-".repeat(80))
  console.log("INVOICES")
  console.log("-".repeat(80))
  console.log()
  
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 100,
    expand: ['data.lines.data.price', 'data.subscription'],
  })
  
  for (const invoice of invoices.data) {
    console.log(`Invoice: ${invoice.id}`)
    console.log(`  Date: ${new Date(invoice.created * 1000).toISOString()}`)
    console.log(`  Status: ${invoice.status}`)
    console.log(`  Amount paid: $${(invoice.amount_paid / 100).toFixed(2)}`)
    console.log(`  Amount due: $${(invoice.amount_due / 100).toFixed(2)}`)
    console.log(`  Billing reason: ${invoice.billing_reason}`)
    
    if (invoice.discount) {
      console.log(`  Discount: ${invoice.discount.coupon.id} - ${invoice.discount.coupon.percent_off}% off`)
    }
    
    if (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
      console.log(`  Total discount: $${(invoice.total_discount_amounts[0].amount / 100).toFixed(2)}`)
    }
    
    console.log(`  Line items:`)
    for (const line of invoice.lines.data) {
      console.log(`    - ${line.description}`)
      console.log(`      Amount: $${(line.amount / 100).toFixed(2)}`)
      console.log(`      Quantity: ${line.quantity}`)
      
      if (line.proration) {
        console.log(`      🔄 PRORATION`)
      }
      
      if (line.price) {
        const price = typeof line.price === 'string' ? 
          await stripe.prices.retrieve(line.price) : 
          line.price
        console.log(`      Price: ${price.id} - $${(price.unit_amount || 0) / 100}`)
      }
      
      if (line.discount_amounts && line.discount_amounts.length > 0) {
        console.log(`      Discount: $${(line.discount_amounts[0].amount / 100).toFixed(2)}`)
      }
    }
    
    console.log()
  }
  
  // Find the $235.49 charge specifically
  console.log("-".repeat(80))
  console.log("SEARCHING FOR $235.49 CHARGE")
  console.log("-".repeat(80))
  console.log()
  
  const target = 23549 // $235.49 in cents
  const targetInvoice = invoices.data.find(inv => inv.amount_paid === target)
  
  if (targetInvoice) {
    console.log("✅ FOUND THE $235.49 CHARGE!")
    console.log()
    console.log(`Invoice: ${targetInvoice.id}`)
    console.log(`Date: ${new Date(targetInvoice.created * 1000).toISOString()}`)
    console.log(`Status: ${targetInvoice.status}`)
    console.log(`Amount paid: $${(targetInvoice.amount_paid / 100).toFixed(2)}`)
    console.log(`Billing reason: ${targetInvoice.billing_reason}`)
    console.log()
    
    console.log("BREAKDOWN:")
    console.log()
    
    let subtotal = 0
    let discount = 0
    
    for (const line of targetInvoice.lines.data) {
      console.log(`${line.description}`)
      console.log(`  Amount: $${(line.amount / 100).toFixed(2)}`)
      console.log(`  Quantity: ${line.quantity}`)
      
      if (line.proration) {
        console.log(`  Type: PRORATION`)
      }
      
      if (line.price) {
        const price = typeof line.price === 'string' ? 
          await stripe.prices.retrieve(line.price) : 
          line.price
        console.log(`  Unit price: $${(price.unit_amount || 0) / 100}`)
      }
      
      if (line.discount_amounts && line.discount_amounts.length > 0) {
        const lineDiscount = line.discount_amounts[0].amount
        console.log(`  Discount: -$${(lineDiscount / 100).toFixed(2)}`)
        discount += lineDiscount
      }
      
      subtotal += line.amount
      console.log()
    }
    
    console.log("-".repeat(40))
    console.log(`Subtotal: $${(subtotal / 100).toFixed(2)}`)
    
    if (discount > 0) {
      console.log(`Discount: -$${(discount / 100).toFixed(2)}`)
    }
    
    if (targetInvoice.total_discount_amounts && targetInvoice.total_discount_amounts.length > 0) {
      const totalDiscount = targetInvoice.total_discount_amounts.reduce((sum, d) => sum + d.amount, 0)
      console.log(`Total discount: -$${(totalDiscount / 100).toFixed(2)}`)
    }
    
    console.log(`TOTAL PAID: $${(targetInvoice.amount_paid / 100).toFixed(2)}`)
    console.log()
    
    // Analysis
    console.log("=" .repeat(80))
    console.log("ANALYSIS")
    console.log("=" .repeat(80))
    console.log()
    
    if (targetInvoice.billing_reason === "subscription_update") {
      console.log("⚠️  This is a SUBSCRIPTION UPDATE invoice (upgrade/downgrade)")
      console.log("   Likely includes proration for plan change")
    }
    
    if (targetInvoice.billing_reason === "subscription_create") {
      console.log("ℹ️  This is the FIRST invoice for a new subscription")
    }
    
    if (targetInvoice.billing_reason === "subscription_cycle") {
      console.log("ℹ️  This is a regular RENEWAL invoice")
    }
    
    const hasProration = targetInvoice.lines.data.some(line => line.proration)
    if (hasProration) {
      console.log("🔄 Contains PRORATION line items")
      console.log("   This explains the unusual amount")
    }
    
    const hasDiscount = (targetInvoice.total_discount_amounts && targetInvoice.total_discount_amounts.length > 0)
    if (hasDiscount) {
      console.log("💰 Has DISCOUNT applied")
      const totalDiscount = targetInvoice.total_discount_amounts!.reduce((sum, d) => sum + d.amount, 0)
      console.log(`   Discount amount: $${(totalDiscount / 100).toFixed(2)}`)
    }
    
    // Calculate what was expected
    console.log()
    console.log("EXPECTED vs ACTUAL:")
    console.log()
    
    const subscription = await stripe.subscriptions.retrieve(
      typeof targetInvoice.subscription === 'string' 
        ? targetInvoice.subscription 
        : targetInvoice.subscription!.id
    )
    
    const currentPrice = subscription.items.data[0]?.price?.unit_amount || 0
    console.log(`Current subscription price: $${currentPrice / 100}/month`)
    
    if (subscription.discount) {
      const discountPercent = subscription.discount.coupon.percent_off || 0
      const discountedPrice = currentPrice * (1 - discountPercent / 100)
      console.log(`With ${discountPercent}% discount: $${(discountedPrice / 100).toFixed(2)}/month`)
    }
    
    console.log(`Actual charge: $${(targetInvoice.amount_paid / 100).toFixed(2)}`)
    console.log()
    
    // Verdict
    console.log("=" .repeat(80))
    console.log("VERDICT")
    console.log("=" .repeat(80))
    console.log()
    
    if (hasProration) {
      console.log("✅ INTENTIONAL - This is a proration charge")
      console.log("   User likely upgraded/downgraded their plan mid-cycle")
      console.log("   The $235.49 represents:")
      console.log("   - Refund for unused time on old plan")
      console.log("   - Charge for new plan until end of current period")
      console.log()
      console.log("   This is NORMAL Stripe behavior for plan changes.")
    } else if (hasDiscount && targetInvoice.amount_paid > currentPrice * 1.5) {
      console.log("⚠️  UNUSUAL - Amount is higher than expected")
      console.log("   Even with discount, $235.49 is ~2.4x the monthly price")
      console.log("   Possible explanations:")
      console.log("   - Multiple months charged at once")
      console.log("   - Additional items/services added")
      console.log("   - Billing error")
    } else {
      console.log("✅ APPEARS CORRECT")
    }
  } else {
    console.log("❌ Could not find invoice for $235.49")
    console.log()
    console.log("All invoice amounts:")
    for (const inv of invoices.data) {
      console.log(`  ${inv.id}: $${(inv.amount_paid / 100).toFixed(2)}`)
    }
  }
}

investigateCharge().catch(console.error)
