import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { MiniProductWorkspace } from "@/components/academy/mini-product-workspace"
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="grid border-b lg:grid-cols-[minmax(0,0.76fr)_minmax(0,0.5fr)]">
        <div className="px-6 py-10 md:px-10 lg:px-14">
          <Link href="/academy" className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Academy
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Focused mini-product
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
            {product.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {product.promise} You will only see the tools for this product here.
          </p>
        </div>
        <div className="relative min-h-[300px] overflow-hidden lg:min-h-[360px]">
          <Image
            src={product.heroImage}
            alt={product.heroImageAlt}
            fill
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      </section>

      <section className="px-6 py-8 md:px-10 lg:px-14">
        <MiniProductWorkspace product={product} />
      </section>
    </main>
  )
}
