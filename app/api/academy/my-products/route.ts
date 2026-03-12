import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { ACADEMY_PRODUCTS } from "@/lib/products"

function priceFromCents(cents: number) {
  return cents / 100
}

function resolveAccessUrl(productId: string) {
  if (productId in ACADEMY_PRODUCTS) {
    return `/academy/products/${productId}`
  }
  if (productId === "selfie_guide" || productId === "selfie_guide_bundle") {
    return "/selfie-guide"
  }
  if (productId === "brand_strategy_pack") {
    return "/brand-strategy"
  }
  return "/academy"
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

    const entitlementState = await getAcademyEntitlementState(neonUser.id)
    const accessibleSet = new Set(entitlementState.accessibleProductIds)
    const explicitSet = new Set(entitlementState.explicitProductIds)

    const purchasesResponse = entitlementState.products
      .filter((product) => accessibleSet.has(product.id))
      .map((product) => {
        const miniProduct = (ACADEMY_PRODUCTS as Record<string, any>)[product.id]
        const upsell =
          miniProduct?.upsellTo && miniProduct.upsellTo !== "membership"
            ? (ACADEMY_PRODUCTS as Record<string, any>)[miniProduct.upsellTo] || null
            : null

        return {
          id: product.id,
          name: product.title,
          tagline: miniProduct?.tagline || "",
          price: miniProduct?.price ? priceFromCents(miniProduct.price) : 0,
          purchasedAt: null,
          accessUrl: resolveAccessUrl(product.id),
          accessSource: explicitSet.has(product.id)
            ? entitlementState.membershipActive
              ? "purchase_and_membership"
              : "purchase"
            : "membership",
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

    const availableProducts = entitlementState.membershipActive
      ? []
      : entitlementState.products
          .filter((product) => product.active && product.purchasable && !accessibleSet.has(product.id))
          .map((product) => {
            const miniProduct = (ACADEMY_PRODUCTS as Record<string, any>)[product.id]
            return {
              id: product.id,
              name: product.title,
              tagline: miniProduct?.tagline || "",
              price: miniProduct?.price ? priceFromCents(miniProduct.price) : 0,
              owned: false,
            }
          })

    return NextResponse.json({
      purchases: purchasesResponse,
      hasStudioMembership: entitlementState.membershipActive,
      availableProducts,
    })
  } catch (error) {
    console.error("[academy] Error fetching my-products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
