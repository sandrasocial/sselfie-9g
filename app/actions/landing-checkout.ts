"use server"

import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"
import { getProductById } from "@/lib/products"
import { sql } from "@/lib/db/client"
import type Stripe from "stripe"
import { getMembershipPromoBlockReason } from "@/lib/stripe/membership-promo-policy"
import { buildCheckoutSessionIdempotencyKey } from "@/lib/checkout/session-idempotency"
import { normalizeReferralCode, REFERRAL_COOKIE_NAME } from "@/lib/referrals/routing"
import {
  FOUNDING_ANNUAL_PLAN,
  getFoundingAnnualPurchaseCount,
  resolveMembershipPriceId,
  resolvePromptVaultPriceId,
  resolveVaultMayaPriceId,
} from "@/lib/launch/cash-launch-pricing"
import {
  SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
  SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
  getSelfieVisibilityBundleCheckoutExpiresAt,
  getSelfieVisibilityBundleOfferStatus,
} from "@/lib/launch/selfie-visibility-bundle"
import {
  buildCheckoutAttributionMetadata,
  normalizeCheckoutAttribution,
  type CheckoutAttributionInput,
  upsertCheckoutAttribution,
} from "@/lib/revenue-engine/checkout-attribution"

type LandingCheckoutOptions = {
  bonusCredits?: number
  membershipPlan?: "founding" | null
  presetTier?: "single" | "bundle"
  presetCollectionSlug?: string | null
  repeatOrderToken?: string | null
} & CheckoutAttributionInput

function normalizeStripeCustomerEmail(email?: string | null): string | null {
  const value = email?.trim().toLowerCase()
  if (!value) return null

  // Stripe validates customer_email before creating the session. If a saved lead
  // email has a typo, skip prefill so checkout still opens and asks for email.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null
}

