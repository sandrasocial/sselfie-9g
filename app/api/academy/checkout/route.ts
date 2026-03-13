import { NextResponse } from "next/server"

import { getAcademyEntitlementState, getAcademyProductCatalog } from "@/lib/academy-entitlements"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

type CheckoutRequestBody = {
  productId?: string
}

export async function POST(request: Request) {
  try {
    const { productId } = (await request.json()) as CheckoutRequestBody
    if (!productId) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 })
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

    const [catalog, entitlementState] = await Promise.all([
      getAcademyProductCatalog(),
      getAcademyEntitlementState(String(neonUser.id)),
    ])

    const product = catalog.find(entry => entry.id === productId)
    if (!product || !product.purchasable) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 })
    }

    if (product.deliveryKind === "direct_private") {
      return NextResponse.json(
        { error: "This product uses a dedicated checkout flow.", purchaseUrl: product.purchaseUrl },
        { status: 400 }
      )
    }

    if (!product.stripePriceId) {
      return NextResponse.json(
        { error: "Stripe price is not configured for this product" },
        { status: 500 }
      )
    }

    if (entitlementState.membershipActive) {
      return NextResponse.json(
        { error: "Studio members already have Academy access for this product." },
        { status: 403 }
      )
    }

    const derivedOrigin = new URL(request.url).origin
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || derivedOrigin).replace(/\/$/, "")

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${siteUrl}/academy/success?product=${productId}`,
      cancel_url: `${siteUrl}/academy`,
      metadata: {
        product_id: productId,
        user_id: String(neonUser.id),
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
