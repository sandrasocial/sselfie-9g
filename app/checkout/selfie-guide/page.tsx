import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { startProductCheckoutSession } from "@/app/actions/stripe"
import { getProductById } from "@/lib/products"
import { createServerClient } from "@/lib/supabase/server"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

type SelfieGuideCheckoutSearchParams = {
  plan?: string
}

export const metadata: Metadata = {
  title: "Checkout | Selfie Guide",
  description: "Choose the Selfie Guide on its own or bundle it with the Brand Strategy Pack.",
}

const CHECKOUT_PLANS = {
  guide: {
    productId: "selfie_guide",
    productType: "selfie_guide",
    source: "selfie_guide_paid",
    priceLabel: "€17",
    title: "Selfie Guide",
    description: "Get the guide, the challenge, and the preset bonus.",
    bullets: [
      "8 chapters and practical checklists",
      "7-Day Selfie Challenge",
      "Preset bonus included",
    ],
  },
  bundle: {
    productId: "selfie_guide_bundle",
    productType: "selfie_guide_bundle",
    source: "selfie_guide_bundle",
    priceLabel: "$27",
    title: "Guide + Brand Strategy Bundle",
    description: "Buy both together and skip the separate $19 upsell later.",
    bullets: [
      "Everything in the Selfie Guide",
      "Brand Strategy Pack included",
      "Best-value next step",
    ],
  },
} as const

function buildCheckoutPath(plan?: string) {
  if (plan && plan in CHECKOUT_PLANS) {
    return `/checkout/selfie-guide?plan=${encodeURIComponent(plan)}`
  }

  return "/checkout/selfie-guide"
}

