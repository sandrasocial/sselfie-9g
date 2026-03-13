import { redirect, notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

import PurchaseButton from "./purchase-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

const INCLUDED_BY_PRODUCT: Record<string, string[]> = {
  what_to_say: [
    "30 caption frameworks for everyday posting",
    "Prompt structures to keep your voice consistent",
    "Quick hooks and closing CTAs for conversion",
  ],
  show_up: [
    "30-day posting rhythm mapped by content type",
    "Weekly batching workflow to reduce content stress",
    "Visibility-first structure for stronger reach",
  ],
  get_paid: [
    "Revenue path map based on your current audience",
    "Offer and message alignment for higher intent",
    "90-day execution cadence with launch checkpoints",
  ],
  ai_photo_prompts: [
    "Prompt pack split by high-performing brand scenarios",
    "Phone-camera setup guidance for cleaner outputs",
    "Repeatable prompt templates for fast regeneration",
  ],
}

export default async function AcademyProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  const product = entitlementState.catalog.find(entry => entry.id === productId)
  if (!product) {
    notFound()
  }

  if (product.deliveryKind === "direct_private") {
    redirect(product.hasAccess ? product.accessUrl : product.purchaseUrl)
  }

  const includedItems = INCLUDED_BY_PRODUCT[product.id] ?? [
    product.description || "This Academy product is ready in your library.",
  ]

  return (
    <main className="min-h-screen min-w-[375px] bg-[#0d0c0b] text-[#f0ede8]">
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-20 md:py-20">
        <p
          className={`${inter.className} text-[11px] uppercase tracking-[0.5em] text-[#8a8780]`}
          style={{ fontWeight: 500 }}
        >
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} mt-6 text-5xl uppercase text-[#f0ede8] md:text-7xl`}
          style={{ fontWeight: 200, lineHeight: 0.95 }}
        >
          {product.name}
        </h1>
        <p
          className={`${inter.className} mt-4 text-sm text-[#f0ede8]`}
          style={{ fontWeight: 300, lineHeight: 1.8 }}
        >
          {product.tagline}
        </p>

        <section className="mt-10 border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-6 md:p-8">
          <p
            className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#8a8780]`}
            style={{ fontWeight: 500 }}
          >
            What&apos;s included
          </p>
          <ul className="mt-5 space-y-3">
            {includedItems.map(item => (
              <li
                key={item}
                className={`${inter.className} text-sm text-[#f0ede8]`}
                style={{ fontWeight: 300, lineHeight: 1.8 }}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {!product.hasAccess ? (
          <section className="mt-8 border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-6 md:p-8">
            <p
              className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#f0ede8]`}
              style={{ fontWeight: 500 }}
            >
              {product.price ?? 0} EUR
            </p>
            <p
              className={`${inter.className} mt-3 text-sm text-[#8a8780]`}
              style={{ fontWeight: 300 }}
            >
              This product isn&apos;t in your library yet.
            </p>
            {product.purchasable ? (
              <PurchaseButton productId={product.id} price={product.price ?? 0} />
            ) : null}
          </section>
        ) : (
          <section className="mt-8 border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-6 md:p-8">
            <p
              className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#8a8780]`}
              style={{ fontWeight: 500 }}
            >
              Your Library
            </p>
            <p
              className={`${inter.className} mt-3 text-sm text-[#8a8780]`}
              style={{ fontWeight: 300 }}
            >
              Your product is unlocked and ready.
            </p>
            <a
              href={product.accessUrl}
              className={`${inter.className} mt-6 inline-flex rounded-[20px] border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.20)]`}
              style={{ fontWeight: 500 }}
            >
              Open {product.name} {"->"}
            </a>
          </section>
        )}
      </div>
    </main>
  )
}
