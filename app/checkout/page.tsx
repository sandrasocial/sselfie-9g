"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import Image from "next/image"
import { trackCheckoutStart } from "@/lib/analytics"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const ATTRIBUTION_KEYS = [
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "referral_code",
  "checkout_source",
  "freebie_source",
  "guide_cta",
  "cta_keyword",
  "quiz_result",
  "return_to",
  "entry_path",
  "entry_post_slug",
  "buyer_stage",
  "checkout_email",
  "vault_credit",
  "starter_kit_credit",
  "upgrade_credit",
] as const

function checkoutAttributionProperties(searchParams: URLSearchParams) {
  return ATTRIBUTION_KEYS.reduce<Record<string, string>>((properties, key) => {
    const value = searchParams.get(key)
    if (value) {
      properties[key] = value
    }
    return properties
  }, {})
}

const CHECKOUT_COPY: Record<
  string,
  {
    heroTitle: string
    heroBody: string
    heading: string
    blurb: string
    footer: string
  }
> = {
  selfie_guide: {
    heroTitle: "Complete your Selfie Guide order",
    heroBody: "Secure your guide and 7-day challenge.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Guide with encrypted Stripe checkout.",
    footer: "Digital purchase. Your guide access is delivered right after payment.",
  },
  starter_kit: {
    heroTitle: "Complete your Starter Kit order",
    heroBody: "Get the presets, quick-start, and guide support in one place.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Starter Kit with encrypted Stripe checkout.",
    footer: "Digital purchase. Your Starter Kit access is delivered right after payment.",
  },
  masterclass: {
    heroTitle: "Complete your Masterclass order",
    heroBody: "Unlock Sandra's full selfie method right after payment.",
    heading: "Secure checkout",
    blurb: "You are buying the Selfie Masterclass with encrypted Stripe checkout.",
    footer: "Digital purchase. Your Masterclass access is delivered right after payment.",
  },
  prompt_vault: {
    heroTitle: "Get the full shoot + future drops",
    heroBody: "You tried the opening shot. Now unlock the remaining shots, newest drops, and future SSELFIE photoshoots.",
    heading: "The AI Photo Prompt Vault",
    blurb: "One $27 payment unlocks the full shoot sequences, example images, copy-paste ChatGPT prompts, newest drops, and future photoshoot collections.",
    footer: "One-time digital purchase. Your Vault access link is delivered right after payment.",
  },
  selfie_to_brand_shoot_system: {
    heroTitle: "Start your first AI brand shoot",
    heroBody: "Use one clear selfie, one visual direction, and Sandra's step-by-step system to create brand images you can actually use.",
    heading: "Selfie to Brand Shoot System",
    blurb: "You are buying the guided $197 system for turning one selfie into a cohesive personal brand shoot, with the full Prompt Vault included.",
    footer: "One-time digital purchase. Your System access link is delivered right after payment.",
  },
  sselfie_studio_membership: {
    heroTitle: "Complete your SSELFIE SUITE order",
    heroBody: "Your membership starts the moment payment goes through.",
    heading: "Secure checkout",
    blurb: "You are joining SSELFIE SUITE with encrypted Stripe checkout. Monthly membership, cancel anytime.",
    footer: "Your access is delivered right after payment. Cancel anytime from your account.",
  },
  sselfie_studio_membership_annual: {
    heroTitle: "Complete your SSELFIE SUITE order",
    heroBody: "Your membership starts the moment payment goes through.",
    heading: "Secure checkout",
    blurb: "You are joining SSELFIE SUITE with encrypted Stripe checkout.",
    footer: "Your access is delivered right after payment.",
  },
}

