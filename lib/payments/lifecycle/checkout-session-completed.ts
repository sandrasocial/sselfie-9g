import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import { addOrUpdateResendContact, updateContactTags as updateTags, addContactToSegment } from "@/lib/resend/manage-contact"
import { isBrandEngineCheckoutProductType } from "@/lib/brand-engine/offer-checkout-config"
import { handlePromptVaultCheckout } from "@/lib/payments/handlers/prompt-vault"
import { handlePresetsCheckout } from "@/lib/payments/handlers/presets"
import { handleStarterKitCheckout } from "@/lib/payments/handlers/starter-kit"
import { handleSelfieToBrandShootCheckout } from "@/lib/payments/handlers/selfie-to-brand-shoot"
import { handleCreditTopupCheckout } from "@/lib/payments/handlers/credit-topup"
import { handlePaidBlueprintCheckout } from "@/lib/payments/handlers/paid-blueprint"
import { handleBrandStrategyPackCheckout } from "@/lib/payments/handlers/brand-strategy-pack"
import { handleMasterclassCheckout } from "@/lib/payments/handlers/masterclass"
import { handleSelfieGuideCheckout } from "@/lib/payments/handlers/selfie-guide"
import { handleOneTimeSessionCheckout } from "@/lib/payments/handlers/one-time-session"
import { handleTransformCheckout, isTransformProductType } from "@/lib/payments/handlers/transform"
import { handleAcademyProductCheckout } from "@/lib/payments/handlers/academy-products"
import { handleStudioMembershipSubscriptionCheckout } from "@/lib/payments/handlers/studio-membership"
import { generatePasswordSetupLinkForPurchase, markRevenueEnginePurchase, markEmailLogConversionForCheckout } from "@/lib/payments/shared"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { completeReferralForPurchase, isReferralPurchaseEligible, isReferralSignupEligible, trackReferralSignup } from "@/lib/referrals/service"
import { normalizeReferralCode } from "@/lib/referrals/routing"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { markEventFailed, markEventProcessed } from "@/lib/events/idempotency"
import { VISIBILITY_MINI_PRODUCT_BY_ID } from "@/lib/visibility-products"


