import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"

const BETA_USER_CAP = Number(process.env.BETA_USER_CAP || 16)
const MEMBERSHIP_PRICE_ID = (process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "").trim()
const BETA_FALLBACK_THRESHOLD_CENTS = Number(process.env.BETA_DISCOUNT_THRESHOLD_CENTS || 6000)

export async function GET() {
  try {
    console.log("[v0] Beta users API: Fetching discounted-member count")

    const members = await sql`
      SELECT
        u.email,
        u.created_at,
        s.status,
        s.plan,
        s.stripe_subscription_id
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE s.product_type = 'sselfie_studio_membership'
        AND s.is_test_mode = FALSE
        AND s.status = 'active'
      ORDER BY u.created_at DESC
    `

    let fullPriceCents: number | null = null
    if (MEMBERSHIP_PRICE_ID) {
      try {
        const membershipPrice = await stripe.prices.retrieve(MEMBERSHIP_PRICE_ID)
        fullPriceCents = membershipPrice.unit_amount ?? null
      } catch (error) {
        console.error("[v0] Beta users API: Failed to retrieve membership price from Stripe:", error)
      }
    }

    const discountedUsers: Array<{
      email: string
      joinedAt: string
      plan: string
      status: string
      revenue: number
    }> = []

    for (const member of members as any[]) {
      const stripeSubscriptionId = member.stripe_subscription_id as string | null
      if (!stripeSubscriptionId) {
        continue
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ["items.data.price", "discounts.coupon"],
        })

        const price = subscription.items.data[0]?.price
        const unitAmount = price?.unit_amount ?? null
        const discount = Array.isArray(subscription.discounts) ? subscription.discounts[0] : null
        const discountObj = typeof discount === "string" ? null : discount
        const coupon = (discountObj as any)?.coupon || null
        const percentOff = typeof coupon?.percent_off === "number" ? coupon.percent_off : 0
        const duration = typeof coupon?.duration === "string" ? coupon.duration : ""

        const hasForeverHalfOff = duration === "forever" && percentOff >= 50
        const hasFallbackLowPrice = unitAmount !== null
          && (fullPriceCents ? unitAmount <= Math.floor(fullPriceCents * 0.6) : unitAmount <= BETA_FALLBACK_THRESHOLD_CENTS)

        if (!hasForeverHalfOff && !hasFallbackLowPrice) {
          continue
        }

        discountedUsers.push({
          email: member.email,
          joinedAt: member.created_at,
          plan: member.plan || "sselfie_studio_membership",
          status: member.status,
          revenue: unitAmount !== null ? unitAmount / 100 : 0,
        })
      } catch (error) {
        console.error(`[v0] Beta users API: Failed to inspect subscription ${stripeSubscriptionId}:`, error)
      }
    }

    const betaCount = discountedUsers.length
    const betaLimit = BETA_USER_CAP
    const remaining = Math.max(0, betaLimit - betaCount)
    const percentageFilled = betaLimit > 0 ? Math.min(100, (betaCount / betaLimit) * 100) : 0
    const shouldUpdatePricing = betaCount >= betaLimit

    const recentBetaUsers = discountedUsers.slice(0, 10).map((user) => ({
      email: user.email,
      joinedAt: user.joinedAt,
      plan: user.plan || "sselfie_studio_membership",
      status: user.status,
    }))

    console.log("[v0] Beta users API: Success", {
      betaCount,
      remaining,
      shouldUpdatePricing,
      totalBetaUsers: discountedUsers.length,
      totalActiveMembers: members.length,
    })

    return NextResponse.json({
      betaCount,
      betaLimit,
      remaining,
      percentageFilled,
      shouldUpdatePricing,
      recentBetaUsers,
      allBetaUsers: discountedUsers,
      totalActiveMembers: members.length,
      source: "stripe_live",
    })
  } catch (error) {
    console.error("[v0] Beta users API error:", error)
    return NextResponse.json(
      {
        betaCount: 0,
        betaLimit: BETA_USER_CAP,
        remaining: BETA_USER_CAP,
        percentageFilled: 0,
        shouldUpdatePricing: false,
        recentBetaUsers: [],
        allBetaUsers: [],
      },
      { status: 200 }
    )
  }
}
