import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { hasStudioMembership } from "@/lib/subscription"
import { ACADEMY_PRODUCTS } from "@/lib/products"

type PurchaseRow = {
  id: number
  course_id: string
  purchased_at: string | null
}

const academyProducts = Object.values(ACADEMY_PRODUCTS)

function priceFromCents(cents: number) {
  return cents / 100
}

export async function GET() {
  try {
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

    const purchases = (await sql`
      SELECT id, course_id, purchased_at
      FROM academy_course_purchases
      WHERE user_id = ${neonUser.id}
        AND status = 'active'
    `) as PurchaseRow[]

    const membershipActive = await hasStudioMembership(neonUser.id)

    const purchaseMap = new Map(purchases.map((row) => [row.course_id, row]))
    const ownedProductIds = membershipActive
      ? academyProducts.map((product) => product.id)
      : purchases.map((row) => row.course_id)

    const purchasesResponse = ownedProductIds
      .map((productId) => {
        const product = academyProducts.find((candidate) => candidate.id === productId)
        if (!product) return null

        const purchaseRow = purchaseMap.get(productId)
        const upsell =
          product.upsellTo && product.upsellTo !== "membership"
            ? academyProducts.find((candidate) => candidate.id === product.upsellTo) || null
            : null

        return {
          id: product.id,
          name: product.name,
          tagline: product.tagline,
          price: priceFromCents(product.price),
          purchasedAt: purchaseRow?.purchased_at ?? null,
          accessUrl: `/academy/products/${product.id}`,
          upsellProduct: upsell
            ? {
                id: upsell.id,
                name: upsell.name,
                price: priceFromCents(upsell.price),
                tagline: upsell.tagline,
              }
            : null,
        }
      })
      .filter(Boolean)

    const availableProducts = academyProducts
      .filter((product) => !ownedProductIds.includes(product.id))
      .map((product) => ({
        id: product.id,
        name: product.name,
        tagline: product.tagline,
        price: priceFromCents(product.price),
        owned: false,
      }))

    return NextResponse.json({
      purchases: purchasesResponse,
      hasStudioMembership: membershipActive,
      availableProducts,
    })
  } catch (error) {
    console.error("[academy] Error fetching my-products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
