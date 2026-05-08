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
          "radial-gradient(circle at top, rgba(229,229,229,0.14), transparent 32%), var(--color-obsidian)",
        color: "var(--color-porcelain)",
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
            color: "rgba(229,229,229,0.56)",
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
          Choose your Studio path.
        </h1>
        <p
          style={{
            marginTop: 28,
            maxWidth: 620,
            fontSize: "1.02rem",
            lineHeight: 1.9,
            color: "rgba(229,229,229,0.78)",
          }}
        >
          Studio is the weekly execution layer with Maya. Join monthly when you are ready for the
          recurring system, or start smaller if you still need the method first.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
          <Link
            href="/checkout/membership?interval=month"
            style={{
              display: "inline-flex",
              padding: "16px 24px",
              background: "var(--color-porcelain)",
              color: "var(--color-obsidian)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Join Studio Monthly
          </Link>
          <Link
            href="/masterclass"
            style={{
              display: "inline-flex",
              padding: "16px 24px",
              border: "1px solid rgba(229,229,229,0.22)",
              color: "rgba(229,229,229,0.86)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Start With Masterclass
          </Link>
          <Link
            href="/work-with-me"
            style={{
              display: "inline-flex",
              padding: "16px 24px",
              border: "1px solid rgba(229,229,229,0.22)",
              color: "rgba(229,229,229,0.86)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Private Support
          </Link>
        </div>
      </div>
    </main>
  )
}
