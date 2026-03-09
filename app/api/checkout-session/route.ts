import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getPurchasedProductTypes } from "@/lib/checkout/purchased-products"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price"],
    })
    const purchasedProductTypes = getPurchasedProductTypes(session)

    return NextResponse.json({
      email: session.customer_details?.email || session.customer_email,
      status: session.status,
      sessionId: session.id,
      product_type: session.metadata?.product_type || null,
      purchased_product_types: purchasedProductTypes,
      has_brand_strategy_pack: purchasedProductTypes.includes("brand_strategy_pack"),
      return_to: session.metadata?.return_to || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
