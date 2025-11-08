import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY not found" }, { status: 500 })
    }

    const isTestMode = stripeKey.startsWith("sk_test_")

    if (isTestMode) {
      return NextResponse.json(
        {
          error: "You're in TEST mode. Switch to LIVE mode first!",
        },
        { status: 400 },
      )
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" })

    // Create 100% off coupon for testing
    const coupon = await stripe.coupons.create({
      id: "LIVE_TEST_100",
      percent_off: 100,
      duration: "once",
      name: "Live Testing - 100% Off",
      max_redemptions: 20,
    })

    return NextResponse.json({
      success: true,
      coupon_id: coupon.id,
      message: "Test coupon created! Use code: LIVE_TEST_100",
    })
  } catch (error: any) {
    console.error("[v0] Error creating coupon:", error)
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
