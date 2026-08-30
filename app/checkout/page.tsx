"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import Image from "next/image"
import { trackCheckoutStart } from "@/lib/analytics"
import { CheckoutBrandMasthead } from "@/components/checkout/checkout-brand-masthead"

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
  "offer",
  "checkout_email",
  "vault_credit",
  "starter_kit_credit",
  "upgrade_credit",
  "tier",
  "collection",
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

function getPaymentEntryEvent(productType: string): string {
  if (productType === "campaign_outcome") return "campaign_checkout_start"
  if (productType === "prompt_vault") return "prompt_vault_checkout_payment_entry_shown"
  if (productType === "vault_maya") return "vault_maya_checkout_payment_entry_shown"
  if (productType === "starter_kit") return "starter_kit_checkout_payment_entry_shown"
  if (productType === "masterclass") return "masterclass_checkout_payment_entry_shown"
  if (productType === "selfie_to_brand_shoot_system")
    return "selfie_to_brand_shoot_checkout_payment_entry_shown"
  if (productType === "presets_single" || productType === "presets_bundle")
    return "presets_checkout_payment_entry_shown"
  if (
    productType === "sselfie_studio_membership" ||
    productType === "sselfie_studio_membership_annual"
  ) {
    return "studio_membership_checkout_payment_entry_shown"
  }
  return "checkout_payment_entry_shown"
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
    heroBody: "Start with one clearer photo of yourself.",
    heading: "Secure checkout",
    blurb: "You're getting the guide and 7-day challenge for taking a better source photo.",
    footer: "Your guide access is delivered right after payment.",
  },
  starter_kit: {
    heroTitle: "Complete your Starter Kit order",
    heroBody: "Make one source photo cleaner, stronger, and easier to use.",
    heading: "Secure checkout",
    blurb:
      "You're getting the presets, posing help, captions, and 7-day starter for better phone photos.",
    footer: "Your Starter Kit access is delivered right after payment.",
  },
  masterclass: {
    heroTitle: "Your photos are the start. Now build what they lead to.",
    heroBody:
      "One clear method for your positioning, content, captions, offer bridge, and 30-day plan.",
    heading: "Selfie Branding Masterclass",
    blurb:
      "One $147 payment gives you the complete course, instant access, and every current Masterclass resource. No subscription.",
    footer:
      "Your receipt and course access are delivered to the email you entered. Start with Your Foundation.",
  },
  prompt_vault: {
    heroTitle: "Get the full shoot and future drops",
    heroBody:
      "You tried the opening photo. Now get every complete collection and every new Prompt Vault drop.",
    heading: "The AI Photo Prompt Vault",
    blurb:
      "31 complete photoshoots and 237 copy-and-paste prompts. One $37 payment. No subscription.",
    footer: "Your private access link opens after payment and also arrives by email.",
  },
  selfie_ai_photos_kit: {
    heroTitle: "Complete your AI Photos Kit order",
    heroBody: "Turn one clear selfie into realistic AI photos that still look like you.",
    heading: "Selfie To AI Photos Kit",
    blurb:
      "You're getting the source selfie checklist, AI starter prompts, fix prompts, and your simple 3-image starter shoot path.",
    footer: "Your AI Photos Kit access is delivered right after payment.",
  },
  presets_single: {
    heroTitle: "Complete your presets order",
    heroBody: "Your selected SSELFIE preset collection is delivered right after payment.",
    heading: "SSELFIE Presets · Single Collection",
    blurb: "One $19 payment gives you one Lightroom preset collection for phone and desktop.",
    footer: "One-time digital purchase. Your preset access link is delivered right after payment.",
  },
  presets_bundle: {
    heroTitle: "Complete your presets order",
    heroBody: "Get every current SSELFIE preset collection, plus new collections added over time.",
    heading: "SSELFIE Presets · Full Collection",
    blurb: "One $39 payment gives you the full presets library for phone and desktop.",
    footer: "One-time digital purchase. Your preset access link is delivered right after payment.",
  },
  selfie_to_brand_shoot_system: {
    heroTitle: "Start your first AI brand shoot",
    heroBody:
      "Use one clear selfie, one visual direction, and Sandra's step-by-step system to create brand images you can actually use.",
    heading: "Selfie to Brand Shoot System",
    blurb:
      "You're getting the guided $197 path for turning one selfie into a small brand shoot, with the full Prompt Vault included.",
    footer: "Your System access link is delivered right after payment.",
  },
  selfie_visibility_bundle: {
    heroTitle: "Complete your One Selfie Bundle order",
    heroBody:
      "Start with one real selfie and follow one clear path to photos and content you can use.",
    heading: "One Selfie Visibility Bundle",
    blurb:
      "One $97 payment gives you five tools for life, plus 30 days of SUITE with Maya and 200 credits. No subscription.",
    footer: "Your bundle access is delivered right after payment. Nothing renews.",
  },
  // DRAFT COPY: Sandra must approve before CAMPAIGN_OUTCOME_DISABLED is opened.
  campaign_outcome: {
    heroTitle: "Your next campaign starts here",
    heroBody: "One selfie and one thing to promote. Maya prepares the three posts for you.",
    heading: "Your Next Campaign",
    blurb:
      "One $97 payment. You receive three coordinated posts with finished visuals, captions, calls to action, and the order to publish them.",
    footer:
      "One-time payment. No subscription. Delivery within 48 hours after your intake is complete.",
  },
  vault_maya: {
    heroTitle: "Join Vault Maya",
    heroBody: "Add one selfie, choose a look, and Maya creates the photo for you.",
    heading: "Vault Maya",
    blurb:
      "Every Vault look ready to create, new drops every Monday, 30 photo creations a month, and your own gallery.",
    footer:
      "Your access opens after payment. Cancel anytime from your account. Founders keep the founder price for as long as their membership stays active.",
  },
  sselfie_studio_membership: {
    heroTitle: "Join SSELFIE SUITE",
    heroBody:
      "Start with one selfie. Create the visual, find the words, and plan what goes out next.",
    heading: "SSELFIE SUITE · €97 monthly",
    blurb:
      "Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each month.",
    footer: "Your access opens after payment. Manage or cancel the membership from your account.",
  },
  sselfie_studio_membership_annual: {
    heroTitle: "Join SSELFIE SUITE",
    heroBody:
      "Maya helps you keep creating photos, covers, captions, and posts with one clear brand direction.",
    heading: "Secure checkout",
    blurb: "You're joining SSELFIE SUITE for the year.",
    footer: "Your access is delivered right after payment.",
  },
}

