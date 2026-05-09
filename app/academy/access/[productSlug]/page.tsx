import { notFound, redirect } from "next/navigation"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import {
  VISIBILITY_MINI_PRODUCT_BY_SLUG,
  VISIBILITY_MINI_PRODUCTS,
} from "@/lib/visibility-products"

export function generateStaticParams() {
  return VISIBILITY_MINI_PRODUCTS.map((product) => ({ productSlug: product.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ productSlug: string }> }) {
  const { productSlug } = await params
  const product = VISIBILITY_MINI_PRODUCT_BY_SLUG[productSlug]
  if (!product) return {}

  return {
    title: `${product.title} | SSELFIE Academy`,
    description: product.promise,
  }
}

export default async function MiniProductAccessPage({
  params,
}: {
  params: Promise<{ productSlug: string }>
}) {
  const { productSlug } = await params
  const product = VISIBILITY_MINI_PRODUCT_BY_SLUG[productSlug]
  if (!product) {
    notFound()
  }

  const path = `/academy/access/${product.slug}`
  const { neonUser } = await requireAcademyPageUser(path)
  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasAccess =
    entitlementState.membershipActive || entitlementState.accessibleProductIds.includes(product.id)

  if (!hasAccess) {
    redirect(`/${product.slug}?access=required`)
  }

  await logAnalyticsEvent({
    eventName: "academy_home_opened",
    userId: neonUser.id,
    path,
    properties: {
      product_id: product.id,
      workspace_kind: product.workspaceKind,
      focused_workspace: true,
    },
  })

  // Redirect into the in-app studio shell — same pattern as courses.
  // MiniProductWorkspace renders inside the Academy tab via academy_workbook param.
  redirect(`/studio?tab=academy&academy_view=workbook&academy_workbook=${product.slug}`)
}
