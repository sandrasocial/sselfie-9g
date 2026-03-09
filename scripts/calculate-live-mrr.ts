#!/usr/bin/env tsx
/**
 * Calculate live MRR from Stripe active subscriptions
 * Run: pnpm tsx scripts/calculate-live-mrr.ts
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

async function main() {
  console.log('[mrr] Fetching active subscriptions from Stripe...')

  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.items.data.price'],
  })

  let totalMRR_NOK = 0
  let totalMRR_USD = 0
  let totalMRR_EUR = 0
  const breakdown: Record<string, { count: number; mrr: number; currency: string }> = {}

  for (const sub of subscriptions.data) {
    for (const item of sub.items.data) {
      const price = item.price as Stripe.Price
      const amount = price.unit_amount || 0
      const currency = price.currency.toUpperCase()
      const interval = price.recurring?.interval

      let monthlyAmount = 0
      if (interval === 'month') {
        monthlyAmount = amount * item.quantity
      } else if (interval === 'year') {
        monthlyAmount = Math.round((amount * item.quantity) / 12)
      }

      if (monthlyAmount > 0) {
        if (currency === 'NOK') {
          totalMRR_NOK += monthlyAmount
        } else if (currency === 'USD') {
          totalMRR_USD += monthlyAmount
        } else if (currency === 'EUR') {
          totalMRR_EUR += monthlyAmount
        }

        const key = `${price.id}`
        if (!breakdown[key]) {
          breakdown[key] = { count: 0, mrr: 0, currency }
        }
        breakdown[key].count += item.quantity
        breakdown[key].mrr += monthlyAmount
      }
    }
  }

  console.log('\n📊 MRR BREAKDOWN BY PRICE:')
  for (const [priceId, data] of Object.entries(breakdown)) {
    const symbol = data.currency === 'NOK' ? 'kr' : data.currency === 'USD' ? '$' : '€'
    console.log(`  ${priceId}: ${data.count} subs × ${symbol}${(data.mrr / data.count / 100).toFixed(2)} = ${symbol}${(data.mrr / 100).toFixed(2)}/mo`)
  }

  console.log('\n💰 TOTAL MRR BY CURRENCY:')
  if (totalMRR_NOK > 0) console.log(`  NOK: kr${(totalMRR_NOK / 100).toFixed(2)}`)
  if (totalMRR_USD > 0) {
    console.log(`  USD: $${(totalMRR_USD / 100).toFixed(2)}`)
    // Stripe dashboard converts to NOK (default account currency)
    // Using approximate USD→NOK rate of 10.5 (check live rate for accuracy)
    const usdToNok = 10.5
    const mrrInNok = (totalMRR_USD / 100) * usdToNok
    console.log(`  (≈ NOK ${mrrInNok.toFixed(2)} at ~10.5 rate — Stripe dashboard shows this)`)
  }
  if (totalMRR_EUR > 0) console.log(`  EUR: €${(totalMRR_EUR / 100).toFixed(2)}`)

  console.log(`\n👥 Active subscriptions: ${subscriptions.data.length}`)

  return { 
    totalMRR_NOK, 
    totalMRR_USD, 
    totalMRR_EUR, 
    breakdown, 
    count: subscriptions.data.length 
  }
}

main()
  .then((result) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('[mrr] Fatal error:', error)
    process.exit(1)
  })
