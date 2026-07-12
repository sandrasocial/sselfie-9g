/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateSelfieAiPhotosKitDeliveryEmail } from "@/lib/email/templates/selfie-ai-photos-kit-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { markRevenueEnginePurchase } from "../shared"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { updateContactTags as updateTags, addContactToSegment } from "@/lib/resend/manage-contact"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import { activatePaidBuyerSuiteTrial } from "../paid-buyer-suite-trial"
import {
  ensurePaidSelfieAiPhotosKitSubscriber,
  SELFIE_AI_PHOTOS_KIT_SOURCE,
  SELFIE_AI_PHOTOS_KIT_TAG,
} from "@/lib/freebie/selfie-ai-photos-kit-access"
import type { CheckoutFulfillmentContext } from "../types"

function metadataValue(
  metadata: Record<string, string> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function handleSelfieAiPhotosKitCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source } = ctx

  if (!isPaymentPaid) {
    console.log(
      `[v0] ⚠️ Selfie To AI Photos Kit checkout completed but payment not confirmed (status: '${session.payment_status}').`,
    )
    return
  }

  if (!customerEmail) {
    console.error("[v0] ❌ Selfie To AI Photos Kit fulfillment missing customer email.")
    return
  }

  console.log(`[v0] 📸 Selfie To AI Photos Kit purchase from ${customerEmail} - Payment confirmed`)

  const isTestMode = !event.livemode
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id
  const paymentIdForStorage = paymentIntentId || session.id
  let customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null
  let paymentAmountCents = session.amount_total || 0

  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      paymentAmountCents = paymentIntent.amount || paymentAmountCents
      customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id || customerId
    } catch (piError: any) {
      console.error(`[v0] Error retrieving payment intent for Selfie To AI Photos Kit:`, piError.message)
    }
  }

  const customerIdForStorage = customerId || session.id

  if (customerIdForStorage) {
    try {
      const metadata = session.metadata || {}
      await ensureRevenueEngineSchema()
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
          customer_email,
          checkout_session_id,
          source,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          checkout_source,
          cta_keyword,
          prompt_number,
          entry_post_slug,
          buyer_stage,
          payment_date,
          is_test_mode,
          created_at,
          updated_at
        )
        VALUES (
          ${paymentIdForStorage},
          ${customerIdForStorage},
          ${userId},
          ${paymentAmountCents},
          'usd',
          'succeeded',
          'selfie_ai_photos_kit',
          'selfie_ai_photos_kit',
          'Selfie To AI Photos Kit',
          ${JSON.stringify(session.metadata || {})},
          ${customerEmail || session.customer_details?.email || session.customer_email || null},
          ${session.id},
          ${metadataValue(metadata, "source") || source || SELFIE_AI_PHOTOS_KIT_SOURCE},
          ${metadataValue(metadata, "utm_source")},
          ${metadataValue(metadata, "utm_medium")},
          ${metadataValue(metadata, "utm_campaign")},
          ${metadataValue(metadata, "utm_content")},
          ${metadataValue(metadata, "checkout_source")},
          ${metadataValue(metadata, "cta_keyword")},
          ${metadataValue(metadata, "prompt_number") || metadataValue(metadata, "prompt_n")},
          ${metadataValue(metadata, "entry_post_slug")},
          ${metadataValue(metadata, "buyer_stage")},
          NOW(),
          ${isTestMode},
          NOW(),
          NOW()
        )
        ON CONFLICT (stripe_payment_id)
        DO UPDATE SET
          status = 'succeeded',
          customer_email = COALESCE(stripe_payments.customer_email, EXCLUDED.customer_email),
          checkout_session_id = COALESCE(stripe_payments.checkout_session_id, EXCLUDED.checkout_session_id),
          source = COALESCE(stripe_payments.source, EXCLUDED.source),
          utm_source = COALESCE(stripe_payments.utm_source, EXCLUDED.utm_source),
          utm_medium = COALESCE(stripe_payments.utm_medium, EXCLUDED.utm_medium),
          utm_campaign = COALESCE(stripe_payments.utm_campaign, EXCLUDED.utm_campaign),
          utm_content = COALESCE(stripe_payments.utm_content, EXCLUDED.utm_content),
          checkout_source = COALESCE(stripe_payments.checkout_source, EXCLUDED.checkout_source),
          cta_keyword = COALESCE(stripe_payments.cta_keyword, EXCLUDED.cta_keyword),
          prompt_number = COALESCE(stripe_payments.prompt_number, EXCLUDED.prompt_number),
          entry_post_slug = COALESCE(stripe_payments.entry_post_slug, EXCLUDED.entry_post_slug),
          buyer_stage = COALESCE(stripe_payments.buyer_stage, EXCLUDED.buyer_stage),
          updated_at = NOW()
      `
    } catch (paymentError: any) {
      console.error(`[v0] Error storing Selfie To AI Photos Kit payment:`, paymentError.message)
    }
  }

  try {
    await markRevenueEnginePurchase({
      sessionId: session.id,
      userId: referralPurchaseUserId || null,
      userEmail: customerEmail || null,
      stripeCustomerId: customerId || customerIdForStorage || null,
      stripePaymentId: paymentIdForStorage,
      purchaseValueCents: paymentAmountCents,
      purchaseCurrency: typeof session.currency === "string" ? session.currency : "usd",
      purchasedAt: new Date(),
      emailType: session.metadata?.email_type || null,
      campaignId: session.metadata?.campaign_id || null,
    })
  } catch (attributionError: any) {
    console.error(
      "[v0] Failed to persist Selfie To AI Photos Kit revenue attribution immediately after payment:",
      attributionError.message,
    )
  }

  if (userId) {
    await sql`
      INSERT INTO user_tags (user_id, tag, source, metadata)
      VALUES (
        ${userId},
        ${SELFIE_AI_PHOTOS_KIT_TAG},
        'selfie_ai_photos_kit_purchase',
        ${JSON.stringify({
          stripe_session_id: session.id,
          stripe_payment_id: paymentIdForStorage,
        })}
      )
      ON CONFLICT (user_id, tag) DO NOTHING
    `

    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: "selfie_ai_photos_kit",
      sourceRef: paymentIdForStorage,
      metadata: {
        source: "stripe_webhook:selfie_ai_photos_kit",
        stripe_session_id: session.id,
      },
    })
  }

  try {
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const subscriberRecord = await ensurePaidSelfieAiPhotosKitSubscriber(
      customerEmail!,
      session.customer_details?.name,
    )
    const accessUrl = `${productionUrl}/access/selfie-to-ai-photos-kit/${subscriberRecord.accessToken}`
    const passwordSetupLink = await generatePasswordSetupLinkForPurchase(
      userId,
      customerEmail!,
      "/selfie-to-ai-photos-kit",
    )
    const firstName = getFirstNameForEmail({
      fullName: session.customer_details?.name,
      email: customerEmail!,
    })
    const email = generateSelfieAiPhotosKitDeliveryEmail({
      firstName,
      accessUrl,
      passwordSetupUrl: passwordSetupLink,
    })

    const emailResult = await sendEmail({
      to: customerEmail!,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "selfie_ai_photos_kit_delivery",
      tags: ["selfie-ai-photos-kit", "delivery"],
    })

    if (emailResult.success) {
      console.log(
        `[v0] ✅ Selfie To AI Photos Kit delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`,
      )
      await sql`
        UPDATE freebie_subscribers
        SET guide_access_email_sent = TRUE,
            guide_access_email_sent_at = NOW(),
            updated_at = NOW()
        WHERE id = ${subscriberRecord.subscriberId}
      `
    } else {
      console.error(`[v0] ❌ Failed to send Selfie To AI Photos Kit delivery email: ${emailResult.error}`)
    }
  } catch (emailError: any) {
    console.error(`[v0] Error sending Selfie To AI Photos Kit delivery email:`, emailError.message)
  }

  // Paid buyers with an account start their included trial immediately. Email-token
  // fulfillment stays in place for guests. The shared helper is live-only and one-ever.
  try {
    await activatePaidBuyerSuiteTrial({
      livemode: event.livemode,
      userId,
      customerEmail,
      customerName: session.customer_details?.name,
      productType: "selfie_ai_photos_kit",
      stripeSessionId: session.id,
      getClaimUrl: async () => {
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
        const subscriber = await ensurePaidSelfieAiPhotosKitSubscriber(
          customerEmail,
          session.customer_details?.name,
        )
        return `${productionUrl}/claim/${subscriber.accessToken}`
      },
    })
  } catch (trialError: any) {
    console.error(`[v0] Error activating included SUITE trial:`, trialError.message)
  }

  await updateTags(customerEmail!, {
    ...buildAiPhotoshootResendTags("buyer"),
    product: "selfie-ai-photos-kit",
    journey: "selfie_ai_photos_kit",
    bought_selfie_ai_photos_kit: "true",
  }).catch((tagError) => {
    console.error("[v0] Failed to update Selfie To AI Photos Kit tags:", tagError)
  })

  const aiPhotoshootSegmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
  if (aiPhotoshootSegmentId) {
    await addContactToSegment(customerEmail!, aiPhotoshootSegmentId).catch((segmentError) => {
      console.error("[v0] Failed to add Selfie To AI Photos Kit buyer to AI Photoshoot segment:", segmentError)
    })
  }

  try {
    await logAnalyticsEvent({
      eventName: "selfie_ai_photos_kit_checkout_success",
      userId: String(userId),
      properties: {
        source: source || "landing_page",
        product_type: "selfie_ai_photos_kit",
        value: paymentAmountCents / 100,
        currency: "usd",
        stripe_session_id: session.id,
        stripe_payment_id: paymentIdForStorage,
        is_test_mode: isTestMode,
      },
    })
  } catch {
    // best effort only
  }
}
