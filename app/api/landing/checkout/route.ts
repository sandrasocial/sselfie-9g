import { NextRequest, NextResponse } from "next/server"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    const clientSecret = await createLandingCheckoutSession(productId)
    return NextResponse.json({ clientSecret })
  } catch (error: any) {
    console.error("[v0] [LANDING_CHECKOUT] Error creating checkout session:", error)
    return NextResponse.json({ error: error?.message || "Failed to create checkout" }, { status: 500 })
  }
}
