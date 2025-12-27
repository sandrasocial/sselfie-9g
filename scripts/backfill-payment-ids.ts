import { neon } from '@neondatabase/serverless'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

async function backfillPaymentIds() {
  console.log('🔍 Backfilling Stripe payment IDs for purchase transactions...\n')
  
  // Get all purchases without payment IDs
  const purchasesWithoutIds = await sql`
    SELECT 
      id,
      user_id,
      amount,
      created_at,
      description,
      is_test_mode
    FROM credit_transactions
    WHERE transaction_type = 'purchase'
      AND stripe_payment_id IS NULL
    ORDER BY created_at DESC
  `
  
  console.log(`Found ${purchasesWithoutIds.length} purchases without payment IDs\n`)
  
  if (purchasesWithoutIds.length === 0) {
    console.log('✅ All purchases already have payment IDs!')
    return
  }
  
  let matched = 0
  let unmatched = 0
  const errors: Array<{ id: number; error: string }> = []
  
  for (const purchase of purchasesWithoutIds) {
    try {
      // Get user's Stripe customer ID
      const [user] = await sql`
        SELECT stripe_customer_id 
        FROM users 
        WHERE id = ${purchase.user_id}
      `
      
      if (!user?.stripe_customer_id) {
        console.log(`⚠️ No Stripe customer ID for user ${purchase.user_id} (purchase ${purchase.id})`)
        unmatched++
        continue
      }
      
      // Search Stripe for payments around the purchase date
      const purchaseDate = new Date(purchase.created_at)
      const startDate = new Date(purchaseDate.getTime() - 3600000) // 1 hour before
      const endDate = new Date(purchaseDate.getTime() + 3600000)   // 1 hour after
      
      // Try to find payment intents or charges for this customer
      // We'll search both payment intents and charges
      const searchStart = Math.floor(startDate.getTime() / 1000)
      const searchEnd = Math.floor(endDate.getTime() / 1000)
      
      // Search payment intents first (more likely for one-time payments)
      const paymentIntents = await stripe.paymentIntents.list({
        customer: user.stripe_customer_id as string,
        created: {
          gte: searchStart,
          lte: searchEnd
        },
        limit: 10
      })
      
      // Also search charges
      const charges = await stripe.charges.list({
        customer: user.stripe_customer_id as string,
        created: {
          gte: searchStart,
          lte: searchEnd
        },
        limit: 10
      })
      
      // Try to match by status and livemode
      // Prefer payment intents that are succeeded
      let matchingPaymentId: string | null = null
      
      const succeededPaymentIntent = paymentIntents.data.find(pi => 
        pi.status === 'succeeded' &&
        pi.livemode === !purchase.is_test_mode
      )
      
      if (succeededPaymentIntent) {
        matchingPaymentId = succeededPaymentIntent.id
      } else {
        // Try charges
        const succeededCharge = charges.data.find(charge =>
          charge.status === 'succeeded' &&
          charge.paid === true &&
          charge.livemode === !purchase.is_test_mode
        )
        
        if (succeededCharge?.payment_intent) {
          matchingPaymentId = typeof succeededCharge.payment_intent === 'string'
            ? succeededCharge.payment_intent
            : succeededCharge.payment_intent.id
        } else if (succeededCharge) {
          // Use charge ID if no payment intent
          matchingPaymentId = succeededCharge.id
        }
      }
      
      if (matchingPaymentId) {
        // Update with payment ID
        await sql`
          UPDATE credit_transactions
          SET stripe_payment_id = ${matchingPaymentId}
          WHERE id = ${purchase.id}
        `
        
        console.log(`✅ Matched purchase ${purchase.id} (${purchase.amount} credits) to payment ${matchingPaymentId}`)
        matched++
      } else {
        console.log(`⚠️ No matching payment found for purchase ${purchase.id} (user ${purchase.user_id}, ${purchase.amount} credits, ${purchase.created_at})`)
        unmatched++
      }
      
      // Rate limiting - Stripe has rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error: any) {
      console.error(`❌ Error processing purchase ${purchase.id}:`, error.message)
      errors.push({ id: purchase.id, error: error.message })
      unmatched++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Backfill complete:`)
  console.log(`   Matched: ${matched}`)
  console.log(`   Unmatched: ${unmatched}`)
  console.log(`   Total: ${purchasesWithoutIds.length}`)
  
  if (errors.length > 0) {
    console.log(`\n⚠️ Errors encountered: ${errors.length}`)
    errors.slice(0, 5).forEach(e => {
      console.log(`   Purchase ${e.id}: ${e.error}`)
    })
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more`)
    }
  }
  
  console.log('\n📝 Note: Some purchases may remain unmatched if:')
  console.log('   - Timestamps don\'t align perfectly')
  console.log('   - Multiple purchases occurred at same time')
  console.log('   - Stripe customer ID is missing')
  console.log('   - Payment was made before Stripe customer was created')
  console.log('='.repeat(60))
}

backfillPaymentIds().catch(console.error)

