import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAcademyProducts } from "@/lib/academy-products"
import PurchaseButton from "../products/[productId]/purchase-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

const NEXT_STEP_BY_PRODUCT: Record<
  string,
  { headline: string; subText: string; cta: string; studioTab: string }
> = {
  what_to_say: {
    headline: "Your captions are waiting",
    subText: "Head to Feed Planner now and write captions that sound like you.",
    cta: "Go to Feed Planner",
    studioTab: "feed-planner",
  },
  show_up: {
    headline: "Let's show you to the world",
    subText: "Chat with Maya and build your month of content from one clear strategy.",
    cta: "Chat with Maya",
    studioTab: "maya",
  },
  get_paid: {
    headline: "Time to monetize",
    subText: "Open Profile to map your monetization checklist and next offer step.",
    cta: "Open Profile",
    studioTab: "account",
  },
  ai_photo_prompts: {
    headline: "Inspiration unlocked",
    subText: "Use Maya prompts to generate your next branded image set fast.",
    cta: "Browse Prompts",
    studioTab: "maya",
  },
  paid_blueprint: {
    headline: "Your 60 credits are ready",
    subText: "Create your first 9-post feed in Feed Planner.",
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

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
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
    <main className="min-h-screen min-w-[375px] bg-[#0a0a0a] text-[#ffffff]">
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-20 md:py-20">
        <p className={`${inter.className} text-[11px] uppercase tracking-[0.5em] text-[#666666]`} style={{ fontWeight: 500 }}>
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} mt-6 text-5xl uppercase md:text-7xl`}
          style={{ fontWeight: 200, lineHeight: 0.95 }}
        >
          {firstName ? `${firstName}, You&apos;re In.` : "You&apos;re In."}
        </h1>

        {product ? (
          <p className={`${inter.className} mt-4 text-sm text-[#e5e5e5]`} style={{ fontWeight: 300, lineHeight: 1.8 }}>
            {product.name} is unlocked in your library.
          </p>
        ) : null}

        {product && NEXT_STEP_BY_PRODUCT[product.id] ? (
          <section className="mt-10 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
            <p className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#666666]`} style={{ fontWeight: 500 }}>
              Next Step
            </p>
            <h2 className={`${cormorant.className} mt-4 text-3xl uppercase`} style={{ fontWeight: 300 }}>
              {NEXT_STEP_BY_PRODUCT[product.id].headline}
            </h2>
            <p className={`${inter.className} mt-3 text-sm text-[#e5e5e5]`} style={{ fontWeight: 300, lineHeight: 1.8 }}>
              {NEXT_STEP_BY_PRODUCT[product.id].subText}
            </p>
            <Link
              href={`/studio?tab=${encodeURIComponent(NEXT_STEP_BY_PRODUCT[product.id].studioTab)}&source=academy_purchase&product=${encodeURIComponent(product.id)}`}
              className={`${inter.className} mt-6 inline-flex rounded-[20px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.14)]`}
              style={{ fontWeight: 500 }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].cta} {"->"}
            </Link>
          </section>
        ) : (
          <Link
            href="/academy"
            className={`${inter.className} mt-8 inline-flex rounded-[20px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.14)]`}
            style={{ fontWeight: 500 }}
          >
            Go to Academy {"->"}
          </Link>
        )}

        {upsell ? (
          <section className="mt-10 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
            <p className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#666666]`} style={{ fontWeight: 500 }}>
              Ready for the next step
            </p>
            <h2 className={`${cormorant.className} mt-4 text-3xl uppercase`} style={{ fontWeight: 300 }}>
              {upsell.name}
            </h2>
            <p className={`${inter.className} mt-3 text-sm text-[#e5e5e5]`} style={{ fontWeight: 300 }}>
              {upsell.tagline}
            </p>
            <PurchaseButton productId={upsell.id} price={upsell.price / 100} />
          </section>
        ) : upsellName === MEMBERSHIP_UPSELL_NAME ? (
          <section className="mt-10 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 md:p-8">
            <p className={`${inter.className} text-[11px] uppercase tracking-[0.32em] text-[#666666]`} style={{ fontWeight: 500 }}>
              Ready for everything
            </p>
            <h2 className={`${cormorant.className} mt-4 text-3xl uppercase`} style={{ fontWeight: 300 }}>
              Creator Studio Membership
            </h2>
            <p className={`${inter.className} mt-3 text-sm text-[#e5e5e5]`} style={{ fontWeight: 300 }}>
              All products, all tools, one workflow.
            </p>
            <Link
              href="/checkout/membership"
              className={`${inter.className} mt-6 inline-flex rounded-[20px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.14)]`}
              style={{ fontWeight: 500 }}
            >
              Join the Membership {"->"}
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  )
}
