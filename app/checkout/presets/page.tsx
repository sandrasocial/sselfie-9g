import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { PromptVaultCheckoutEmailCapture } from "@/components/prompt-vault/prompt-vault-checkout-email-capture"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getPublishedPresetCollections } from "@/lib/presets/published-collections"
import { presetsProductIdForTier, type PresetsTier } from "@/lib/presets/orders"
import {
  buildCheckoutRedirectUrl,
  getCheckoutAttributionFromParams,
} from "@/lib/revenue-engine/checkout-attribution"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"
import { createServerClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Checkout | The SSELFIE Presets",
  description: "Complete your SSELFIE Presets purchase.",
}

type PresetsCheckoutParams = {
  tier?: string
  collection?: string
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  email_type?: string
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
}

function normalizeTier(value?: string | null): PresetsTier | null {
  if (value === "single" || value === "bundle") return value
  return null
}

function normalizeCheckoutEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase()
  if (!email || email.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function presetsCheckoutProperties(
  params: PresetsCheckoutParams,
  attribution: ReturnType<typeof getCheckoutAttributionFromParams>,
  extra?: Record<string, string | number | boolean | null>,
) {
  const tier = normalizeTier(params.tier) || "bundle"
  return {
    product_type: presetsProductIdForTier(tier),
    preset_tier: tier,
    preset_collection_slug: params.collection || null,
    source: attribution.source || "presets_dm_launch",
    utm_source: attribution.utmSource || null,
    utm_medium: attribution.utmMedium || null,
    utm_campaign: attribution.utmCampaign || null,
    utm_content: attribution.utmContent || null,
    campaign_id: attribution.campaignId ? String(attribution.campaignId) : null,
    cta_keyword: attribution.ctaKeyword || null,
    entry_post_slug: attribution.entryPostSlug || null,
    buyer_stage: attribution.buyerStage || null,
    checkout_source: attribution.checkoutSource || null,
    ...extra,
  }
}

function buildPresetsCheckoutHref(tier: PresetsTier, collection?: string | null) {
  const params = new URLSearchParams({
    tier,
    source: "presets_landing",
    utm_source: "presets_page",
    utm_medium: "site",
    utm_campaign: "presets_launch",
    checkout_source: tier === "bundle" ? "presets_bundle_cta" : "presets_single_cta",
    buyer_stage: "micro",
  })
  if (collection) params.set("collection", collection)
  return `/checkout/presets?${params.toString()}`
}

function PresetsChoicePage({
  collections,
}: {
  collections: Awaited<ReturnType<typeof getPublishedPresetCollections>>
}) {
  const firstCollection = collections[0] ?? null

  return (
    <main className="min-h-screen bg-[#F8FAFA] px-5 py-14 text-[#0D0E10]">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.34em] text-[#818283]">
          The SSELFIE Presets
        </p>
        <h1 className="font-['Cormorant_Garamond'] text-4xl font-light leading-tight sm:text-5xl">
          Choose your presets checkout.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#4F5052]">
          Pick one collection, or take the full preset library with every new collection added over time.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="border border-[rgba(197,198,200,0.55)] bg-white p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#818283]">
            One collection
          </p>
          <p className="mt-4 font-['Cormorant_Garamond'] text-4xl font-light">$19</p>
          <p className="mt-2 text-sm leading-6 text-[#4F5052]">
            One Lightroom preset collection for phone and desktop.
          </p>
          {firstCollection ? (
            <Link
              href={buildPresetsCheckoutHref("single", firstCollection.slug)}
              className="mt-6 block bg-[#0D0E10] px-5 py-4 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-white"
            >
              Get one
            </Link>
          ) : (
            <p className="mt-6 text-xs leading-6 text-[#818283]">
              Single collections appear here once Sandra uploads the preset files.
            </p>
          )}
        </div>

        <div className="border border-[#0D0E10] bg-white p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#818283]">
            Full collection
          </p>
          <p className="mt-4 font-['Cormorant_Garamond'] text-4xl font-light">$39</p>
          <p className="mt-2 text-sm leading-6 text-[#4F5052]">
            Every current collection, and every new one added later.
          </p>
          <Link
            href={buildPresetsCheckoutHref("bundle")}
            className="mt-6 block bg-[#0D0E10] px-5 py-4 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-white"
          >
            Get everything
          </Link>
        </div>
      </section>
    </main>
  )
}

export default async function PresetsCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<PresetsCheckoutParams>
}) {
  const params = await searchParams
  const collections = await getPublishedPresetCollections()
  const tier = normalizeTier(params.tier)

  if (!tier) {
    return <PresetsChoicePage collections={collections} />
  }

  const selectedCollection =
    tier === "single"
      ? collections.find(collection => collection.slug === params.collection) || collections[0] || null
      : null

  if (tier === "single" && !selectedCollection) {
    return <PresetsChoicePage collections={collections} />
  }

  const attribution = getCheckoutAttributionFromParams(params, {
    source: "presets_dm_launch",
    utmCampaign: "presets_launch",
    checkoutSource: tier === "bundle" ? "presets_bundle_checkout" : "presets_single_checkout",
    buyerStage: "micro",
  })
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const urlEmail = normalizeCheckoutEmail(params.checkout_email || params.email)
  const checkoutEmail = authUser?.email ?? urlEmail ?? null
  const shouldCaptureEmail = shouldShowCheckoutEmailCapture({
    params,
    hasRecoverableEmail: Boolean(checkoutEmail),
    hasAuthUser: Boolean(authUser?.id),
    hasFreebieToken: false,
  })
  const productId = presetsProductIdForTier(tier)
  const collectionSlug = selectedCollection?.slug || null

  const isSingle = tier === "single"
  const alreadyReviewed =
    params.skip_email_capture === "1" || params.skip_email_capture === "true"
  // Always give single-collection buyers a visual review step (images + order bump),
  // even when we already know their email. The skip flag (set on submit) stops the loop.
  const showCheckoutPanel = shouldCaptureEmail || (isSingle && !alreadyReviewed)

  const presetVisuals = isSingle && selectedCollection
    ? [
        {
          src: `/images/presets/collection-${selectedCollection.slug}-after.jpg`,
          alt: `${selectedCollection.name} preset applied`,
        },
        {
          src: `/images/presets/collection-${selectedCollection.slug}.jpg`,
          alt: `${selectedCollection.name} before the preset`,
        },
        { src: "/images/presets/lifestyle-moody.jpg", alt: "SSELFIE editorial preset look" },
      ]
    : [
        { src: "/images/presets/hero.jpg", alt: "Sandra with the SSELFIE preset look" },
        { src: "/images/presets/lifestyle-moody.jpg", alt: "Moody SSELFIE preset look" },
        { src: "/images/presets/lifestyle-como.jpg", alt: "Lake Como SSELFIE preset look" },
      ]

  if (showCheckoutPanel) {
    await logAnalyticsEvent({
      eventName: "presets_checkout_email_capture_view",
      userId: authUser?.id || null,
      path: "/checkout/presets",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: presetsCheckoutProperties(params, attribution, {
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: false,
        prefill_email_source: "none",
      }),
    })

    return (
      <PromptVaultCheckoutEmailCapture
        params={params}
        actionPath="/checkout/presets"
        eyebrow="SSELFIE PRESETS"
        title={isSingle ? "Your collection is ready." : "Where should I send your presets?"}
        copy={
          isSingle
            ? "Add your email so your preset files and receipt land in the right inbox, then continue to secure payment."
            : "Add your email before checkout so your presets access link and receipt land in the right inbox."
        }
        inputId="presets-checkout-email"
        orderLabel="Your order"
        productName={
          tier === "bundle"
            ? "SSELFIE Presets · Full Collection"
            : selectedCollection?.name || "One preset collection"
        }
        productMeta={
          tier === "bundle"
            ? "Current and future Lightroom collections"
            : selectedCollection?.description || "One preset collection, phone and desktop"
        }
        productPrice={tier === "bundle" ? "$39 one-time" : "$19 one-time"}
        reassurance="Your receipt and preset access link go to this inbox."
        prefillEmail={checkoutEmail || ""}
        proceedOnSubmit={isSingle}
        visuals={presetVisuals}
        orderBump={
          isSingle
            ? {
                baseTier: "single",
                upgradeTier: "bundle",
                label: "Make it the full set",
                description:
                  "Get every collection, not just this one. All of them, plus every new drop, yours forever. Add them all for $20 more.",
                upgradeName: "SSELFIE Presets · Full Collection",
                upgradeMeta: "Every collection, and every new one added later",
                upgradePrice: "$39 one-time",
              }
            : undefined
        }
      />
    )
  }

  try {
    await logAnalyticsEvent({
      eventName: "presets_checkout_session_requested",
      userId: authUser?.id || null,
      path: "/checkout/presets",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: presetsCheckoutProperties(params, attribution, {
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: Boolean(checkoutEmail),
        prefill_email_source: authUser?.email ? "auth" : urlEmail ? "url" : "none",
      }),
    })

    const clientSecret = await createLandingCheckoutSession(
      productId,
      undefined,
      checkoutEmail,
      {
        ...attribution,
        presetTier: tier,
        presetCollectionSlug: collectionSlug,
      },
    )

    if (clientSecret) {
      const stripeSessionId = clientSecret.split("_secret_")[0] || null
      await logAnalyticsEvent({
        eventName: "presets_checkout_session_created",
        userId: authUser?.id || null,
        path: "/checkout/presets",
        utm: {
          source: attribution.utmSource,
          medium: attribution.utmMedium,
          campaign: attribution.utmCampaign,
          content: attribution.utmContent,
        },
        properties: presetsCheckoutProperties(params, attribution, {
          checkout_session_id: stripeSessionId,
          has_auth_user: Boolean(authUser?.id),
          has_prefill_email: Boolean(checkoutEmail),
          prefill_email_source: authUser?.email ? "auth" : urlEmail ? "url" : "none",
        }),
      })
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

    const message = error instanceof Error ? error.message : "Unknown checkout session error"
    await logAnalyticsEvent({
      eventName: "presets_checkout_session_failed",
      userId: authUser?.id || null,
      path: "/checkout/presets",
      utm: {
        source: attribution.utmSource,
        medium: attribution.utmMedium,
        campaign: attribution.utmCampaign,
        content: attribution.utmContent,
      },
      properties: presetsCheckoutProperties(params, attribution, {
        error_message: message,
        has_auth_user: Boolean(authUser?.id),
        has_prefill_email: Boolean(checkoutEmail),
      }),
    })
    console.error("[Presets Checkout] Error creating checkout session:", error)
  }

  redirect("/presets?checkout=failed")
}
