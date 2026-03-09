#!/usr/bin/env tsx
/**
 * Stripe MRR Reconciliation
 * Pulls all subscription data and calculates MRR the way Stripe does
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

async function main() {
  console.log('[mrr-reconcile] Fetching all subscription data...\n')

  // Get all statuses
  const statuses = ['active', 'past_due', 'trialing', 'unpaid']
  const allSubs = []

  for (const status of statuses) {
    const subs = await stripe.subscriptions.list({
      status: status as any,
      limit: 100,
      expand: ['data.items.data.price', 'data.discount'],
    })
    allSubs.push(...subs.data)
  }

  console.log(`Total subscriptions across all statuses: ${allSubs.length}\n`)

  let activeRenewing = 0
  let scheduledToCancel = 0
  let pastDue = 0
  let trialing = 0

  const breakdown: any[] = []

  for (const sub of allSubs) {
    for (const item of sub.items.data) {
      const price = item.price as Stripe.Price
      const amount = price.unit_amount || 0
      const currency = price.currency.toUpperCase()
      const interval = price.recurring?.interval

      if (!interval || interval !== 'month') continue

      const monthlyAmount = amount * item.quantity

      const record = {
        sub_id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        price_id: price.id,
        amount: monthlyAmount,
        currency,
      }

      breakdown.push(record)

      if (sub.status === 'active' && !sub.cancel_at_period_end) {
        activeRenewing += monthlyAmount
      } else if (sub.status === 'active' && sub.cancel_at_period_end) {
        scheduledToCancel += monthlyAmount
      } else if (sub.status === 'past_due') {
        pastDue += monthlyAmount
      } else if (sub.status === 'trialing') {
        trialing += monthlyAmount
      }
    }
  }

  console.log('📊 MRR BREAKDOWN BY STATUS:\n')
  console.log(`  Active & renewing: $${(activeRenewing / 100).toFixed(2)}`)
  console.log(`  Scheduled to cancel: $${(scheduledToCancel / 100).toFixed(2)}`)
  console.log(`  Past due: $${(pastDue / 100).toFixed(2)}`)
  console.log(`  Trialing: $${(trialing / 100).toFixed(2)}`)

  const stripeCountsMRR = activeRenewing // Stripe only counts active renewing
  console.log(`\n💰 STRIPE MRR (active renewing only): $${(stripeCountsMRR / 100).toFixed(2)} USD`)

  // Check account default currency
  const account = await stripe.accounts.retrieve()
  console.log(`\n🌍 Account default currency: ${account.default_currency?.toUpperCase()}`)

  if (account.default_currency === 'nok') {
    // Stripe converts to NOK for display
    // But what rate does it use?
    console.log(`\n📈 If Stripe shows NOK 9,319 in dashboard:`)
    console.log(`   Implied conversion rate: ${(9319 / (stripeCountsMRR / 100)).toFixed(4)} NOK/USD`)
  }

  console.log(`\n📋 FULL BREAKDOWN:`)
  console.table(breakdown)

  return {
    activeRenewing: activeRenewing / 100,
    scheduledToCancel: scheduledToCancel / 100,
    pastDue: pastDue / 100,
    trialing: trialing / 100,
    stripeMRR: stripeCountsMRR / 100,
  }
}

main()
  .then((result) => {
    console.log(`\n✅ Done:`, result)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n❌ Fatal error:`, error)
    process.exit(1)
  })