const CHECKOUT_CONFIDENCE_POINTS: Record<string, string[]> = {
  starter_kit: [
    "Instant access after payment",
    "One-time $37 purchase",
    "No subscription or credit plan",
    "Email delivery plus Academy access",
  ],
  prompt_vault: [
    "Instant Vault access after payment",
    "One-time $27 purchase",
    "No subscription or credit plan",
    "Use the prompts in ChatGPT with your own selfie",
  ],
  selfie_to_brand_shoot_system: [
    "Instant course access after payment",
    "One-time $197 purchase",
    "Full Prompt Vault included",
    "Use ChatGPT with your own selfie",
  ],
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const productType = searchParams.get("product_type") || "unknown"
  const isPromptVault = productType === "prompt_vault"
  const isSelfieToBrandShoot = productType === "selfie_to_brand_shoot_system"
  const isStarterKit = productType === "starter_kit"
  const isVisualIdentityOffer = isPromptVault || isSelfieToBrandShoot
  const hasVaultCredit = isSelfieToBrandShoot && searchParams.get("vault_credit") === "1"
  const checkoutCopy = CHECKOUT_COPY[productType] ?? {
    heroTitle: "Complete your SSELFIE Studio order",
    heroBody: "Secure your purchase and keep moving.",
    heading: "Secure checkout",
    blurb: "Your payment is encrypted and protected with Stripe.",
    footer: "Cancel anytime. 30-day refund if you're not happy.",
  }
  const confidencePoints = CHECKOUT_CONFIDENCE_POINTS[productType] ?? []

  useEffect(() => {
    const secret = searchParams.get("client_secret")

    if (!secret) {
      setError("No checkout session found")
      return
    }

    // Track checkout page view (checkout started)
    trackCheckoutStart(productType, undefined, {
      ...checkoutAttributionProperties(searchParams),
      checkout_session_id: secret.split("_secret_")[0] || null,
    })
    if (productType === "prompt_vault") {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "prompt_vault_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              ...checkoutAttributionProperties(searchParams),
            },
          }),
        )
        .catch(() => {})
    }
    if (productType === "selfie_to_brand_shoot_system") {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "selfie_to_brand_shoot_checkout_start",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              vault_credit_applied: hasVaultCredit,
              ...checkoutAttributionProperties(searchParams),
            },
          }),
        )
        .catch(() => {})
    }
    if (productType === "starter_kit") {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "starter_kit_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              ...checkoutAttributionProperties(searchParams),
            },
          }),
        )
        .catch(() => {})
    }
    if (productType === "sselfie_studio_membership" || productType === "sselfie_studio_membership_annual") {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "studio_membership_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              ...checkoutAttributionProperties(searchParams),
            },
          }),
        )
        .catch(() => {})
    }

    setClientSecret(secret)
  }, [hasVaultCredit, productType, searchParams])

  const handleComplete = async () => {
    if (clientSecret) {
      const sessionId = clientSecret.split("_secret_")[0]

      try {
        const response = await fetch(`/api/checkout-session?session_id=${sessionId}`)

        const sessionData = await response.json()

        // Get product_type from query params or session metadata
        const productTypeFromQuery = searchParams.get("product_type")
        const productTypeFromSession = sessionData.product_type || productTypeFromQuery
        const returnToFromQuery = searchParams.get("return_to")
        const returnToFromSession = sessionData.return_to || returnToFromQuery
        const encodedReturnTo = returnToFromSession ? `&return_to=${encodeURIComponent(returnToFromSession)}` : ""
        
        const brandStrategyBumpParam = sessionData.has_brand_strategy_pack ? "&brand_strategy_bump=1" : ""

        const redirectUrl = `/checkout/success?session_id=${sessionId}${productTypeFromSession ? `&type=${encodeURIComponent(productTypeFromSession)}` : ""}${encodedReturnTo}${brandStrategyBumpParam}`
        router.push(redirectUrl)
      } catch {
        const fallbackUrl = `/checkout/success?session_id=${sessionId}`
        router.push(fallbackUrl)
      }
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFA] p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 font-['Cormorant_Garamond'] text-2xl font-light uppercase tracking-[0.18em] text-[#0D0E10] sm:text-3xl">
            Something went wrong
          </div>
          <p className="mb-6 text-sm font-light leading-relaxed text-[#4F5052]">
            We couldn&apos;t find your checkout session. Please go back and try once more.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#0D0E10] px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#F8FAFA] transition-colors hover:bg-[#282728]"
          >
            Go back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFA] p-4">
        <div className="text-center">
          <div className="mb-3 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.28em] text-[#0D0E10] sm:text-2xl md:text-3xl lg:text-4xl">
            S S E L F I E
          </div>
          <p className="text-sm font-light text-[#4F5052] sm:text-base">Preparing your secure checkout</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFA] text-[#0D0E10]">
      {/* Hero Image Section */}
      <div
        className={`relative overflow-hidden border-b border-[rgba(197,198,200,0.4)] ${
          isVisualIdentityOffer ? "h-[20vh] sm:h-[26vh] md:h-[30vh]" : "h-[28vh] sm:h-[34vh] md:h-[38vh]"
        }`}
      >
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2846%29-ZphddrVpPQn5mS7BINYUlTMSac3s87.jpeg"
          fill
          alt="SSELFIE Checkout"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-[#F8FAFA]/40 to-[#F8FAFA]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="mb-3 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.18em] text-[#0D0E10] sm:text-2xl md:text-3xl lg:text-4xl">
            {checkoutCopy.heroTitle}
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-[#4F5052] sm:text-base">
            {checkoutCopy.heroBody}
          </p>
        </div>
      </div>

      {/* Checkout Form Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {isVisualIdentityOffer && (
          <div className="mb-6 border border-[rgba(197,198,200,0.45)] bg-white p-4 shadow-[0_18px_60px_rgba(13,14,16,0.06)] sm:p-5">
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
                "/images/ai-prompts/dark-balcony-shot-3.png",
                "/images/ai-prompts/coastal-white-shot-3.jpg",
                "/images/ai-prompts/denim-street-shot-5.jpg",
              ].map(src => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden bg-[#F8FAFA]">
                  <Image
                    src={src}
                    alt=""
                    fill
                    aria-hidden
                    sizes="(max-width: 640px) 22vw, 160px"
                    className="object-cover object-center"
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#818283]">
                  You are unlocking
                </p>
                <h2 className="font-['Cormorant_Garamond'] text-[1.65rem] font-light leading-tight tracking-normal text-[#0D0E10] sm:text-3xl">
                  {isSelfieToBrandShoot
                    ? "The guided system + full Vault access for your first AI brand shoot."
                    : "The full shoot + all newest and future photoshoot drops."}
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-['Cormorant_Garamond'] text-4xl font-light leading-none text-[#0D0E10]">
                  {isSelfieToBrandShoot ? (hasVaultCredit ? "$170" : "$197") : "$27"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#818283]">
                  {hasVaultCredit ? "$27 Vault credit applied" : "one-time access"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#4F5052]">
              {isSelfieToBrandShoot
                ? "Guided workflow · source selfie method · Vault included · content-use path"
                : "Remaining shots · newest and future drops · copy-paste prompts · example images"}
            </p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#818283] mb-3">Secure Checkout</p>
          <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl text-[#0D0E10] tracking-wide mb-3">
            {checkoutCopy.heading}
          </h1>
          <p className="text-xs sm:text-sm text-[#4F5052] font-light leading-relaxed max-w-xl mx-auto">
            {checkoutCopy.blurb}
          </p>
          {isStarterKit && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(197,198,200,0.45)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(13,14,16,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#818283]">
                Instant access after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#4F5052] sm:text-sm">
                Presets, setup guide, posing guide, caption templates, and the 7-day content starter are delivered right away.
              </p>
            </div>
          )}
          {isPromptVault && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(197,198,200,0.45)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(13,14,16,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#818283]">
                What happens after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#4F5052] sm:text-sm">
                Your access link opens the full Vault right away so you can copy the complete shoot prompts and use them in ChatGPT with your own selfie.
              </p>
            </div>
          )}
          {isSelfieToBrandShoot && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(197,198,200,0.45)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(13,14,16,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#818283]">
                What happens after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#4F5052] sm:text-sm">
                Your access link opens the full course right away. Start with Module 1, choose your Signature Visual World, create your first three AI brand images, then turn them into content.
              </p>
            </div>
          )}
          {confidencePoints.length > 0 && (
            <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
              {confidencePoints.map((point) => (
                <div
                  key={point}
                  className="border border-[rgba(197,198,200,0.4)] bg-[#F8FAFA] px-3 py-2 text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#4F5052]"
                >
                  {point}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[rgba(197,198,200,0.55)] bg-white p-3 shadow-[0_18px_70px_rgba(13,14,16,0.08)] sm:p-5 md:p-6">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: handleComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] sm:text-xs text-[#818283] font-light leading-relaxed">
            Protected by Stripe · SSL Encrypted · PCI Compliant
          </p>
          <p className="text-[10px] sm:text-xs text-[#818283] font-light leading-relaxed mt-2">
            {checkoutCopy.footer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFA] p-4">
          <div className="text-center">
            <div className="mb-4 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.28em] text-[#0D0E10] sm:text-2xl">
              Loading your checkout
            </div>
            <p className="text-sm font-light text-[#4F5052]">Please wait a moment...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
