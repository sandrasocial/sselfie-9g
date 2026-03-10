#!/usr/bin/env tsx
/**
 * Calculate live MRR from Stripe WITH discount visibility
 * Run: pnpm tsx scripts/calculate-live-mrr-with-discounts.ts
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
    expand: ['data.items.data.price', 'data.discount', 'data.customer'],
  })

  let totalMRR_USD = 0
  let betaCount = 0
  const breakdown: Array<{
    email: string
    priceId: string
    amount: number
    discountInfo: string
    isBeta: boolean
  }> = []

  for (const sub of subscriptions.data) {
    const email = typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer).email || 'unknown'

    for (const item of sub.items.data) {
      const price = item.price as Stripe.Price
      const amount = price.unit_amount || 0
      const interval = price.recurring?.interval

      let monthlyAmount = 0
      if (interval === 'month') {
        monthlyAmount = amount * item.quantity
      } else if (interval === 'year') {
        monthlyAmount = Math.round((amount * item.quantity) / 12)
      }

      if (monthlyAmount > 0) {
        totalMRR_USD += monthlyAmount

        let discountInfo = 'none'
        let isBeta = false

        if (sub.discount) {
          const coupon = sub.discount.coupon
          if (coupon.percent_off) {
            discountInfo = `${coupon.percent_off}% off (${coupon.duration})`
            if (coupon.percent_off >= 50 && coupon.duration === 'forever') {
              isBeta = true
              betaCount++
            }
          } else if (coupon.amount_off) {
            discountInfo = `$${coupon.amount_off/100} off (${coupon.duration})`
          }
        }

        breakdown.push({
          email,
          priceId: price.id,
          amount: monthlyAmount / 100,
          discountInfo,
          isBeta,
        })
      }
    }
  }

  console.log('\n📊 SUBSCRIPTION BREAKDOWN:\n')
  for (const sub of breakdown) {
    const betaFlag = sub.isBeta ? ' 🔴 BETA' : ''
    console.log(`${sub.email}`)
    console.log(`  Price: ${sub.priceId}`)
    console.log(`  MRR: $${sub.amount.toFixed(2)}/mo`)
    console.log(`  Discount: ${sub.discountInfo}${betaFlag}`)
    console.log('')
  }

  console.log(`\n💰 TOTAL MRR: $${(totalMRR_USD / 100).toFixed(2)}`)
  console.log(`👥 Total subscriptions: ${subscriptions.data.length}`)
  console.log(`🔴 Beta users (50%+ forever discount): ${betaCount}`)

  return { totalMRR_USD, betaCount, breakdown, count: subscriptions.data.length }
}

main()
  .then((result) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('[mrr] Fatal error:', error)
    process.exit(1)
  })