export async function createLandingCheckoutSession(
  productId: string,
  promoCode?: string,
  customerEmail?: string | null,
  options?: LandingCheckoutOptions,
) {
  console.log("[landing-checkout] Creating checkout session for product:", productId, promoCode ? `with promo: ${promoCode}` : "")

  const product = getProductById(productId)
  if (!product) {
    console.error("[landing-checkout] Product not found:", productId)
    throw new Error(`Product with id "${productId}" not found`)
  }

  const isSelfieVisibilityBundle = product.type === "selfie_visibility_bundle"
  const isCampaignOutcome = product.type === "campaign_outcome"
  if ((isSelfieVisibilityBundle || isCampaignOutcome) && promoCode?.trim()) {
    throw new Error(
      isCampaignOutcome
        ? "Your Next Campaign has one fixed $97 price."
        : "The One Selfie Visibility Bundle has one fixed $97 price.",
    )
  }
  if (isCampaignOutcome && process.env.CAMPAIGN_OUTCOME_DISABLED !== "false") {
    throw new Error("Your Next Campaign is not open yet.")
  }
  const selfieVisibilityBundleOfferStatus = isSelfieVisibilityBundle
    ? getSelfieVisibilityBundleOfferStatus()
    : null
  if (selfieVisibilityBundleOfferStatus && !selfieVisibilityBundleOfferStatus.isOpen) {
    throw new Error(
      selfieVisibilityBundleOfferStatus.phase === "upcoming"
        ? "The One Selfie Visibility Bundle checkout is not open yet."
        : "The One Selfie Visibility Bundle checkout is closed.",
    )
  }
  const selfieVisibilityBundleCheckoutExpiresAt = isSelfieVisibilityBundle
    ? getSelfieVisibilityBundleCheckoutExpiresAt()
    : null

  // B3 defense-in-depth (Sandra, 2026-07-30): even if a member reaches the action directly,
  // never create a vault_maya session for an authenticated active SUITE member.
  if (product.type === "vault_maya") {
    try {
      const { createServerClient } = await import("@/lib/supabase/server")
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser?.id) {
        const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
        const neonUserId = await getUserIdFromSupabase(authUser.id)
        if (neonUserId) {
          const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
          const access = await getSuiteAccess(String(neonUserId))
          if (access.level === "member") {
            throw new Error(
              "Vault Maya is already included in your SSELFIE SUITE membership."
            )
          }
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("already included in your SSELFIE SUITE")
      ) {
        throw error
      }
      // Auth resolution failures must not block anonymous checkouts.
      console.warn("[landing-checkout] vault_maya member guard skipped:", error)
    }
  }

  const isSubscription =
    product.type === "sselfie_studio_membership" ||
    product.type === "sselfie_studio_membership_annual" ||
    product.type === "vault_maya"
  const checkoutProductType =
    product.type === "sselfie_studio_membership_annual"
      ? "sselfie_studio_membership"
      : product.type
  const allowManualPromotionCodes =
    !isSubscription &&
    product.type !== "prompt_vault" &&
    product.type !== "starter_kit" &&
    product.type !== "selfie_ai_photos_kit" &&
    product.type !== "presets_single" &&
    product.type !== "presets_bundle" &&
    product.type !== "selfie_visibility_bundle" &&
    product.type !== "campaign_outcome"
  const checkoutSource = options?.source?.trim() || "landing_page"
  const normalizedCustomerEmail = normalizeStripeCustomerEmail(customerEmail)
  const bonusCredits =
    typeof options?.bonusCredits === "number" && Number.isFinite(options.bonusCredits) && options.bonusCredits > 0
      ? Math.floor(options.bonusCredits)
      : 0
  const cookieStore = await cookies()
  const referralCode =
    normalizeReferralCode(options?.referralCode || null) ||
    normalizeReferralCode(cookieStore.get(REFERRAL_COOKIE_NAME)?.value || null)
  const attribution = normalizeCheckoutAttribution(productId, {
    ...options,
    source: checkoutSource,
    referralCode,
  })
  const requestedMembershipPlan = options?.membershipPlan === "founding" ? "founding" : null
  const foundingCount =
    product.type === "sselfie_studio_membership_annual" && requestedMembershipPlan
      ? await getFoundingAnnualPurchaseCount()
      : 0
  const membershipPrice = isSubscription
    ? resolveMembershipPriceId({
        productType: product.type,
        requestedPlan: requestedMembershipPlan,
        foundingCount,
      })
    : null
  const appliedMembershipPlan = membershipPrice?.appliedPlan || null
  const effectiveOfferSlug =
    appliedMembershipPlan === FOUNDING_ANNUAL_PLAN ? FOUNDING_ANNUAL_PLAN : options?.offerSlug
  const checkoutAttributionMetadata = buildCheckoutAttributionMetadata(productId, {
    ...options,
    offerSlug: effectiveOfferSlug,
    source: attribution.source,
    referralCode: attribution.referralCode,
      checkoutSource: options?.checkoutSource || checkoutSource,
      promptNumber: options?.promptNumber || null,
    })

  const actualPrice = product.priceInCents

  console.log("[landing-checkout] Checkout config:", {
    productId,
    productType: checkoutProductType,
    requestedMembershipPlan,
    appliedMembershipPlan,
    foundingCount,
    foundingAvailable: membershipPrice?.foundingStatus?.available ?? null,
    isSubscription,
    price: actualPrice,
  })

  // Determine which Stripe Price ID to use based on product type
  // FIX B1: Removed hardcoded fallback - fail fast if env var not set
  let stripePriceId: string | undefined
  const envVarByProductType: Record<string, string> = {
    one_time_session: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
    paid_blueprint: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
    brand_strategy_pack: "STRIPE_PRICE_BRAND_STRATEGY_PACK",
    selfie_guide_bundle: "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE",
    selfie_guide: "STRIPE_PRICE_SELFIE_GUIDE",
    starter_kit: "STRIPE_PRICE_STARTER_KIT",
    selfie_ai_photos_kit: "STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT",
    masterclass: "STRIPE_PRICE_MASTERCLASS",
    visibility_suite: "STRIPE_PRICE_VISIBILITY_SUITE_LAUNCH",
    sselfie_studio_membership_annual:
      appliedMembershipPlan === FOUNDING_ANNUAL_PLAN
        ? "STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID"
        : "STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID",
    sselfie_studio_membership: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
    vault_maya: "STRIPE_VAULT_MAYA_FOUNDER_PRICE_ID",
    prompt_vault: "STRIPE_PRICE_PROMPT_VAULT",
    presets_single: "STRIPE_PRICE_PRESETS_SINGLE",
    presets_bundle: "STRIPE_PRICE_PRESETS_BUNDLE",
    selfie_visibility_bundle: "STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE",
    selfie_to_brand_shoot_system: "STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM",
  }
  const envVarName = envVarByProductType[product.type] || "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID"
  
  if (product.type === "one_time_session") {
    stripePriceId = process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID
  } else if (product.type === "sselfie_studio_membership_annual" || product.type === "sselfie_studio_membership") {
    stripePriceId = membershipPrice?.stripePriceId
  } else if (product.type === "paid_blueprint") {
    stripePriceId = process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID
  } else if (product.type === "brand_strategy_pack") {
    stripePriceId = process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK
  } else if (product.type === "selfie_guide_bundle") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE_BUNDLE
  } else if (product.type === "selfie_guide") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE
  } else if (product.type === "starter_kit") {
    stripePriceId = process.env.STRIPE_PRICE_STARTER_KIT
  } else if (product.type === "selfie_ai_photos_kit") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_AI_PHOTOS_KIT
  } else if (product.type === "masterclass") {
    stripePriceId = process.env.STRIPE_PRICE_MASTERCLASS
  } else if (product.type === "visibility_suite") {
    stripePriceId = product.stripePriceId
  } else if (product.type === "vault_maya") {
    stripePriceId = resolveVaultMayaPriceId()
  } else if (product.type === "prompt_vault") {
    stripePriceId = resolvePromptVaultPriceId()
  } else if (product.type === "presets_single") {
    stripePriceId = process.env.STRIPE_PRICE_PRESETS_SINGLE
  } else if (product.type === "presets_bundle") {
    stripePriceId = process.env.STRIPE_PRICE_PRESETS_BUNDLE
  } else if (product.type === "selfie_visibility_bundle") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_VISIBILITY_BUNDLE
  } else if (product.type === "campaign_outcome") {
    // This experiment intentionally ignores any production price env. Inline
    // pricing makes the one-time USD $97 contract exact and self-contained.
    stripePriceId = undefined
  } else if (product.type === "selfie_to_brand_shoot_system") {
    stripePriceId = process.env.STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM
  }
  stripePriceId = stripePriceId?.trim()

  if (!stripePriceId && !isCampaignOutcome) {
    console.error("[landing-checkout] ❌ CRITICAL: Missing Stripe Price ID for product:", productId)
    console.error("[landing-checkout] ❌ Required environment variable:", envVarName)
    console.error("[landing-checkout] ❌ This checkout cannot proceed without proper price configuration")
    throw new Error(
      `Stripe Price ID not configured. Please contact support. (Missing: ${envVarName})`
    )
  }

  const checkoutPriceKey = stripePriceId || "inline-campaign-outcome-9700-usd"
  console.log("[landing-checkout] Using Stripe price:", checkoutPriceKey)

  // Validate promo code if provided (consistent with startCreditCheckoutSession)
  let validatedCoupon: string | null = null
  if (promoCode) {
    try {
      const coupon = await stripe.coupons.retrieve(promoCode.toUpperCase())
      if (coupon.valid) {
        if (isSubscription) {
          const blockReason = getMembershipPromoBlockReason({
            duration: coupon.duration,
            percentOff: coupon.percent_off,
          })
          if (blockReason) {
            throw new Error(blockReason)
          }
        }
        validatedCoupon = coupon.id
        console.log(`[landing-checkout] ✅ Valid promo code found: ${promoCode.toUpperCase()}, applying discount`)
      } else {
        console.log(`[landing-checkout] ⚠️ Promo code ${promoCode.toUpperCase()} is not valid`)
      }
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("no longer available")) {
        throw error
      }
      // Invalid coupon code - only allow manual promotion codes for non-subscription products
      console.log(
        `[landing-checkout] ⚠️ Promo code ${promoCode?.toUpperCase()} not found, ${allowManualPromotionCodes ? "allowing" : "blocking"} manual promotion codes`,
      )
    }
  }

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "embedded",
    mode: isSubscription ? "subscription" : "payment",
    redirect_on_completion: "never",
    ...(selfieVisibilityBundleCheckoutExpiresAt && {
      expires_at: selfieVisibilityBundleCheckoutExpiresAt,
    }),
    ...(normalizedCustomerEmail && { customer_email: normalizedCustomerEmail }),
    // NOTE: `automatic_payment_methods` is a PaymentIntent param, NOT a Checkout Session param.
    // The Stripe API version 2026-01-28.clover rejects it ("Received unknown parameter:
    // automatic_payment_methods"), which broke EVERY one-time checkout (vault/starter-kit/presets)
    // ~2026-06-11. Checkout Sessions get dynamic payment methods from the account's default
    // payment method configuration automatically, so no param is needed here.
    line_items: stripePriceId
      ? [{ price: stripePriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              unit_amount: 9700,
              product_data: {
                name: product.displayName,
                description: "Three coordinated posts with finished visuals, words, and calls to action.",
                metadata: { product_type: "campaign_outcome" },
              },
            },
            quantity: 1,
          },
        ],
    // NOTE: optional_items is NOT supported with ui_mode: "embedded" (Stripe restriction).
    // Brand Strategy order bump is delivered via post-purchase email in the Stripe webhook.
    // Apply validated coupon OR allow promotion codes (mutually exclusive per Stripe API)
    ...(validatedCoupon && {
      discounts: [
        {
          coupon: validatedCoupon,
        },
      ],
    }),
    ...(!validatedCoupon && allowManualPromotionCodes && {
      allow_promotion_codes: true,
    }),
    ...(isSubscription && {
      subscription_data: {
        metadata: {
          product_id: productId,
          product_type: checkoutProductType,
          ...(appliedMembershipPlan && { plan: appliedMembershipPlan }),
          ...(requestedMembershipPlan && { requested_plan: requestedMembershipPlan }),
          credits: product.credits?.toString() || "0",
          ...(bonusCredits > 0 && { bonus_credits: String(bonusCredits) }),
          ...checkoutAttributionMetadata,
        },
      },
    }),
    metadata: {
      product_id: productId,
      product_type: checkoutProductType,
      ...(appliedMembershipPlan && { plan: appliedMembershipPlan }),
      ...(requestedMembershipPlan && { requested_plan: requestedMembershipPlan }),
      credits: product.credits?.toString() || "0",
      ...(bonusCredits > 0 && { bonus_credits: String(bonusCredits) }),
      ...checkoutAttributionMetadata,
      ...(options?.presetTier ? { preset_tier: options.presetTier } : {}),
      ...(options?.presetCollectionSlug ? { preset_collection_slug: options.presetCollectionSlug } : {}),
      ...(normalizedCustomerEmail && { customer_email: normalizedCustomerEmail }),
      ...(promoCode && { promo_code: promoCode }),
      ...(isSelfieVisibilityBundle && {
        offer_opens_at: SELFIE_VISIBILITY_BUNDLE_OPENS_AT,
        offer_closes_at: SELFIE_VISIBILITY_BUNDLE_CLOSES_AT,
      }),
      ...(isCampaignOutcome && {
        campaign_contract: "campaign-outcome-v2",
        repeat_order_token: options?.repeatOrderToken?.trim() || "",
      }),
    },
  }

  try {
    const idempotencyKey = isSubscription
      ? null
      : buildCheckoutSessionIdempotencyKey({
          productType: product.type,
          stripePriceId: checkoutPriceKey,
          customerEmail: normalizedCustomerEmail,
          promoCode,
          sessionScope: {
            metadata: sessionConfig.metadata || {},
            discounts: validatedCoupon ? [validatedCoupon] : [],
            allowPromotionCodes: Boolean(sessionConfig.allow_promotion_codes),
          },
        })
    // CHECKOUT-02: only pass an options object when we actually have an idempotency
    // key. Passing an empty `{}` made stripe-node throw "Unknown arguments
    // ([object Object])" and broke ~25% of Vault checkouts (the no-email ManyChat
    // "VAULT" reel traffic, where idempotencyKey resolves to null).
    const session = idempotencyKey
      ? await stripe.checkout.sessions.create(sessionConfig, { idempotencyKey })
      : await stripe.checkout.sessions.create(sessionConfig)
    console.log("[landing-checkout] Checkout session created successfully:", session.id)
    console.log("[landing-checkout] Client secret generated:", !!session.client_secret)
    await upsertCheckoutAttribution({
      sessionId: session.id,
      checkoutOrigin: "guest",
      productId,
      productType: checkoutProductType,
      offerSlug: appliedMembershipPlan === FOUNDING_ANNUAL_PLAN ? FOUNDING_ANNUAL_PLAN : attribution.offerSlug,
      funnelStage: attribution.funnelStage,
      source: attribution.source,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmContent: attribution.utmContent,
      emailType: attribution.emailType,
      campaignId: attribution.campaignId,
      referralCode: attribution.referralCode,
      guideCta: attribution.guideCta,
      freebieSource: attribution.freebieSource,
      checkoutSource: attribution.checkoutSource,
      ctaKeyword: attribution.ctaKeyword,
      promptNumber: attribution.promptNumber,
      quizResult: attribution.quizResult,
      returnTo: attribution.returnTo,
      entryPath: attribution.entryPath,
      entryPostSlug: attribution.entryPostSlug,
      buyerStage: attribution.buyerStage,
      userEmail: normalizedCustomerEmail,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
    })
    return session.client_secret
  } catch (error: any) {
    console.error("[landing-checkout] Stripe API error creating checkout session:", {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    })
    throw error
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "line_items.data.price", "customer"],
    })

    return {
      status: session.status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
      metadata: session.metadata,
    }
  } catch (error: any) {
    throw error
  }
}

