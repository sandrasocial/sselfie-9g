import { NextResponse } from "next/server"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { academyRouteErrorToResponse, requireAcademyUser } from "@/lib/academy-server-access"
import { isAcademyEntitlementsV2Enabled } from "@/lib/academy-rollout"

export async function GET() {
  try {
    const { neonUser } = await requireAcademyUser()
    const rolloutEnabled = isAcademyEntitlementsV2Enabled({
      userId: neonUser.id,
      email: neonUser.email,
    })

    const entitlementState = await getAcademyEntitlementState(neonUser.id)
    const products = entitlementState.catalog
      .filter(product => product.active || product.hasAccess)
      .map(product => {
        const accessUrl =
          !rolloutEnabled && product.deliveryKind === "direct_private"
            ? product.purchaseUrl
            : product.accessUrl

        return {
          id: product.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          title: product.title,
          tagline: product.tagline,
          description: product.description,
          price: product.price,
          priceCents: product.priceCents,
          hasAccess: product.hasAccess,
          accessSource: product.accessSource,
          accessUrl,
          purchaseUrl: product.purchaseUrl,
          purchasedAt: product.purchasedAt,
          purchasable: product.purchasable,
          deliveryKind: product.deliveryKind,
          accessTarget: product.accessTarget,
        }
      })

    const purchases = products.filter(product => product.hasAccess)
    const availableProducts = entitlementState.membershipActive
      ? []
      : products.filter(product => product.purchasable && !product.hasAccess)

    return NextResponse.json({
      products,
      purchases,
      availableProducts,
      hasStudioMembership: entitlementState.membershipActive,
      rolloutEnabled,
    })
  } catch (error) {
    const response = academyRouteErrorToResponse(error)
    if (response) {
      return response
    }

    console.error("[academy] Error fetching my-products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