export default async function SelfieGuideCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SelfieGuideCheckoutSearchParams>
}) {
  const params = await searchParams
  const requestedPlan = params.plan === "bundle" ? "bundle" : params.plan === "guide" ? "guide" : null
  const checkoutPath = buildCheckoutPath(requestedPlan || undefined)

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(checkoutPath)}`)
  }

  if (requestedPlan) {
    const selectedPlan = CHECKOUT_PLANS[requestedPlan]

    try {
      const clientSecret = await startProductCheckoutSession(selectedPlan.productId, undefined, {
        source: selectedPlan.source,
      })

      if (clientSecret) {
        redirect(`/checkout?client_secret=${clientSecret}&product_type=${selectedPlan.productType}`)
      }
    } catch (error) {
      console.error("[Selfie Guide Checkout] Error creating checkout session:", error)
    }

    redirect("/selfie-guide?checkout=failed")
  }

  const guideProduct = getProductById("selfie_guide")
  const bundleProduct = getProductById("selfie_guide_bundle")

  return (
    <main className={`min-h-screen bg-[#0d0c0b] text-[#f0ede8] ${inter.className}`}>
      <section className="relative overflow-hidden border-b border-[rgba(195,190,182,0.14)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,237,232,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="https://sselfie.ai"
              className={`${cormorant.className} text-[30px] font-light uppercase tracking-[0.28em] text-[#f0ede8]`}
            >
              SSELFIE
            </Link>
            <Link
              href="/selfie-guide"
              className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780] transition hover:text-[#f0ede8]"
            >
              Back to guide
            </Link>
          </div>

          <div className="max-w-[760px] py-14 sm:py-16 lg:py-20">
            <p className="text-[11px] uppercase tracking-[0.42em] text-[#a8a49c]">Selfie Guide Checkout</p>
            <h1
              className={`${cormorant.className} mt-5 text-[clamp(46px,7vw,92px)] font-light uppercase leading-[0.92] tracking-[0.06em] text-[#f0ede8]`}
            >
              Choose your next step before you pay
            </h1>
            <p className="mt-6 max-w-[34ch] text-[18px] font-light leading-8 text-[rgba(240,237,232,0.76)] sm:text-[20px]">
              Start with the guide on its own, or take the bundle and lock in your Brand Strategy for the lower price.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-14 sm:px-10 lg:px-14 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[32px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.08)] p-7 backdrop-blur-[30px]">
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780]">Guide only</p>
            <h2 className={`${cormorant.className} mt-4 text-[clamp(32px,4vw,46px)] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
              {CHECKOUT_PLANS.guide.title}
            </h2>
            <p className="mt-3 text-4xl font-light text-[#f0ede8]">{CHECKOUT_PLANS.guide.priceLabel}</p>
            <p className="mt-4 max-w-[30ch] text-sm font-light leading-7 text-[rgba(240,237,232,0.72)]">
              {CHECKOUT_PLANS.guide.description}
            </p>

            <ul className="mt-8 space-y-3 text-sm font-light leading-7 text-[#d7d2cb]">
              {CHECKOUT_PLANS.guide.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>

            <Link
              href="/checkout/selfie-guide?plan=guide"
              className="mt-10 inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-[rgba(240,237,232,0.2)] bg-transparent px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#f0ede8] transition hover:border-[rgba(240,237,232,0.45)] hover:bg-[rgba(240,237,232,0.06)]"
            >
              Checkout the guide
            </Link>
          </article>

          <article className="rounded-[32px] border border-[rgba(240,237,232,0.24)] bg-[linear-gradient(180deg,rgba(240,237,232,0.14),rgba(175,170,162,0.08))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-[30px]">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780]">Recommended</p>
              <span className="rounded-full border border-[rgba(13,12,11,0.12)] bg-[#f0ede8] px-4 py-1 text-[10px] font-medium uppercase tracking-[0.3em] text-[#0d0c0b]">
                Save $9
              </span>
            </div>
            <h2 className={`${cormorant.className} mt-4 text-[clamp(32px,4vw,46px)] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
              {CHECKOUT_PLANS.bundle.title}
            </h2>
            <p className="mt-3 text-4xl font-light text-[#f0ede8]">{CHECKOUT_PLANS.bundle.priceLabel}</p>
            <p className="mt-4 max-w-[30ch] text-sm font-light leading-7 text-[rgba(240,237,232,0.8)]">
              {CHECKOUT_PLANS.bundle.description}
            </p>

            <ul className="mt-8 space-y-3 text-sm font-light leading-7 text-[#f0ede8]">
              {CHECKOUT_PLANS.bundle.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>

            <div className="mt-8 rounded-[24px] border border-[rgba(240,237,232,0.16)] bg-[rgba(13,12,11,0.32)] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#a8a49c]">Bundle math</p>
              <p className="mt-3 text-sm font-light leading-7 text-[rgba(240,237,232,0.78)]">
                Guide only: €17
              </p>
              <p className="text-sm font-light leading-7 text-[rgba(240,237,232,0.78)]">Brand Strategy Pack: $19</p>
              <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-[#f0ede8]">Bundle total: $27</p>
            </div>

            <Link
              href="/checkout/selfie-guide?plan=bundle"
              className="mt-10 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#f0ede8] px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#0d0c0b] transition hover:bg-white"
            >
              Checkout the $27 bundle
            </Link>
          </article>
        </div>

        <div className="mt-10 grid gap-6 rounded-[32px] border border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.06)] p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.38em] text-[#8a8780]">Included either way</p>
            <h3 className={`${cormorant.className} mt-3 text-[clamp(28px,3.5vw,42px)] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
              One clean starting point
            </h3>
            <p className="mt-4 max-w-[38ch] text-sm font-light leading-7 text-[rgba(240,237,232,0.72)]">
              The guide gives you the visual system. The bundle also gives you the message and content direction behind
              it.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[rgba(195,190,182,0.14)] bg-[rgba(13,12,11,0.24)] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Guide features</p>
              <p className="mt-3 text-sm font-light leading-7 text-[#f0ede8]">
                {(guideProduct?.features || []).slice(0, 3).join(" · ")}
              </p>
            </div>
            <div className="rounded-[24px] border border-[rgba(195,190,182,0.14)] bg-[rgba(13,12,11,0.24)] p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Bundle features</p>
              <p className="mt-3 text-sm font-light leading-7 text-[#f0ede8]">
                {(bundleProduct?.features || []).slice(0, 3).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