const CHECKOUT_CONFIDENCE_POINTS: Record<string, string[]> = {
  masterclass: [
    "Instant course access",
    "One-time $147 purchase",
    "No subscription",
    "Foundation, content, captions, offer, and 30-day plan",
  ],
  starter_kit: [
    "Instant access after payment",
    "One-time $37 purchase",
    "No subscription or credit plan",
    "Presets, posing, captions, and source-photo help",
  ],
  prompt_vault: [
    "Instant Vault access after payment",
    "One-time $37 purchase",
    "No subscription or credit plan",
    "Full visual worlds for your own selfie",
  ],
  selfie_ai_photos_kit: [
    "Instant access after payment",
    "One-time $37 purchase",
    "No subscription or credit plan",
    "AI prompts and still-you fix prompts",
  ],
  presets_single: [
    "Instant access after payment",
    "One-time $19 purchase",
    "Mobile and desktop presets",
    "Setup guide included",
  ],
  presets_bundle: [
    "Instant access after payment",
    "One-time $39 purchase",
    "Current and future collections",
    "Mobile and desktop presets",
  ],
  selfie_to_brand_shoot_system: [
    "Instant course access after payment",
    "One-time $197 purchase",
    "Full Prompt Vault included",
    "One clear selfie into your first brand shoot",
  ],
  selfie_visibility_bundle: [
    "One-time $97 purchase",
    "No subscription or automatic renewal",
    "Five tools stay yours for life",
    "30 days of SUITE with 200 credits",
  ],
  campaign_outcome: [
    "One-time $97 purchase",
    "Three finished posts: attention, trust, and offer",
    "Still-you visuals with Sandra quality control",
    "No subscription or AI to learn",
  ],
  sselfie_studio_membership: [
    "€97 billed monthly",
    "100 credits reset each month",
    "Access right after payment",
    "Cancel from your account",
  ],
  sselfie_studio_membership_annual: [
    "€970 billed yearly",
    "Annual SUITE access",
    "Access right after payment",
    "Manage billing in your account",
  ],
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const productType = searchParams.get("product_type") || "unknown"
  const isPromptVault = productType === "prompt_vault"
  const isSelfieAiPhotosKit = productType === "selfie_ai_photos_kit"
  const isPresets = productType === "presets_single" || productType === "presets_bundle"
  const isSelfieToBrandShoot = productType === "selfie_to_brand_shoot_system"
  const isSelfieVisibilityBundle = productType === "selfie_visibility_bundle"
  const isStarterKit = productType === "starter_kit"
  const isMasterclass = productType === "masterclass"
  const isVaultSuiteOffer =
    productType === "sselfie_studio_membership" &&
    searchParams.get("offer") === "prompt-vault-suite-first-month-49"
  const isVisualIdentityOffer = isPromptVault || isSelfieAiPhotosKit || isSelfieToBrandShoot
  const hasVaultCredit = isSelfieToBrandShoot && searchParams.get("vault_credit") === "1"
  const defaultCheckoutCopy = CHECKOUT_COPY[productType] ?? {
    heroTitle: "Complete your SSELFIE Studio order",
    heroBody: "Secure your purchase and keep moving.",
    heading: "Secure checkout",
    blurb: "Your payment is encrypted and protected with Stripe.",
    footer: "Cancel anytime. 30-day refund if you're not happy.",
  }
  const checkoutCopy = isVaultSuiteOffer
    ? {
        heroTitle: "Your Vault buyer offer",
        heroBody: "Keep the visual, the words, and what goes out next in one place.",
        heading: "SSELFIE SUITE · €49 for your first month",
        blurb:
          "Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each month.",
        footer: "Then €97 billed monthly. Manage or cancel the membership from your account.",
      }
    : defaultCheckoutCopy
  const confidencePoints = isVaultSuiteOffer
    ? [
        "€49 for your first month",
        "Then €97 billed monthly",
        "100 credits reset each month",
        "Cancel from your account",
      ]
    : (CHECKOUT_CONFIDENCE_POINTS[productType] ?? [])

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
    import("@/lib/analytics/client")
      .then(({ trackAnalyticsEvent }) =>
        trackAnalyticsEvent({
          event: getPaymentEntryEvent(productType),
          properties: {
            product_type: productType,
            checkout_session_id: secret.split("_secret_")[0] || null,
            ...checkoutAttributionProperties(searchParams),
          },
        })
      )
      .catch(() => {})
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
          })
        )
        .catch(() => {})
    }
    if (isPresets) {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "presets_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              ...checkoutAttributionProperties(searchParams),
            },
          })
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
          })
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
          })
        )
        .catch(() => {})
    }
    if (productType === "selfie_ai_photos_kit") {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "selfie_ai_photos_kit_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              ...checkoutAttributionProperties(searchParams),
            },
          })
        )
        .catch(() => {})
    }
    if (
      productType === "sselfie_studio_membership" ||
      productType === "sselfie_studio_membership_annual"
    ) {
      import("@/lib/analytics/client")
        .then(({ trackAnalyticsEvent }) =>
          trackAnalyticsEvent({
            event: "studio_membership_payment_form_rendered",
            properties: {
              product_type: productType,
              checkout_session_id: secret.split("_secret_")[0] || null,
              environment: ["sselfie.ai", "www.sselfie.ai"].includes(window.location.hostname)
                ? "production"
                : "non_production",
              ...checkoutAttributionProperties(searchParams),
            },
          })
        )
        .catch(() => {})
    }

    setClientSecret(secret)
  }, [hasVaultCredit, isPresets, productType, searchParams])

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
        const encodedReturnTo = returnToFromSession
          ? `&return_to=${encodeURIComponent(returnToFromSession)}`
          : ""

        const brandStrategyBumpParam = sessionData.has_brand_strategy_pack
          ? "&brand_strategy_bump=1"
          : ""

        const redirectUrl = `/checkout/success?session_id=${sessionId}${productTypeFromSession ? `&type=${encodeURIComponent(productTypeFromSession)}` : ""}${encodedReturnTo}${brandStrategyBumpParam}`
        router.push(redirectUrl)
      } catch {
        const fallbackType = productType ? `&type=${encodeURIComponent(productType)}` : ""
        const fallbackUrl = `/checkout/success?session_id=${sessionId}${fallbackType}`
        router.push(fallbackUrl)
      }
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
        <CheckoutBrandMasthead />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[18px] border border-[#E7E7EA] bg-white px-6 py-10 text-center shadow-[0_18px_70px_rgba(9,9,11,0.08)] sm:px-10">
            <div className="mb-4 font-['Cormorant_Garamond'] text-2xl font-light uppercase tracking-[0.18em] text-[#09090B] sm:text-3xl">
              Something went wrong
            </div>
            <p className="mb-6 text-sm font-light leading-relaxed text-[#5E5E66]">
              We couldn&apos;t find your checkout session. Please go back and try once more.
            </p>
            <button
              onClick={() => router.push("/")}
              className="rounded-[12px] bg-[#09090B] px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#18181B]"
            >
              Go back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
        <CheckoutBrandMasthead />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
          <div>
            <div className="mb-3 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.28em] text-[#09090B] sm:text-2xl md:text-3xl lg:text-4xl">
              S S E L F I E
            </div>
            <p className="text-sm font-light text-[#5E5E66] sm:text-base">
              Preparing your secure checkout
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
      <CheckoutBrandMasthead />
      {/* Hero Image Section */}
      <div
        className={`${isPromptVault ? "hidden" : ""} relative overflow-hidden border-b border-[rgba(243,230,207,0.42)] ${
          isSelfieVisibilityBundle
            ? "h-[132px] sm:h-[150px]"
            : isVisualIdentityOffer
              ? "h-[20vh] sm:h-[26vh] md:h-[30vh]"
              : "h-[28vh] sm:h-[34vh] md:h-[38vh]"
        }`}
      >
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2846%29-ZphddrVpPQn5mS7BINYUlTMSac3s87.jpeg"
          fill
          alt="SSELFIE Checkout"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-[#FAFAF9]/40 to-[#FAFAF9]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="mb-3 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.18em] text-[#09090B] sm:text-2xl md:text-3xl lg:text-4xl">
            {checkoutCopy.heroTitle}
          </div>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-[#5E5E66] sm:text-base">
            {checkoutCopy.heroBody}
          </p>
        </div>
      </div>

      {/* Checkout Form Section */}
      <div
        className={`max-w-3xl mx-auto px-4 sm:px-6 ${isPromptVault ? "py-6 sm:py-8" : isSelfieVisibilityBundle ? "py-4 sm:py-6" : "py-8 sm:py-12"}`}
      >
        {isVisualIdentityOffer && !isPromptVault && (
          <div
            className={`${isPromptVault ? "hidden sm:block" : ""} mb-6 border border-[rgba(243,230,207,0.48)] bg-white p-4 shadow-[0_18px_60px_rgba(9,9,11,0.06)] sm:p-5`}
          >
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
                "/images/ai-prompts/dark-balcony-shot-3.png",
                "/images/ai-prompts/coastal-white-shot-3.jpg",
                "/images/ai-prompts/denim-street-shot-5.jpg",
              ].map(src => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden bg-[#FAFAF9]">
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
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#74695F]">
                  You&apos;re getting
                </p>
                <h2 className="font-['Cormorant_Garamond'] text-[1.65rem] font-light leading-tight tracking-normal text-[#09090B] sm:text-3xl">
                  {isSelfieToBrandShoot
                    ? "The guided path plus full Vault access for your first AI brand shoot."
                    : isSelfieAiPhotosKit
                      ? "The small kit for turning one clear selfie into realistic AI photos."
                      : "The full shoot plus newest and future photoshoot drops."}
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-['Cormorant_Garamond'] text-4xl font-light leading-none text-[#09090B]">
                  {isSelfieToBrandShoot ? (hasVaultCredit ? "$160" : "$197") : "$37"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#74695F]">
                  {hasVaultCredit ? "$37 Vault credit applied" : "one-time payment"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#5E5E66]">
              {isSelfieToBrandShoot
                ? "Guided path · source selfie help · Vault included · posting plan"
                : isSelfieAiPhotosKit
                  ? "Source selfie checklist · starter prompts · fix prompts · 3-image shoot path"
                  : "Remaining shots · newest and future drops · copy-paste prompts · example images"}
            </p>
          </div>
        )}

        <div className={`text-center ${isSelfieVisibilityBundle ? "mb-4" : "mb-6 sm:mb-8"}`}>
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#74695F] mb-3">
            Secure Checkout
          </p>
          <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl md:text-3xl text-[#09090B] tracking-wide mb-3">
            {checkoutCopy.heading}
          </h1>
          <p className="text-xs sm:text-sm text-[#5E5E66] font-light leading-relaxed max-w-xl mx-auto">
            {checkoutCopy.blurb}
          </p>
          {isStarterKit && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(243,230,207,0.48)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(9,9,11,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#74695F]">
                Instant access after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#5E5E66] sm:text-sm">
                Presets, setup guide, posing guide, caption templates, and the 7-day content starter
                are delivered right away.
              </p>
            </div>
          )}
          {isMasterclass && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(243,230,207,0.48)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(9,9,11,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#74695F]">
                What happens after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#5E5E66] sm:text-sm">
                Your course opens right away. Start with Your Foundation to clarify what you sell,
                who it helps, and what you want to be known for before you build the content rhythm.
              </p>
            </div>
          )}
          {isSelfieAiPhotosKit && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(243,230,207,0.48)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(9,9,11,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#74695F]">
                What happens after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#5E5E66] sm:text-sm">
                Your access link opens the Kit right away. Start with the source selfie checklist,
                then copy the first AI photo prompt.
              </p>
            </div>
          )}
          {isSelfieToBrandShoot && (
            <div className="mx-auto mt-5 max-w-xl border border-[rgba(243,230,207,0.48)] bg-white px-4 py-3 text-left shadow-[0_14px_50px_rgba(9,9,11,0.05)] sm:px-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#74695F]">
                What happens after payment
              </p>
              <p className="mt-2 text-xs font-light leading-relaxed text-[#5E5E66] sm:text-sm">
                Your access link opens the full course right away. Start with Module 1, choose your
                Signature Visual World, create your first three AI brand images, then turn them into
                content.
              </p>
            </div>
          )}
          {confidencePoints.length > 0 && !isSelfieVisibilityBundle && !isPromptVault && (
            <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
              {confidencePoints.map(point => (
                <div
                  key={point}
                  className="rounded-[10px] border border-[rgba(243,230,207,0.7)] bg-[#FAFAF9] px-3 py-2 text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#5E5E66]"
                >
                  {point}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[rgba(243,230,207,0.58)] bg-white p-3 shadow-[0_18px_70px_rgba(9,9,11,0.08)] sm:p-5 md:p-6">
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

        {isSelfieVisibilityBundle && (
          <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
            {confidencePoints.map(point => (
              <div
                key={point}
                className="rounded-[10px] border border-[rgba(243,230,207,0.7)] bg-[#FAFAF9] px-3 py-2 text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-[#5E5E66]"
              >
                {point}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-[10px] sm:text-xs text-[#74695F] font-light leading-relaxed">
            Protected by Stripe · SSL Encrypted · PCI Compliant
          </p>
          <p className="text-[10px] sm:text-xs text-[#74695F] font-light leading-relaxed mt-2">
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
        <div className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
          <CheckoutBrandMasthead />
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
            <div>
              <div className="mb-4 font-['Cormorant_Garamond'] text-xl font-light uppercase tracking-[0.28em] text-[#09090B] sm:text-2xl">
                Loading your checkout
              </div>
              <p className="text-sm font-light text-[#5E5E66]">Please wait a moment...</p>
            </div>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
