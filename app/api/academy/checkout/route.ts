import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { ACADEMY_PRODUCTS, type AcademyProductId } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

type CheckoutRequestBody = {
  productId?: AcademyProductId
}

export async function POST(request: Request) {
  try {
    const { productId } = (await request.json()) as CheckoutRequestBody

    if (!productId || !(productId in ACADEMY_PRODUCTS)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 })
    }

    const product = ACADEMY_PRODUCTS[productId]
    if (!product.stripePriceId) {
      return NextResponse.json({ error: "Stripe price is not configured for this product" }, { status: 500 })
    }

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const configuredSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim()
    const forwardedHost = request.headers.get("x-forwarded-host")
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
    const requestOrigin = new URL(request.url).origin
    const derivedOrigin =
      configuredSiteUrl ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "") ||
      requestOrigin
    const siteUrl = derivedOrigin.replace(/\/$/, "")

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${siteUrl}/academy/success?product=${productId}`,
      cancel_url: `${siteUrl}/academy`,
      metadata: {
        product_id: productId,
        user_id: neonUser.id,
        product_type: "academy_mini_product",
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Stripe session URL was not created" }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[v0] Error creating academy checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
