import { redirect } from "next/navigation"
import Link from "next/link"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { getCheckoutAttributionFromParams } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    promo?: string
    interval?: string
    fallback?: string
    bonus?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const bonusCredits = params.bonus === "4credits" ? 4 : undefined
  const attribution = getCheckoutAttributionFromParams(params, {
    source: bonusCredits ? "selfie_guide_day21_bonus" : "membership_checkout_page",
  })

  // If interval is passed directly (from the client toggle), proceed straight to Stripe
  if (params.interval) {
    const productId = params.interval === "year"
      ? "sselfie_studio_membership_annual"
      : "sselfie_studio_membership"

    try {
      const clientSecret = await createLandingCheckoutSession(productId, params.promo, undefined, {
        bonusCredits,
        ...attribution,
      })
      if (clientSecret) {
        redirect(`/checkout?client_secret=${clientSecret}`)
      }
    } catch (error: any) {
      if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
      console.error("[checkout/membership] Error creating session:", error)
    }
    redirect("/checkout/failure?product=" + productId)
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(196,181,160,0.18), transparent 32%), #0f0d0b",
        color: "#f4f0e6",
        padding: "88px 24px 56px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            color: "rgba(244,240,230,0.48)",
          }}
        >
          SSELFIE Update
        </p>
        <h1
          style={{
            margin: "22px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3.2rem, 8vw, 6.1rem)",
            fontWeight: 300,
            lineHeight: 0.94,
            letterSpacing: "-0.04em",
          }}
        >
          Studio is now onboarding privately.
        </h1>
        <p
          style={{
            marginTop: 28,
            maxWidth: 620,
            fontSize: "1.02rem",
            lineHeight: 1.9,
            color: "rgba(244,240,230,0.72)",
          }}
        >
          The broad self-serve membership is not the main public path right now. New clients should
          start with a smaller offer or inquire about the private guided version.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
          <Link
            href="/private-shoot"
            style={{
              display: "inline-flex",
              padding: "16px 24px",
              background: "#f4f0e6",
              color: "#0f0d0b",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Private Brand Shoot
          </Link>
          <Link
            href="/brand-strategy"
            style={{
              display: "inline-flex",
              padding: "16px 24px",
              border: "1px solid rgba(244,240,230,0.2)",
              color: "rgba(244,240,230,0.82)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Brand Strategy
          </Link>
        </div>
      </div>
    </main>
  )
}
