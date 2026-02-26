import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAcademyProducts } from "@/lib/academy-products"
import PurchaseButton from "../products/[productId]/purchase-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

/** Post-purchase next-step copy and deep-link tab (docs/in-app-funnel/02-content-copy §3) */
const NEXT_STEP_BY_PRODUCT: Record<
  string,
  { headline: string; subText: string; cta: string; studioTab: string }
> = {
  what_to_say: {
    headline: "Your captions are waiting",
    subText: "Head to Feed Planner now and write captions that feel like you.",
    cta: "Go to Feed Planner",
    studioTab: "feed-planner",
  },
  show_up: {
    headline: "Let's show you to the world",
    subText: "Chat with Maya about your brand and she'll help you shine.",
    cta: "Chat with Maya",
    studioTab: "maya",
  },
  get_paid: {
    headline: "Time to monetize",
    subText: "Open your Profile to see your monetization checklist and opportunities.",
    cta: "Open Profile",
    studioTab: "account",
  },
  ai_photo_prompts: {
    headline: "Inspiration unlocked",
    subText: "Browse curated prompts in Maya and generate your next photos.",
    cta: "Browse Prompts",
    studioTab: "maya",
  },
  paid_blueprint: {
    headline: "Your 60 credits are ready",
    subText: "Create your first 9-post feed in Feed Planner and watch the magic happen.",
    cta: "Create First Feed",
    studioTab: "feed-planner",
  },
}

type SuccessPageProps = {
  searchParams: Promise<{ product?: string }>
}

const MEMBERSHIP_UPSELL_NAME = "Creator Studio membership"

export default async function AcademySuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const productId = params.product

  // Get user first name
  const supabase = await createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const neonUser = authUser ? await getUserByAuthId(authUser.id) : null
  const firstName =
    (neonUser as { first_name?: string } | null)?.first_name ||
    neonUser?.display_name?.split(" ")[0] ||
    authUser?.user_metadata?.first_name ||
    null

  const products = await getAcademyProducts()
  const product = productId ? products.find((candidate) => candidate.id === productId) : null

  const upsell =
    product?.upsellTo && product.upsellTo !== "membership"
      ? products.find((candidate) => candidate.id === product.upsellTo) ?? null
      : null

  const upsellName = product
    ? product.upsellTo === "membership"
      ? MEMBERSHIP_UPSELL_NAME
      : upsell?.name ?? null
    : null

  return (
    <main className="min-h-screen min-w-[375px] bg-[#f5f5f5]">
      <div className="mx-auto max-w-xl px-8 py-24">
        <p
          className={`${inter.className} mb-6 text-xs uppercase tracking-[0.5em] text-[#666666]`}
          style={{ fontWeight: 500 }}
        >
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} text-4xl uppercase text-[#0a0a0a]`}
          style={{ fontWeight: 200 }}
        >
          {firstName ? `You're in, ${firstName}!` : "You're in!"}
        </h1>

        {product ? (
          <p className={`${inter.className} mt-4 text-base font-light leading-relaxed text-[#666666]`}>
            {product.name} is now in your library.
          </p>
        ) : null}

        <p className={`${inter.className} mt-2 text-base font-light leading-relaxed text-[#666666]`}>
          Proud of you for doing this.
        </p>

        {/* Primary CTA */}
        {product ? (
          <Link
            href={`/academy/products/${product.id}`}
            className={`${inter.className} mt-8 inline-flex bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80`}
            style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Access {product.name} →
          </Link>
        ) : (
          <Link
            href="/academy"
            className={`${inter.className} mt-8 inline-flex bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80`}
            style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Go to Academy
          </Link>
        )}

        {/* Next step card: product-specific CTA deep-linking into app (Slice 1.3 / C-02) */}
        {product && NEXT_STEP_BY_PRODUCT[product.id] && (
          <div className="mt-10 border-2 border-[#e5e5e5] bg-[#ffffff] p-8 max-w-[320px]">
            <p
              className={`${inter.className} text-xs uppercase tracking-[0.5em] text-[#666666]`}
              style={{ fontWeight: 500 }}
            >
              Your next step
            </p>
            <h2
              className={`${cormorant.className} mt-3 text-xl uppercase text-[#0a0a0a]`}
              style={{ fontWeight: 300 }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].headline}
            </h2>
            <p className={`${inter.className} mt-2 text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
              {NEXT_STEP_BY_PRODUCT[product.id].subText}
            </p>
            <Link
              href={`/studio?tab=${encodeURIComponent(NEXT_STEP_BY_PRODUCT[product.id].studioTab)}&source=academy_purchase&product=${encodeURIComponent(product.id)}`}
              className={`${inter.className} mt-6 inline-flex bg-[#0a0a0a] px-6 py-3 text-white transition-opacity hover:opacity-80`}
              style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].cta} →
            </Link>
          </div>
        )}

        {/* Upsell block */}
        {upsell ? (
          <div className="mt-14 border border-[#e5e5e5] bg-[#ffffff] p-8">
            <p
              className={`${inter.className} text-xs uppercase tracking-[0.5em] text-[#666666]`}
              style={{ fontWeight: 500 }}
            >
              Ready for the next step?
            </p>
            <h2
              className={`${cormorant.className} mt-3 text-2xl uppercase text-[#0a0a0a]`}
              style={{ fontWeight: 300 }}
            >
              {upsell.name}
            </h2>
            <p className={`${inter.className} mt-2 text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
              {upsell.tagline}
            </p>
            <PurchaseButton productId={upsell.id} price={upsell.price / 100} />
          </div>
        ) : upsellName === MEMBERSHIP_UPSELL_NAME ? (
          <div className="mt-14 border border-[#e5e5e5] bg-[#ffffff] p-8">
            <p
              className={`${inter.className} text-xs uppercase tracking-[0.5em] text-[#666666]`}
              style={{ fontWeight: 500 }}
            >
              Ready for everything?
            </p>
            <h2
              className={`${cormorant.className} mt-3 text-2xl uppercase text-[#0a0a0a]`}
              style={{ fontWeight: 300 }}
            >
              Creator Studio Membership
            </h2>
            <p className={`${inter.className} mt-2 text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
              All products. All tools. €97/month.
            </p>
            <Link
              href="/checkout/membership"
              className={`${inter.className} mt-6 inline-flex bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80`}
              style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Join the Membership →
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  )
}
