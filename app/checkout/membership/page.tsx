import { redirect } from "next/navigation"
import Link from "next/link"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createServerClient } from "@/lib/supabase/server"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import {
  getFoundingAnnualOfferStatus,
  getFoundingAnnualPurchaseCount,
} from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    promo?: string
    interval?: string
    plan?: string
    fallback?: string
    bonus?: string
    source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    campaign_id?: string
    ref?: string
    referral_code?: string
    checkout_source?: string
    freebie_source?: string
    guide_cta?: string
    cta_keyword?: string
    quiz_result?: string
    entry_path?: string
    entry_post_slug?: string
    buyer_stage?: string
    checkout_email?: string
    email?: string
    skip_email_capture?: string
    returnTo?: string
    return_to?: string
  }>
}) {
  const params = await searchParams
  const bonusCredits = params.bonus === "4credits" ? 4 : undefined
  const attribution = getCheckoutAttributionFromParams(params, {
    source: bonusCredits ? "selfie_guide_day21_bonus" : "membership_checkout_page",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? urlEmail ?? null

  if (params.interval) {
    const isAnnual = params.interval === "year" || params.interval === "annual"
    const wantsFounding = isAnnual && params.plan === "founding"
    const foundingCount = wantsFounding ? await getFoundingAnnualPurchaseCount() : 0
    const foundingStatus = wantsFounding ? getFoundingAnnualOfferStatus(foundingCount) : null
    const foundingAvailable = Boolean(foundingStatus?.available)
    const productId = isAnnual
      ? "sselfie_studio_membership_annual"
      : "sselfie_studio_membership"
    const captureParams = {
      ...params,
      checkout_source: params.checkout_source || "membership_email_capture",
    }
    const shouldCaptureEmail = shouldShowCheckoutEmailCapture({
      params,
      hasRecoverableEmail: Boolean(checkoutEmail),
      hasAuthUser: Boolean(authUser?.id),
      hasFreebieToken: false,
    })

    if (shouldCaptureEmail) {
      await logAnalyticsEvent({
        eventName: "membership_checkout_email_capture_view",
        userId: authUser?.id || null,
        path: "/checkout/membership",
        utm: {
          source: attribution.utmSource,
          medium: attribution.utmMedium,
          campaign: attribution.utmCampaign,
          content: attribution.utmContent,
        },
        properties: {
          product_type: productId,
          source: attribution.source,
          interval: params.interval,
          has_auth_user: Boolean(authUser?.id),
          has_prefill_email: false,
          prefill_email_source: "none",
          checkout_source: captureParams.checkout_source,
          buyer_stage: attribution.buyerStage || null,
          cta_keyword: attribution.ctaKeyword || null,
          entry_post_slug: attribution.entryPostSlug || null,
        },
      })

      return (
        <PromptVaultCheckoutEmailCapture
          params={captureParams}
          actionPath="/checkout/membership"
          eyebrow="SSELFIE SUITE"
          title="Where should I send your access?"
          copy="Add your email before checkout so your login, receipt, and SUITE access go to the right place. This is where Maya helps you turn your face, story, and ideas into content you can actually use."
          inputId="membership-checkout-email"
          buttonLabel="Continue to secure payment"
          skipLabel="Skip and go straight to payment"
          productName="SSELFIE SUITE"
          productMeta="Maya, weekly content, and your personal brand workspace"
          productPrice={foundingAvailable ? "697 EUR / year · founding" : isAnnual ? "970 EUR / year" : "97 EUR / month"}
          reassurance="Used only for your login, receipt, and access link."
          visuals={[
            {
              src: "/images/email/studio-visual-workspace.jpg",
              alt: "Sandra inside the SSELFIE visual workspace",
            },
            {
              src: "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
              alt: "Editorial brand portrait created from the SSELFIE system",
            },
            {
              src: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
              alt: "Clean personal brand portrait created from the SSELFIE system",
            },
          ]}
        />
      )
    }

    try {
      const clientSecret = await createLandingCheckoutSession(productId, params.promo, checkoutEmail, {
        bonusCredits,
        ...attribution,
        membershipPlan: wantsFounding ? "founding" : null,
        offerSlug: foundingAvailable ? "founding_annual" : attribution.offerSlug,
      })
      if (clientSecret) {
        // product_type lets the embedded checkout page show membership copy and fire the
        // membership funnel event (it previously arrived as product_type "unknown").
        redirect(buildCheckoutRedirectUrl(clientSecret, productId, params))
      }
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error
      }
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
          Choose your SUITE path.
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
          The SSELFIE SUITE is the weekly creation layer with Maya. Join monthly when you want help
          turning your face, story, and ideas into photos, covers, captions, and posts.
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
            Join the SUITE Monthly
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
