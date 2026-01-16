import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function GET() {
  if (process.env.ENABLE_UNUSED_ENDPOINTS !== "true") return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 })
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      stripeMode: "",
      betaDiscountEnabled: process.env.ENABLE_BETA_DISCOUNT !== "false",
      priceIds: {},
      couponCheck: {},
    }

    const balance = await stripe.balance.retrieve()
    results.stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "LIVE" : "TEST"

    // Check Price IDs
    results.priceIds = {
      membership: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID || "NOT SET",
      oneTime: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID || "NOT SET",
    }

    // Check if test coupon exists
    try {
      const coupon = await stripe.coupons.retrieve("LIVE_TEST_100")
      results.couponCheck = {
        exists: true,
        id: coupon.id,
        percentOff: coupon.percent_off,
        valid: coupon.valid,
        redeemBy: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
        timesRedeemed: coupon.times_redeemed,
        maxRedemptions: coupon.max_redemptions,
      }
    } catch (error: any) {
      results.couponCheck = {
        exists: false,
        error: error.message,
      }
    }

    // Try creating a test checkout session
    try {
      const testSession = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        mode: "payment",
        redirect_on_completion: "never",
        line_items: [
          {
            price: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        metadata: {
          test: "diagnostic",
        },
      })

      results.checkoutTest = {
        success: true,
        sessionId: testSession.id,
        allowPromotionCodes: true,
        message: "Checkout session created successfully with promotion codes enabled",
      }
    } catch (error: any) {
      results.checkoutTest = {
        success: false,
        error: error.message,
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
