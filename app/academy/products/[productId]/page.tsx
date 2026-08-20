import { redirect, notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

import PurchaseButton from "./purchase-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

const C = {
  ink: "#0F0D0B",
  inkSoft: "#1E1A15",
  cream: "#EDE9E2",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(237,233,226,0.10)",
}

const LP =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

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

const PROTECTED_WORKBOOK_PATH_BY_PRODUCT: Record<string, string> = {
  what_to_say: "/academy/what_to_say",
  show_up: "/academy/show_up",
  get_paid: "/academy/get_paid",
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
    redirect(`/auth/login?returnTo=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  const product = entitlementState.catalog.find(entry => entry.id === productId)
  if (!product) {
    notFound()
  }

  if (product.deliveryKind === "direct_private") {
    redirect(product.hasAccess ? product.accessUrl : product.purchaseUrl)
  }

  // Historical workbook owners continue directly into the matching protected workbook.
  // Other Academy course products fall back to the library because their accessUrl points
  // back to this page and would otherwise create a circular redirect.
  if (product.deliveryKind === "academy_course" && product.hasAccess) {
    redirect(PROTECTED_WORKBOOK_PATH_BY_PRODUCT[product.id] || "/academy")
  }

  const includedItems = INCLUDED_BY_PRODUCT[product.id] ?? [
    product.description || "This Academy product is ready in your library.",
  ]

  return (
    <main className="min-h-screen" style={{ background: C.ink, color: C.cream }}>
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-20 md:py-24">
        <p
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} mt-6 uppercase`}
          style={{
            fontWeight: 300,
            fontSize: "clamp(36px, 7vw, 70px)",
            lineHeight: 1.03,
            letterSpacing: "-0.02em",
            textShadow: LP,
          }}
        >
          {product.name}
        </h1>
        <p
          className={`${inter.className} mt-6 max-w-2xl text-[15px] leading-[1.78]`}
          style={{ color: C.stone, fontWeight: 300 }}
        >
          {product.tagline}
        </p>

        <section
          className="mt-10 p-7"
          style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
        >
          <p
            className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
            style={{ color: C.muted, fontWeight: 600 }}
          >
            What&apos;s included
          </p>
          <ul className="mt-5 space-y-4">
            {includedItems.map(item => (
              <li
                key={item}
                className={`${inter.className} text-[14px] leading-[1.72]`}
                style={{ color: C.stone, fontWeight: 300 }}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {!product.hasAccess ? (
          <section
            className="mt-4 p-7"
            style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
          >
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              {product.price ?? 0} EUR
            </p>
            <p
              className={`${inter.className} mt-3 text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              This product isn&apos;t in your library yet.
            </p>
            {product.purchasable ? (
              <div className="mt-6">
                <PurchaseButton productId={product.id} price={product.price ?? 0} />
              </div>
            ) : null}
          </section>
        ) : (
          <section
            className="mt-4 p-7"
            style={{ border: `1px solid ${C.div}` }}
          >
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Your Library
            </p>
            <p
              className={`${inter.className} mt-3 text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              Your product is unlocked and ready.
            </p>
            <a
              href={product.accessUrl}
              className={`${inter.className} mt-7 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90`}
              style={{
                background: C.cream,
                color: C.ink,
                fontWeight: 600,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              Open {product.name} →
            </a>
          </section>
        )}
      </div>
    </main>
  )
}