async function sendTransformPurchaseEmail(params: {
  customerEmail: string
  customerName?: string | null
  credits: number
  passwordSetupUrl?: string
}) {
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const firstName = getFirstNameForEmail({
    fullName: params.customerName || undefined,
    email: params.customerEmail,
  })
  const actionUrl = params.passwordSetupUrl || `${productionUrl}/transform/studio`
  const actionLabel = params.passwordSetupUrl ? "Set up your account" : "Open the editor"
  const subject = params.passwordSetupUrl
    ? "Your SSELFIE edit credits are ready"
    : "Your SSELFIE edit credits have been added"
  const text = [
    `Hi ${firstName},`,
    "",
    `Your ${params.credits} SSELFIE edit credits are ready.`,
    "Open the editor, upload a photo, choose an aesthetic, and apply your style.",
    "",
    `${actionLabel}: ${actionUrl}`,
    "",
    "Sandra",
  ].join("\n")
  const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #0a0a0a; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
      <p>Hi ${firstName},</p>
      <p>Your ${params.credits} SSELFIE edit credits are ready.</p>
      <p>Open the editor, upload a photo, choose an aesthetic, and apply your style.</p>
      <p style="margin: 28px 0;">
        <a href="${actionUrl}" style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 14px 22px; text-decoration: none; font-size: 14px; font-weight: 600;">
          ${actionLabel}
        </a>
      </p>
      <p>Sandra</p>
    </div>
  `

  return sendEmail({
    to: params.customerEmail,
    subject,
    html,
    text,
    emailType: "transform_purchase_confirmation",
    tags: ["transform", "purchase-confirmation"],
  })
}

/**
 * Flag a checkout event for admin review when critical fields (email, product_type)
 * are missing or processing fails. Inserts into webhook_events_needs_review so the
 * admin dashboard can surface it and manually resolve the delivery.
 */
async function flagForReview(params: {
  stripeEventId: string
  eventType: string
  sessionId?: string
  customerEmail?: string | null
  productType?: string | null
  amountCents?: number | null
  currency?: string | null
  reason: "missing_email" | "missing_product_type" | "processing_error" | "missing_metadata"
  rawMetadata?: Record<string, unknown> | null
  notes?: string
}): Promise<void> {
  try {
    await sql`
      INSERT INTO webhook_events_needs_review
        (stripe_event_id, customer_email, product_type, amount_cents,
         flag_reason, raw_metadata, created_at)
      SELECT
        ${params.stripeEventId}, ${params.customerEmail ?? null},
        ${params.productType ?? null}, ${params.amountCents ?? null},
        ${params.reason}, ${JSON.stringify({
           ...(params.rawMetadata ?? {}),
           event_type: params.eventType,
           session_id: params.sessionId ?? null,
           currency: params.currency ?? null,
           notes: params.notes ?? null,
         })}::jsonb, NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM webhook_events_needs_review
        WHERE stripe_event_id = ${params.stripeEventId}
          AND resolved = FALSE
      )
    `
    console.error(
      `[v0] 🚨 NEEDS REVIEW: ${params.reason} — event=${params.stripeEventId} session=${params.sessionId ?? "?"} email=${params.customerEmail ?? "MISSING"} product=${params.productType ?? "MISSING"}`
    )
  } catch (err) {
    // Don't let the review flag itself crash the webhook
    console.error("[v0] ⚠️ Failed to insert into webhook_events_needs_review:", err)
  }
}

function getStripeObjectId(value: any): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value.id === "string") return value.id
  return null
}

function getSessionCustomerId(session: any, paymentIntent?: any | null): string {
  return (
    getStripeObjectId(paymentIntent?.customer) ||
    getStripeObjectId(session.customer) ||
    (session.customer_details?.email ? `email:${session.customer_details.email}` : null) ||
    (session.customer_email ? `email:${session.customer_email}` : null) ||
    `session:${session.id}`
  )
}

async function recordCheckoutSessionRevenue(params: {
  event: any
  session: any
  userId?: string | null
  productType?: string | null
  paymentType?: string
  customerEmail?: string | null
  description?: string
}): Promise<{ recorded: boolean; stripePaymentId: string; stripeCustomerId: string }> {
  const { event, session } = params
  const paymentIntentId = getStripeObjectId(session.payment_intent)
  let paymentIntent: any | null =
    session.payment_intent && typeof session.payment_intent === "object"
      ? session.payment_intent
      : null

  if (paymentIntentId && !paymentIntent) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error: any) {
      console.error(
        "[v0] ⚠️ Could not retrieve payment intent for revenue recording:",
        error?.message || error
      )
    }
  }

  const stripePaymentId = paymentIntentId || session.id
  const stripeCustomerId = getSessionCustomerId(session, paymentIntent)
  const amountCents =
    typeof paymentIntent?.amount === "number"
      ? paymentIntent.amount
      : typeof session.amount_total === "number"
        ? session.amount_total
        : 0
  const currency =
    String(paymentIntent?.currency || session.currency || "usd").toLowerCase()
  const isPaid = session.payment_status === "paid" || session.amount_total === 0
  const status = isPaid ? "succeeded" : "pending"
  const productType = params.productType || session.metadata?.product_type || null
  const paymentType = params.paymentType || productType || session.mode || "checkout_session"
  const metadata = {
    ...(session.metadata || {}),
    stripe_session_id: session.id,
    stripe_event_id: event.id,
    customer_email: params.customerEmail || session.customer_details?.email || session.customer_email || null,
    recorded_without_user_id: params.userId ? false : true,
    recording_source: "stripe_webhook_checkout_session",
  }

  try {
    await sql`
      INSERT INTO stripe_payments (
        stripe_payment_id,
        stripe_customer_id,
        user_id,
        amount_cents,
        currency,
        status,
        payment_type,
        product_type,
        description,
        metadata,
        payment_date,
        is_test_mode,
        created_at,
        updated_at
      )
      VALUES (
        ${stripePaymentId},
        ${stripeCustomerId},
        ${params.userId || null},
        ${amountCents},
        ${currency},
        ${status},
        ${paymentType},
        ${productType},
        ${params.description || productType || "Checkout session payment"},
        ${JSON.stringify(metadata)},
        NOW(),
        ${!event.livemode},
        NOW(),
        NOW()
      )
      ON CONFLICT (stripe_payment_id)
      DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        user_id = COALESCE(stripe_payments.user_id, EXCLUDED.user_id),
        amount_cents = EXCLUDED.amount_cents,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        payment_type = EXCLUDED.payment_type,
        product_type = EXCLUDED.product_type,
        description = EXCLUDED.description,
        metadata = COALESCE(stripe_payments.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        is_test_mode = EXCLUDED.is_test_mode,
        updated_at = NOW()
    `
    console.log(
      `[v0] ✅ Recorded checkout revenue: payment=${stripePaymentId} product=${productType || "unknown"} user=${params.userId || "NULL"}`
    )
    return { recorded: true, stripePaymentId, stripeCustomerId }
  } catch (error: any) {
    console.error("[v0] ⚠️ Failed to record checkout revenue:", error?.message || error)
    return { recorded: false, stripePaymentId, stripeCustomerId }
  }
}

async function maybeTrackCheckoutReferralSignup(
  referredUserId: string | null | undefined,
  referralCode: string | null | undefined,
  source: string
): Promise<void> {
  const normalizedReferralCode = normalizeReferralCode(referralCode)

  if (!referredUserId || !normalizedReferralCode) {
    return
  }

  const [userRecord] = await sql`
    SELECT created_at
    FROM users
    WHERE id = ${referredUserId}
    LIMIT 1
  `

  if (!isReferralSignupEligible(userRecord?.created_at || null)) {
    console.log(`[v0] Skipping referral signup tracking from ${source}: user is not newly created`)
    return
  }

  const trackingResult = await trackReferralSignup({
    referralCode: normalizedReferralCode,
    referredUserId,
  })

  console.log(`[v0] Referral signup tracking result from ${source}:`, trackingResult.status)
}

function checkoutMetadataString(
  metadata: Record<string, string> | Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function getCheckoutSessionPaymentId(session: Stripe.Checkout.Session): string | null {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null

  if (paymentIntentId) return paymentIntentId
  return session.mode === "payment" ? session.id : null
}

function getCheckoutSessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  return typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id || null
}

async function hydrateStripePaymentAttributionFromCheckout(params: {
  session: Stripe.Checkout.Session
  customerEmail?: string | null
  stripePaymentId?: string | null
}) {
  if (!params.stripePaymentId) return

  await ensureRevenueEngineSchema()

  const metadata = params.session.metadata || {}

  await sql`
    UPDATE stripe_payments
    SET
      customer_email = COALESCE(customer_email, ${params.customerEmail || null}),
      checkout_session_id = COALESCE(checkout_session_id, ${params.session.id}),
      source = COALESCE(source, ${checkoutMetadataString(metadata, "source")}),
      utm_source = COALESCE(utm_source, ${checkoutMetadataString(metadata, "utm_source")}),
      utm_medium = COALESCE(utm_medium, ${checkoutMetadataString(metadata, "utm_medium")}),
      utm_campaign = COALESCE(utm_campaign, ${checkoutMetadataString(metadata, "utm_campaign")}),
      utm_content = COALESCE(utm_content, ${checkoutMetadataString(metadata, "utm_content")}),
      checkout_source = COALESCE(checkout_source, ${checkoutMetadataString(metadata, "checkout_source")}),
      cta_keyword = COALESCE(cta_keyword, ${checkoutMetadataString(metadata, "cta_keyword")}),
      prompt_number = COALESCE(prompt_number, ${checkoutMetadataString(metadata, "prompt_number") || checkoutMetadataString(metadata, "prompt_n")}),
      entry_post_slug = COALESCE(entry_post_slug, ${checkoutMetadataString(metadata, "entry_post_slug")}),
      buyer_stage = COALESCE(buyer_stage, ${checkoutMetadataString(metadata, "buyer_stage")}),
      updated_at = NOW()
    WHERE stripe_payment_id = ${params.stripePaymentId}
  `
}

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<Response | void> {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata ?? {}
        let expandedSession: any | null = null
        const getExpandedSession = async () => {
          if (expandedSession) {
            return expandedSession
          }

          expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items", "line_items.data.price"],
          })

          return expandedSession
        }

        console.log("[v0] 🎉 Checkout session completed!")
        console.log("[v0] Session ID:", session.id)
        console.log("[v0] Mode:", session.mode)
        console.log("[v0] Payment status:", session.payment_status)
        console.log(
          "[v0] Customer email:",
          session.customer_details?.email || session.customer_email
        )
        console.log("[v0] Metadata:", JSON.stringify(session.metadata, null, 2))
        console.log("[v0] Product type from metadata:", session.metadata?.product_type)
        console.log("[v0] Test mode:", !event.livemode ? "YES (TEST)" : "NO (PRODUCTION)")

        const isPaymentPaid = session.payment_status === "paid" || session.amount_total === 0

        if (!isPaymentPaid && session.mode === "subscription") {
          console.log(
            `[v0] ⚠️ Subscription checkout completed but payment status is '${session.payment_status}'. Credits will be granted when invoice.payment_succeeded fires.`
          )
        } else if (!isPaymentPaid) {
          console.log(
            `[v0] ⚠️ Payment not confirmed (status: '${session.payment_status}'). Skipping credit grant.`
          )
          console.log(`[v0] ⚠️ DEBUG: This means isPaymentPaid=false, which will block processing`)
        }

        const customerEmail =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.customer_email
        if (customerEmail) {
          try {
            const firstName = getFirstNameForEmail({
              fullName: session.customer_details?.name,
              email: customerEmail,
            })

            // Normalise annual product type to monthly for all downstream credit/subscription logic.
            // The annual product still grants the same 200 monthly credits via the subscription.
            const rawProductType = metadata.product_type
            const productType =
              rawProductType === "sselfie_studio_membership_annual"
                ? "sselfie_studio_membership"
                : rawProductType
            let productTag = "unknown"

            if (productType === "one_time_session") {
              productTag = "one-time-session"
            } else if (productType === "sselfie_studio_membership") {
              productTag = "content-creator-studio"
            } else if (productType === "credit_topup") {
              productTag = "credit-topup"
            } else if (productType === "paid_blueprint") {
              productTag = "paid-blueprint"
            } else if (productType === "brand_strategy_pack") {
              productTag = "brand-strategy-pack"
            } else if (productType === "starter_kit") {
              productTag = "starter-kit"
            } else if (productType === "masterclass") {
              productTag = "masterclass"
            } else if (productType === "prompt_vault") {
              productTag = "prompt-vault"
            } else if (productType === "selfie_to_brand_shoot_system") {
              productTag = "selfie-to-brand-shoot"
            } else if (productType === "visibility_suite") {
              productTag = "visibility-suite"
            }

            // Track conversion attribution if campaign_id is present
            const campaignId = metadata.campaign_id
            if (campaignId) {
              try {
                const campaignIdNum = parseInt(campaignId, 10)
                if (!isNaN(campaignIdNum)) {
                  // Update campaign conversion metrics
                  await sql`
                    UPDATE admin_email_campaigns
                    SET 
                      total_converted = COALESCE(total_converted, 0) + 1,
                      updated_at = NOW()
                    WHERE id = ${campaignIdNum}
                  `

                  // Log conversion in email_logs
                  await sql`
                    INSERT INTO email_logs (
                      user_email, email_type, resend_message_id, status, sent_at
                    ) VALUES (
                      ${customerEmail}, 'campaign_conversion', NULL, 'converted', NOW()
                    )
                  `

                  console.log(
                    `[v0] ✅ Attributed conversion to campaign ${campaignIdNum} for ${customerEmail}`
                  )
                }
              } catch (convError) {
                console.error(`[v0] Error tracking conversion attribution:`, convError)
                // Don't fail the webhook if attribution fails
              }
            }

            const resendResult = await addOrUpdateResendContact(customerEmail, firstName, {
              source: "stripe-checkout",
              status: "customer",
              product: productTag,
              journey: "onboarding",
              converted: "true",
              purchase_date: new Date().toISOString().split("T")[0],
            })

            if (resendResult.success) {
              console.log(
                `[v0] Added paying customer ${customerEmail} to Resend audience with ID: ${resendResult.contactId}`
              )

              if (process.env.RESEND_BETA_SEGMENT_ID) {
                const segmentResult = await addContactToSegment(
                  customerEmail,
                  process.env.RESEND_BETA_SEGMENT_ID
                )

                if (segmentResult.success) {
                  console.log(`[v0] Added ${customerEmail} to Beta Customers segment`)
                } else {
                  console.error(`[v0] Failed to add to Beta segment: ${segmentResult.error}`)
                }
              }
            } else {
              console.error(`[v0] Failed to add paying customer to Resend: ${resendResult.error}`)
            }

            await sql`
              UPDATE freebie_subscribers 
              SET 
                email_tags = CASE 
                  WHEN email_tags IS NULL THEN ARRAY['purchased', 'customer']
                  WHEN NOT ('purchased' = ANY(email_tags)) THEN array_append(email_tags, 'purchased')
                  ELSE email_tags
                END,
                converted_to_user = TRUE,
                converted_at = NOW(),
                updated_at = NOW()
              WHERE email = ${customerEmail}
            `
            console.log(`[v0] Tagged ${customerEmail} as purchased in freebie_subscribers`)

            // Mark conversions in email automation sequences
            // Mark in blueprint_subscribers
            await sql`
              UPDATE blueprint_subscribers
              SET converted_to_user = true, converted_at = NOW(), updated_at = NOW()
              WHERE email = ${customerEmail}
              AND converted_to_user = false
            `

            // Mark in welcome_back_sequence
            await sql`
              UPDATE welcome_back_sequence
              SET converted = true, converted_at = NOW(), updated_at = NOW()
              WHERE user_email = ${customerEmail}
              AND converted = false
            `

            // Prefer exact email_type attribution from checkout metadata. If it is missing
            // or cannot be matched, keep the existing recent-email fallback.
            await markEmailLogConversionForCheckout({
              userEmail: customerEmail,
              emailType: session.metadata?.email_type || null,
              allowFallback: true,
            })

            await updateTags(customerEmail, {
              status: "customer",
              journey: "onboarding",
              converted: "true",
              product: productTag,
              conversion_date: new Date().toISOString().split("T")[0],
            })

            console.log(`[v0] Updated Resend tags for ${customerEmail} to customer status`)
          } catch (tagError) {
            console.error(`[v0] Failed to tag subscriber as purchased:`, tagError)
          }
        }

        if (session.mode === "payment") {
          let userId = metadata.user_id
          let referralPurchaseUserId = userId || null
          const credits = Number.parseInt(metadata.credits || "0")
          const productType = metadata.product_type
          // Tracked outside user-creation block so delivery email can include setup link for new users
          let isNewUserForEmail = false
          let purchasePasswordSetupLink = ""
          const customerEmail =
            session.customer_details?.email ||
            session.customer_email ||
            session.metadata?.customer_email ||
            null
          const source = metadata.source
          const isPublicPaidCheckoutSource =
            source === "landing_page" ||
            source === "selfie_guide_access" ||
            source === "selfie_guide_paid" ||
            source === "brand_strategy_paid" ||
            source === "strategy_result_upsell" ||
            source === "starter_kit_paid" ||
            source === "masterclass_paid" ||
            source === "visibility_suite_paid" ||
            source === "transform_paid" ||
            source === "prompt_vault_paid" ||
            source === "ai_prompts_access" ||
            source === "selfie_to_brand_shoot_paid"

          if (!customerEmail) {
            console.error(`[v0] 🚨 CRITICAL: No customer email found for payment session ${session.id}. Flagging for admin review.`)
            await flagForReview({
              stripeEventId: event.id,
              eventType: event.type,
              sessionId: session.id,
              customerEmail: null,
              productType: session.metadata?.product_type ?? null,
              amountCents: session.amount_total ?? null,
              currency: session.currency ?? null,
              reason: "missing_email",
              rawMetadata: session.metadata as Record<string, unknown>,
              notes: `No email in customer_details, customer_email, or metadata. Session mode: payment. Amount: ${session.amount_total}`,
            })
          }

          console.log(`[v0] 💳 Payment mode detected`)
          console.log(
            `[v0] Payment completed - Product type: ${productType}, Credits: ${credits}, Source: ${source}`
          )
          console.log(`[v0] Customer email: ${customerEmail}`)
          console.log(`[v0] Full metadata:`, JSON.stringify(session.metadata, null, 2))
          console.log(`[v0] 🔍 CRITICAL DEBUG FOR COUPON ISSUES:`)
          console.log(`[v0]   Session ID: ${session.id}`)
          console.log(`[v0]   Payment status: ${session.payment_status}`)
          console.log(
            `[v0]   Amount total: ${session.amount_total} (${session.amount_total === 0 ? "⚠️ $0 PAYMENT - COUPON CODE USED" : session.amount_total === null ? "unknown amount" : `$${(session.amount_total / 100).toFixed(2)}`})`
          )
          console.log(
            `[v0]   Payment intent: ${session.payment_intent || "NULL (may be null for $0 payments)"}`
          )
          console.log(
            `[v0]   User ID from metadata: ${userId || "❌ MISSING - will try email lookup"}`
          )
          console.log(
            `[v0]   Product type from metadata: ${productType || "❌ MISSING - will skip processing!"}`
          )
          console.log(`[v0]   Promo code from metadata: ${metadata.promo_code || "none"}`)

          const revenueRecord = await recordCheckoutSessionRevenue({
            event,
            session,
            userId: userId || null,
            productType: productType || null,
            paymentType: productType || session.mode,
            customerEmail,
            description: productType ? `Checkout payment - ${productType}` : "Checkout session payment",
          })

          if (!productType) {
            console.error(`[v0] ⚠️ WARNING: product_type is missing from session metadata!`)
            console.error(`[v0] Available metadata keys:`, Object.keys(session.metadata || {}))
            console.error(`[v0] ❌ This will cause the webhook to skip processing!`)
            await flagForReview({
              stripeEventId: event.id,
              eventType: event.type,
              sessionId: session.id,
              customerEmail: customerEmail || null,
              productType: null,
              amountCents: session.amount_total ?? null,
              currency: session.currency ?? null,
              reason: "missing_product_type",
              rawMetadata: session.metadata as Record<string, unknown>,
              notes: `product_type missing. Available keys: ${Object.keys(session.metadata || {}).join(", ")}`,
            })
          }

          // DO_NOT_REMOVE_WEBHOOK_COMPATIBILITY: legacy Brand Engine/Private AI Brand OS
          // payments may still reconcile through this metadata branch.
          if (isBrandEngineCheckoutProductType(productType)) {
            console.log(`[v0] 💎 Brand Engine payment detected for product_type=${productType}`)

            const applicationIdRaw =
              metadata.brand_engine_application_id || metadata.application_id
            const applicationId = Number.parseInt(String(applicationIdRaw || ""), 10)
            const checkoutMode = String(metadata.checkout_mode || "payment_link")
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null
            const paymentIdForStorage = paymentIntentId || session.id
            const isTestMode = !event.livemode

            let paymentAmountCents = session.amount_total || 0
            let stripeCustomerId =
              typeof session.customer === "string" ? session.customer : session.customer?.id || null

            if (paymentIntentId) {
              try {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
                paymentAmountCents = paymentIntent.amount || paymentAmountCents
                stripeCustomerId =
                  typeof paymentIntent.customer === "string"
                    ? paymentIntent.customer
                    : paymentIntent.customer?.id || stripeCustomerId
              } catch (piError: any) {
                console.error(
                  `[v0] Failed to retrieve payment intent for Brand Engine payment:`,
                  piError.message
                )
              }
            }

            if (stripeCustomerId) {
              try {
                await sql`
                  INSERT INTO stripe_payments (
                    stripe_payment_id,
                    stripe_customer_id,
                    user_id,
                    amount_cents,
                    currency,
                    status,
                    payment_type,
                    product_type,
                    description,
                    metadata,
                    payment_date,
                    is_test_mode,
                    created_at,
                    updated_at
                  )
                  VALUES (
                    ${paymentIdForStorage},
                    ${stripeCustomerId},
                    NULL,
                    ${paymentAmountCents},
                    'usd',
                    ${isPaymentPaid ? "succeeded" : "pending"},
                    'brand_engine_offer',
                    ${productType},
                    ${"Private AI Brand OS offer payment"},
                    ${JSON.stringify({
                      ...session.metadata,
                      session_id: session.id,
                      customer_email: customerEmail,
                    })},
                    NOW(),
                    ${isTestMode},
                    NOW(),
                    NOW()
                  )
                  ON CONFLICT (stripe_payment_id) 
                  DO UPDATE SET
                    status = ${isPaymentPaid ? "succeeded" : "pending"},
                    amount_cents = ${paymentAmountCents},
                    updated_at = NOW()
                `
              } catch (paymentError: any) {
                console.error(
                  `[v0] Failed to store Brand Engine payment in stripe_payments:`,
                  paymentError.message
                )
              }
            }

            if (Number.isFinite(applicationId) && applicationId > 0 && isPaymentPaid) {
              const paymentNote = `[payment ${new Date().toISOString()}] stripe_session=${session.id}; stripe_payment=${paymentIdForStorage}; mode=${checkoutMode}; amount_cents=${paymentAmountCents}`
              const updated = await sql`
                UPDATE brand_engine_applications
                SET
                  pipeline_stage = 'closed_won',
                  status = 'closed_won',
                  next_action = 'follow_up',
                  call_required = FALSE,
                  closed_at = COALESCE(closed_at, NOW()),
                  closed_reason = COALESCE(closed_reason, 'paid_via_checkout'),
                  cash_collected_cents = CASE
                    WHEN COALESCE(cash_collected_cents, 0) <= 0 THEN ${paymentAmountCents}
                    ELSE cash_collected_cents
                  END,
                  checkout_mode = CASE
                    WHEN checkout_mode IS NULL OR checkout_mode = 'none' THEN ${checkoutMode}
                    ELSE checkout_mode
                  END,
                  checkout_mode_reason = COALESCE(checkout_mode_reason, 'checkout_completed'),
                  notes = CASE
                    WHEN notes IS NULL OR notes = '' THEN ${paymentNote}
                    ELSE notes || E'\n' || ${paymentNote}
                  END,
                  updated_at = NOW()
                WHERE id = ${applicationId}
                RETURNING id
              `

              if (updated.length === 0) {
                console.warn(
                  `[v0] Brand Engine application not found for payment reconciliation: ${applicationId}`
                )
              } else {
                console.log(
                  `[v0] ✅ Brand Engine application ${applicationId} marked closed_won from checkout`
                )
              }
            } else if (!isPaymentPaid) {
              console.log(
                `[v0] Brand Engine payment pending; will wait for confirmed payment status`
              )
            } else {
              console.warn(`[v0] Brand Engine payment missing application ID in metadata`)
            }

            if (customerEmail && isPaymentPaid) {
              try {
                const firstName = getFirstNameForEmail({
                  fullName: session.customer_details?.name,
                  email: customerEmail,
                })
                const receiptText = [
                  `Hi ${firstName},`,
                  "",
                  "Payment received. You're confirmed for Private AI Brand OS.",
                  "You'll receive onboarding steps shortly.",
                  "",
                  "— Sandra",
                ].join("\n")
                const receiptHtml = `
                  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1917; line-height: 1.5;">
                    <p>Hi ${firstName},</p>
                    <p>Payment received. You're confirmed for Private AI Brand OS.</p>
                    <p>You'll receive onboarding steps shortly.</p>
                    <p>— Sandra</p>
                  </div>
                `
                await sendEmail({
                  to: customerEmail,
                  subject: "Payment received — Private AI Brand OS",
                  html: receiptHtml,
                  text: receiptText,
                  emailType: "brand_engine_payment_confirmation",
                  tags: ["brand-engine", "payment-confirmation"],
                })
              } catch (receiptError: any) {
                console.error(
                  `[v0] Failed to send Brand Engine payment confirmation email:`,
                  receiptError.message
                )
              }
            }

            return
          }

          if (!userId && customerEmail) {
            console.log(`[v0] No user_id in metadata, looking up user by email: ${customerEmail}`)

            const users = await sql`
              SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
            `

            if (users.length > 0) {
              userId = users[0].id
              referralPurchaseUserId = userId
              console.log(`[v0] Found existing user ${userId} for email ${customerEmail}`)

              if (isTransformProductType(productType) && isPaymentPaid && customerEmail) {
                console.log(`[v0] Sending Transform purchase confirmation email to ${customerEmail}`)
                await sendTransformPurchaseEmail({
                  customerEmail,
                  customerName: session.customer_details?.name,
                  credits,
                })
              } else if (source === "app" && productType === "credit_topup") {
                console.log(`[v0] Sending credit top-up confirmation email to ${customerEmail}`)

                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
                const productName = "CREDIT PURCHASE"

                const emailContent = generateWelcomeEmail({
                  customerName: getFirstNameForEmail({
                    fullName: session.customer_details?.name,
                    email: customerEmail,
                  }),
                  customerEmail: customerEmail,
                  creditsGranted: credits,
                  packageName: productName,
                  productType: "credit_topup",
                })

                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: `Your ${credits} credits have been added!`,
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["credit-topup", "purchase-confirmation"],
                })

                if (emailResult.success) {
                  console.log(
                    `[v0] Credit top-up confirmation email sent, message ID: ${emailResult.messageId}`
                  )

                  await sql`
                    INSERT INTO email_logs (
                      user_email,
                      email_type,
                      resend_message_id,
                      status,
                      sent_at
                    )
                    VALUES (
                      ${customerEmail},
                      'credit_topup_confirmation',
                      ${emailResult.messageId},
                      'sent',
                      NOW()
                    )
                  `
                } else {
                  console.error(
                    `[v0] Failed to send credit top-up confirmation email: ${emailResult.error}`
                  )
                }
              } else if (
                isPublicPaidCheckoutSource &&
                productType !== "paid_blueprint" &&
                productType !== "selfie_guide" &&
                productType !== "selfie_guide_bundle" &&
                productType !== "starter_kit" &&
                productType !== "masterclass" &&
                productType !== "prompt_vault" &&
                productType !== "presets_single" &&
                productType !== "presets_bundle" &&
                productType !== "selfie_to_brand_shoot_system" &&
                productType !== "visibility_suite" &&
                !isTransformProductType(productType)
              ) {
                // ⚠️ Skip for paid_blueprint / selfie_guide / bundle - delivery email is sent separately
                console.log(
                  `[v0] Sending purchase confirmation email to existing user ${customerEmail}`
                )

                const productName =
                  productType === "one_time_session" ? "ONE-TIME SESSION" : "CREDIT PACKAGE"
                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

                const emailContent = generateWelcomeEmail({
                  customerName: getFirstNameForEmail({
                    fullName: session.customer_details?.name,
                    email: customerEmail,
                  }),
                  customerEmail: customerEmail,
                  creditsGranted: credits,
                  packageName: productName,
                  productType: productType as "one_time_session" | "credit_topup",
                })

                const emailResult = await sendEmail({
                  to: customerEmail,
                  subject: `Your ${productName} purchase is confirmed!`,
                  html: emailContent.html,
                  text: emailContent.text,
                  tags: ["purchase-confirmation", "existing-user"],
                })

                if (emailResult.success) {
                  console.log(
                    `[v0] Purchase confirmation email sent, message ID: ${emailResult.messageId}`
                  )

                  await sql`
                    INSERT INTO email_logs (
                      user_email,
                      email_type,
                      resend_message_id,
                      status,
                      sent_at
                    )
                    VALUES (
                      ${customerEmail},
                      'purchase_confirmation',
                      ${emailResult.messageId},
                      'sent',
                      NOW()
                    )
                  `
                } else {
                  console.error(
                    `[v0] Failed to send purchase confirmation email: ${emailResult.error}`
                  )
                }
              } else if (isPublicPaidCheckoutSource && productType === "paid_blueprint") {
                console.log(
                  `[v0] ⚠️ Skipping welcome email for paid_blueprint - delivery email will be sent separately`
                )
              }
            } else if (isPublicPaidCheckoutSource && productType !== "paid_blueprint") {
              // selfie_guide is intentionally included here — account creation runs, welcome email is skipped above
              console.log(`[v0] Creating new account for landing page purchase: ${customerEmail}`)

              try {
                const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
                const supabaseAdmin = createAdminClient()

                console.log(`[v0] Step 1: Checking if user already exists in Supabase auth...`)

                const { data: existingUsers, error: listError } =
                  await supabaseAdmin.auth.admin.listUsers()

                if (listError) {
                  console.error(`[v0] Error listing users:`, listError)
                }

                const existingUser = existingUsers?.users?.find(u => u.email === customerEmail)

                if (existingUser) {
                  console.log(`[v0] User already exists in Supabase auth: ${existingUser.id}`)

                  const neonUser = await getOrCreateNeonUser(existingUser.id, customerEmail, null)
                  userId = neonUser.id
                  referralPurchaseUserId = userId
                  console.log(`[v0] Linked existing Supabase user to Neon user ${userId}`)
                } else {
                  console.log(`[v0] Step 2: Creating new user in Supabase auth (no email sent)...`)

                  const { data: createData, error: createError } =
                    await supabaseAdmin.auth.admin.createUser({
                      email: customerEmail,
                      email_confirm: true,
                      user_metadata: {
                        created_via: "stripe_one_time_purchase",
                        stripe_customer_id: session.customer,
                        product_type: productType,
                      },
                    })

                  if (createError) {
                    console.error(`[v0] Supabase create user error details:`, {
                      message: createError.message,
                      status: createError.status,
                      name: createError.name,
                      code: (createError as any).code,
                    })
                    throw createError
                  }

                  if (!createData.user) {
                    console.error(`[v0] No user data returned from create`)
                    throw new Error("No user data returned from Supabase create")
                  }

                  console.log(
                    `[v0] Step 3: Created Supabase auth user ${createData.user.id} for ${customerEmail}`
                  )

                  console.log(`[v0] Step 4: Generating password reset link...`)
                  // Include product-specific returnTo so user lands on their purchased product after setup
                  const academyMiniProductId =
                    productType === "academy_mini_product" ? String(session.metadata?.product_id || "") : ""
                  const academyMiniProductSlug =
                    VISIBILITY_MINI_PRODUCT_BY_ID[
                      academyMiniProductId as keyof typeof VISIBILITY_MINI_PRODUCT_BY_ID
                    ]?.slug
                  const productSetupNext =
                    productType === "visibility_suite" ? "/academy/access/visibility-suite" :
                    academyMiniProductSlug ? `/academy/access/${academyMiniProductSlug}` :
                    productType === "starter_kit" ? "/academy/access/starter-kit" :
                    productType === "masterclass" ? "/academy/access/brand-strategy" :
                    productType === "prompt_vault" ? "/prompt-vault" :
                    productType === "presets_single" || productType === "presets_bundle" ? "/presets" :
                    productType === "selfie_to_brand_shoot_system" ? "/academy/access/selfie-to-brand-shoot" :
                    isTransformProductType(productType) ? "/transform/studio" :
                    productType === "selfie_guide" || productType === "selfie_guide_bundle" ? "/selfie-guide" :
                    "/studio"
                  const { data: resetData, error: resetError } =
                    await supabaseAdmin.auth.admin.generateLink({
                      type: "recovery",
                      email: customerEmail,
                      options: {
                        redirectTo: `${productionUrl}/auth/setup-password?next=${encodeURIComponent(productSetupNext)}`,
                      },
                    })

                  if (resetError) {
                    console.error(`[v0] Error generating password reset link:`, resetError)
                    throw resetError
                  }

                  console.log(`[v0] Step 5: Creating Neon user record...`)
                  const neonUser = await getOrCreateNeonUser(
                    createData.user.id,
                    customerEmail,
                    null
                  )
                  userId = neonUser.id
                  referralPurchaseUserId = userId
                  console.log(`[v0] Step 6: Created Neon user ${userId} for ${customerEmail}`)

                  await sql`
                    UPDATE users
                    SET password_setup_complete = FALSE
                    WHERE id = ${userId}
                  `
                  console.log(`[v0] Set password_setup_complete to FALSE for new user ${userId}`)

                  let passwordSetupLink = resetData.properties.action_link

                  if (
                    passwordSetupLink.includes("localhost") ||
                    passwordSetupLink.includes("supabase.co")
                  ) {
                    const url = new URL(passwordSetupLink)
                    const token = url.searchParams.get("token")
                    const type = url.searchParams.get("type") || "recovery"

                    if (token) {
                      passwordSetupLink = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=${encodeURIComponent(`/auth/setup-password?next=${encodeURIComponent(productSetupNext)}`)}`
                    }
                  }

                  // Expose to outer scope so delivery email can include the setup link for new users
                  isNewUserForEmail = true
                  purchasePasswordSetupLink = passwordSetupLink

                  console.log(`[v0] Step 7: Generated password setup link`)

                  // ⚠️ Skip welcome email for paid_blueprint / selfie_guide / bundle - delivery email is sent separately
                  if (
                    productType === "paid_blueprint" ||
                    productType === "selfie_guide" ||
                    productType === "selfie_guide_bundle" ||
                    productType === "starter_kit" ||
                    productType === "masterclass" ||
                    productType === "prompt_vault" ||
                    productType === "presets_single" ||
                    productType === "presets_bundle" ||
                    productType === "selfie_to_brand_shoot_system" ||
                    productType === "visibility_suite"
                  ) {
                    console.log(
                      `[v0] ⚠️ Skipping welcome email for ${productType} - delivery email will be sent separately`
                    )
                  } else if (isTransformProductType(productType)) {
                    console.log(`[v0] Step 8: Sending Transform setup email...`)
                    const emailResult = await sendTransformPurchaseEmail({
                      customerEmail,
                      customerName: session.customer_details?.name,
                      credits,
                      passwordSetupUrl: passwordSetupLink,
                    })

                    await sql`
                      INSERT INTO email_logs (
                        user_email,
                        email_type,
                        resend_message_id,
                        status,
                        error_message,
                        sent_at
                      )
                      VALUES (
                        ${customerEmail},
                        'transform_purchase_confirmation',
                        ${emailResult.messageId || null},
                        ${emailResult.success ? 'sent' : 'failed'},
                        ${emailResult.error || null},
                        NOW()
                      )
                    `
                  } else {
                    const productName =
                      productType === "one_time_session" ? "ONE-TIME SESSION" : "CREDIT PACKAGE"

                    console.log(`[v0] Step 8: Generating welcome email...`)
                    const emailContent = generateWelcomeEmail({
                      customerName: getFirstNameForEmail({
                        fullName: session.customer_details?.name,
                        email: customerEmail,
                      }),
                      customerEmail: customerEmail,
                      creditsGranted: credits,
                      packageName: productName,
                      productType: productType as "one_time_session" | "credit_topup",
                      passwordSetupUrl: passwordSetupLink,
                    })

                    console.log("[v0] Email content generated:", {
                      hasHtml: !!emailContent.html,
                      hasText: !!emailContent.text,
                      htmlLength: emailContent.html?.length || 0,
                      textLength: emailContent.text?.length || 0,
                    })

                    console.log(`[v0] Step 9: Sending welcome email via Resend...`)
                    const emailResult = await sendEmail({
                      to: customerEmail,
                      subject: "Welcome to SSelfie! Set up your account",
                      html: emailContent.html,
                      text: emailContent.text,
                      tags: ["welcome", "account-setup", "one-time-purchase"],
                    })

                    if (emailResult.success) {
                      console.log(
                        `[v0] Step 10: Welcome email sent successfully, message ID: ${emailResult.messageId}`
                      )

                      await sql`
                        INSERT INTO email_logs (
                          user_email,
                          email_type,
                          resend_message_id,
                          status,
                          sent_at
                        )
                        VALUES (
                          ${customerEmail},
                          'welcome',
                          ${emailResult.messageId},
                          'sent',
                          NOW()
                        )
                      `
                    } else {
                      console.error(`[v0] Failed to send welcome email: ${emailResult.error}`)

                      await sql`
                        INSERT INTO email_logs (
                          user_email,
                          email_type,
                          status,
                          error_message,
                          sent_at
                        )
                        VALUES (
                          ${customerEmail},
                          'welcome',
                          'failed',
                          ${emailResult.error},
                          NOW()
                        )
                      `
                    }
                  }
                }

                console.log(`[v0] ✅ Account creation completed successfully for ${customerEmail}`)
              } catch (error: any) {
                console.error(`[v0] ❌ DETAILED ERROR creating account for ${customerEmail}:`)
                console.error(`[v0] Error type: ${error.constructor.name}`)
                console.error(`[v0] Error message: ${error.message}`)
                console.error(`[v0] Error stack:`, error.stack)
                console.error(`[v0] Full error object:`, JSON.stringify(error, null, 2))
                await markEventFailed("stripe", event.id, error).catch((statusError) => {
                  console.error("[v0] Failed to mark Stripe webhook event failed:", statusError)
                })

                return NextResponse.json(
                  {
                    error: "Failed to create user account",
                    details: error.message,
                  },
                  { status: 500 }
                )
              }
            } else {
              console.error(
                `[v0] No user found for email ${customerEmail} and source=${source || "missing"} is not a public paid checkout source. Revenue has been recorded; skipping user-bound fulfillment.`
              )
              await flagForReview({
                stripeEventId: event.id,
                eventType: event.type,
                sessionId: session.id,
                customerEmail,
                productType,
                amountCents: session.amount_total ?? null,
                currency: session.currency ?? null,
                reason: "processing_error",
                rawMetadata: session.metadata as Record<string, unknown>,
                notes: `Revenue recorded (${revenueRecord.stripePaymentId}); missing user_id for user-bound fulfillment. Source: ${source || "missing"}.`,
              })
            }
          }

          if (userId) {
            await recordCheckoutSessionRevenue({
              event,
              session,
              userId,
              productType: productType || null,
              paymentType: productType || session.mode,
              customerEmail,
              description: productType ? `Checkout payment - ${productType}` : "Checkout session payment",
            })
          }

          if (productType === "academy_mini_product" || productType === "visibility_suite") {
            await handleAcademyProductCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, isNewUserForEmail, purchasePasswordSetupLink, ...({ productType } as any) })

            return
          }

          if (!userId) {
            console.error(
              `[v0] No user_id found after revenue recording - skipping user-bound fulfillment for payment ${revenueRecord.stripePaymentId}`
            )
            await flagForReview({
              stripeEventId: event.id,
              eventType: event.type,
              sessionId: session.id,
              customerEmail,
              productType,
              amountCents: session.amount_total ?? null,
              currency: session.currency ?? null,
              reason: "processing_error",
              rawMetadata: session.metadata as Record<string, unknown>,
              notes: `Revenue recorded (${revenueRecord.stripePaymentId}); missing user_id after email lookup/account creation. Entitlement/access was not granted.`,
            })
            await markEventProcessed("stripe", event.id).catch((statusError) => {
              console.error("[v0] Failed to mark Stripe webhook event processed:", statusError)
            })
            return NextResponse.json({
              received: true,
              recorded: revenueRecord.recorded,
              warning: "missing_user_id_for_fulfillment",
            })
          }

          // Save Stripe customer ID to users table for one-time purchases
          // This allows users to access the Stripe customer portal to view invoices
          if (session.customer && typeof session.customer === "string") {
            console.log(
              `[v0] Saving Stripe customer ID ${session.customer} to users table for user ${userId}`
            )
            try {
              // Check if user already has a customer ID
              const existingCustomer = await sql`
                SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
              `

              if (existingCustomer.length > 0 && existingCustomer[0].stripe_customer_id) {
                console.log(
                  `[v0] User ${userId} already has customer ID ${existingCustomer[0].stripe_customer_id}, updating to ${session.customer}`
                )
              }

              await sql`
                UPDATE users 
                SET stripe_customer_id = ${session.customer}
                WHERE id = ${userId}
              `
              console.log(
                `[v0] Successfully saved Stripe customer ID ${session.customer} for user ${userId}`
              )
            } catch (error: any) {
              console.error(`[v0] Error saving Stripe customer ID to users table:`, error.message)
              // Don't fail the webhook if this fails - non-critical
            }
          } else {
            console.log(
              `[v0] No customer ID in session for payment mode - session.customer:`,
              session.customer
            )
          }

          // ⚠️ IMPORTANT: For subscriptions, do NOT grant credits here!
          // Subscription credits should ONLY be granted via invoice.payment_succeeded
          // to ensure payment is confirmed before granting credits
          if (!isPaymentPaid) {
            console.log(
              `[v0] ⚠️ Skipping credit grant - payment not confirmed (status: '${session.payment_status}').`
            )
          } else if (productType === "one_time_session") {
            await handleOneTimeSessionCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, credits })
          } else if (isTransformProductType(productType)) {
            const transformResponse = await handleTransformCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, credits, ...({ productType } as any) })
            if (transformResponse) return transformResponse
          } else if (productType === "credit_topup") {
            await handleCreditTopupCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, credits })
          } else if (productType === "brand_strategy_pack") {
            await handleBrandStrategyPackCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "selfie_guide" || productType === "selfie_guide_bundle") {
            await handleSelfieGuideCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, getExpandedSession, ...( { productType } as any) })
          } else if (productType === "starter_kit") {
            await handleStarterKitCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "masterclass") {
            await handleMasterclassCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "prompt_vault") {
            await handlePromptVaultCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "presets_single" || productType === "presets_bundle") {
            await handlePresetsCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "selfie_to_brand_shoot_system") {
            await handleSelfieToBrandShootCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source })
          } else if (productType === "paid_blueprint") {
            const blueprintResult = await handlePaidBlueprintCheckout({ event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source, credits })
            referralPurchaseUserId = blueprintResult.referralPurchaseUserId
            if (blueprintResult.response) return blueprintResult.response
          }

          try {
            const revenuePaymentId = getCheckoutSessionPaymentId(session)
            const revenueSubscriptionId = getCheckoutSessionSubscriptionId(session)
            await markRevenueEnginePurchase({
              sessionId: session.id,
              stripePaymentId: revenuePaymentId,
              stripeSubscriptionId: revenueSubscriptionId,
              userId: referralPurchaseUserId || null,
              userEmail: customerEmail || null,
              stripeCustomerId:
                typeof session.customer === "string" ? session.customer : session.customer?.id || null,
              purchaseValueCents: session.amount_total ?? null,
              purchaseCurrency: typeof session.currency === "string" ? session.currency : null,
              purchasedAt: new Date(),
              emailType: session.metadata?.email_type || null,
              campaignId: session.metadata?.campaign_id || null,
            })
            await hydrateStripePaymentAttributionFromCheckout({
              session,
              customerEmail,
              stripePaymentId: revenuePaymentId,
            })
          } catch (attributionError: any) {
            console.error(
              `[v0] Failed to persist revenue engine attribution after ${productType} purchase:`,
              attributionError.message
            )
          }

          try {
            await maybeTrackCheckoutReferralSignup(
              referralPurchaseUserId,
              session.metadata?.referral_code,
              `checkout.session.completed:${productType || "unknown"}`
            )
          } catch (referralError: any) {
            console.error(
              `[v0] Failed to track referral signup after ${productType} checkout:`,
              referralError.message
            )
          }

          if (
            isPaymentPaid &&
            isReferralPurchaseEligible(session.amount_total) &&
            referralPurchaseUserId &&
            productType &&
            productType !== "sselfie_studio_membership"
          ) {
            try {
              const referralResult = await completeReferralForPurchase({
                referredUserId: referralPurchaseUserId,
                paymentSource: `stripe_webhook:${productType}`,
                isTestMode: !event.livemode,
              })
              console.log(
                `[v0] Referral completion result after ${productType} purchase:`,
                referralResult.status
              )
            } catch (referralError: any) {
              console.error(
                `[v0] Failed to complete referral after ${productType} purchase:`,
                referralError.message
              )
            }
          }
        } else if (session.mode === "subscription") {
          await handleStudioMembershipSubscriptionCheckout({
            event,
            session,
            isPaymentPaid,
            customerEmail,
            userId: session.metadata?.user_id || null,
            referralPurchaseUserId: session.metadata?.user_id || null,
            source: session.metadata?.source || null,
            maybeTrackCheckoutReferralSignup,
          })
        }

        // Set pending_welcome_modal so the app can show a post-purchase modal on next load.
        // Skips credit_topup (already-active user topping up) and test-mode purchases.
        const pendingWelcomeProduct = session.metadata?.product_type as string | undefined
        if (
          isPaymentPaid &&
          customerEmail &&
          pendingWelcomeProduct &&
          pendingWelcomeProduct !== "credit_topup" &&
          event.livemode
        ) {
          try {
            await sql`
              UPDATE users
              SET pending_welcome_modal = ${pendingWelcomeProduct}
              WHERE email = ${customerEmail}
                AND pending_welcome_modal IS NULL
            `
            console.log(
              `[v0] ✅ Set pending_welcome_modal=${pendingWelcomeProduct} for ${customerEmail}`
            )
          } catch (wmErr: any) {
            console.error(`[v0] ⚠️ Failed to set pending_welcome_modal:`, wmErr.message)
          }
        }

        return
}