export async function getUserByEmail(email: string) {

  try {
    const result = await sql`
      SELECT 
        id,
        email,
        display_name,
        stripe_customer_id,
        supabase_user_id,
        created_at,
        password_setup_complete
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    if (result.length === 0) {
      return null
    }

    const user = result[0]

    const subscriptionResult = await sql`
      SELECT 
        product_type,
        status
      FROM subscriptions
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    const creditsResult = await sql`
      SELECT balance
      FROM user_credits
      WHERE user_id = ${user.id}
      LIMIT 1
    `

    const hasAccount = user.password_setup_complete === true

    console.log("[landing-checkout] getUserByEmail result:", {
      email: user.email,
      password_setup_complete: user.password_setup_complete,
      hasAccount: hasAccount,
    })

    return {
      email: user.email,
      displayName: user.display_name,
      hasAccount,
      productType: subscriptionResult[0]?.product_type || null,
      credits: creditsResult[0]?.balance || 0,
    }
  } catch (error: any) {
    console.error("[landing-checkout] getUserByEmail error:", error)
    return null
  }
}

const emailCache = new Map<string, { email: string; timestamp: number }>()
const CACHE_DURATION = 60000

export async function getUserByStripeSession(sessionId: string) {
  try {
    const cached = emailCache.get(sessionId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return getUserByEmail(cached.email)
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session.customer_details?.email && !session.customer_email) {
      return null
    }

    const email = session.customer_details?.email || session.customer_email

    if (!email) {
      return null
    }

    emailCache.set(sessionId, { email, timestamp: Date.now() })

    return getUserByEmail(email)
  } catch {
    return null
  }
}
