import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAcademyProducts } from "@/lib/academy-products"
import PurchaseButton from "../products/[productId]/purchase-button"

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
          {firstName ? `${firstName}, You're In.` : "You're In."}
        </h1>

        {product ? (
          <p
            className={`${inter.className} mt-6 text-[15px] leading-[1.78]`}
            style={{ color: C.stone, fontWeight: 300 }}
          >
            {product.name} is unlocked in your library.
          </p>
        ) : null}

        {product && NEXT_STEP_BY_PRODUCT[product.id] ? (
          <section
            className="mt-10 p-7"
            style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
          >
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Next Step
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(28px, 4.5vw, 40px)",
                lineHeight: 1.07,
                textShadow: LP,
              }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].headline}
            </h2>
            <p
              className={`${inter.className} mt-4 text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].subText}
            </p>
            <Link
              href={`/studio?tab=${encodeURIComponent(
                NEXT_STEP_BY_PRODUCT[product.id].studioTab,
              )}&source=academy_purchase&product=${encodeURIComponent(
                product.id,
              )}&first_time_product_user=true`}
              className={`${inter.className} mt-7 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90`}
              style={{
                background: C.cream,
                color: C.ink,
                fontWeight: 600,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              {NEXT_STEP_BY_PRODUCT[product.id].cta} →
            </Link>
          </section>
        ) : (
          <Link
            href="/academy"
            className={`${inter.className} mt-8 inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90`}
            style={{
              background: C.cream,
              color: C.ink,
              fontWeight: 600,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            Go to Academy →
          </Link>
        )}

        {upsell ? (
          <section
            className="mt-4 p-7"
            style={{ border: `1px solid ${C.div}` }}
          >
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Ready for the next step
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP,
              }}
            >
              {upsell.name}
            </h2>
            <p
              className={`${inter.className} mt-3 text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              {upsell.tagline}
            </p>
            <div className="mt-6">
              <PurchaseButton productId={upsell.id} price={upsell.price / 100} />
            </div>
          </section>
        ) : upsellName === MEMBERSHIP_UPSELL_NAME ? (
          <section
            className="mt-4 p-7"
            style={{ border: `1px solid ${C.div}` }}
          >
            <p
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Ready for everything
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP,
              }}
            >
              Creator Studio Membership
            </h2>
            <p
              className={`${inter.className} mt-3 text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              The calmer next step if you want guided help around the visuals and content.
            </p>
            <Link
              href="/private-shoot"
              className={`${inter.className} mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70`}
              style={{ color: C.stone, fontWeight: 600 }}
            >
              → Book the Private Offer
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  )
}
