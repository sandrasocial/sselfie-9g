import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generatePresetsDeliveryEmail } from "@/lib/email/templates/presets-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { markRevenueEnginePurchase } from "../shared"
import {
  getDefaultPresetCollection,
  getPresetCollectionsForAccess,
} from "@/lib/presets/published-collections"
import {
  isPresetsProductType,
  presetsSourceForTier,
  tierForPresetsProductType,
  upsertPresetOrderForPurchase,
} from "@/lib/presets/orders"
import type { CheckoutFulfillmentContext } from "../types"

function getStripeObjectId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id
  }
  return null
}

export async function handlePresetsCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId } = ctx
  const productType = session.metadata?.product_type || null

  if (!isPresetsProductType(productType)) {
    console.error("[presets] handler received non-presets product type:", productType)
    return
  }

  if (!isPaymentPaid) {
    console.log(
      `[presets] checkout completed but payment not confirmed (status: '${session.payment_status}').`
    )
    return
  }

  const tier = tierForPresetsProductType(productType)
  const isTestMode = !event.livemode
  const paymentIntentId = getStripeObjectId(session.payment_intent)
  const paymentIdForStorage = paymentIntentId || session.id
  let customerId = getStripeObjectId(session.customer)
  let paymentAmountCents = session.amount_total || 0

  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      paymentAmountCents = paymentIntent.amount || paymentAmountCents
      customerId = getStripeObjectId(paymentIntent.customer) || customerId
    } catch (piError: any) {
      console.error("[presets] Error retrieving payment intent:", piError.message)
    }
  }

  const stripeCustomerIdForStorage = customerId || session.id
  const source = presetsSourceForTier(tier)
  let collectionSlug = tier === "single" ? session.metadata?.preset_collection_slug || null : null
  let paymentRecorded = false

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
        ${stripeCustomerIdForStorage},
        ${userId},
        ${paymentAmountCents},
        ${typeof session.currency === "string" ? session.currency : "usd"},
        'succeeded',
        ${productType},
        ${productType},
        ${tier === "bundle" ? "SSELFIE Presets · Full Collection" : "SSELFIE Presets · Single Collection"},
        ${JSON.stringify(session.metadata || {})},
        NOW(),
        ${isTestMode},
        NOW(),
        NOW()
      )
      ON CONFLICT (stripe_payment_id)
      DO UPDATE SET
        status = 'succeeded',
        updated_at = NOW()
    `
    paymentRecorded = true
  } catch (paymentError: any) {
    console.error("[presets] Error storing presets payment:", paymentError.message)
  }

  if (paymentRecorded) {
    void logAnalyticsEvent({
      eventName: "presets_checkout_success",
      userId: userId || null,
      path: "/checkout/success",
      properties: {
        checkout_session_id: session.id,
        product_type: productType,
        value: paymentAmountCents / 100,
        currency: typeof session.currency === "string" ? session.currency : "usd",
        preset_tier: tier,
        preset_collection_slug: collectionSlug,
        source: session.metadata?.source || source,
        is_test_mode: isTestMode,
      },
    })
  }

  if (tier === "single" && !collectionSlug) {
    const defaultCollection = await getDefaultPresetCollection()
    collectionSlug = defaultCollection?.slug || null
  }

  try {
    await markRevenueEnginePurchase({
      sessionId: session.id,
      userId: referralPurchaseUserId || null,
      userEmail: customerEmail || null,
      stripeCustomerId: customerId || stripeCustomerIdForStorage || null,
      stripePaymentId: paymentIdForStorage,
      purchaseValueCents: paymentAmountCents,
      purchaseCurrency: typeof session.currency === "string" ? session.currency : "usd",
      purchasedAt: new Date(),
      emailType: session.metadata?.email_type || null,
      campaignId: session.metadata?.campaign_id || null,
    })
  } catch (attributionError: any) {
    console.error("[presets] Failed to persist revenue attribution:", attributionError.message)
  }

  if (userId) {
    await sql`
      INSERT INTO subscriptions (
        user_id,
        product_type,
        plan,
        status,
        stripe_customer_id,
        created_at,
        updated_at
      )
      SELECT
        ${userId},
        ${productType},
        ${productType},
        'active',
        ${customerId},
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE user_id = ${userId}
          AND product_type = ${productType}
          AND status = 'active'
      )
    `

    await sql`
      INSERT INTO user_tags (user_id, tag, source, metadata)
      VALUES (
        ${userId},
        ${tier === "bundle" ? "bought_presets_bundle" : "bought_presets_single"},
        'presets_purchase',
        ${JSON.stringify({
          stripe_session_id: session.id,
          stripe_payment_id: paymentIdForStorage,
          preset_tier: tier,
          preset_collection_slug: collectionSlug,
        })}
      )
      ON CONFLICT (user_id, tag) DO NOTHING
    `

    await upsertPurchaseEntitlement({
      userId: String(userId),
      productId: productType,
      sourceRef: paymentIdForStorage,
      metadata: {
        source: `stripe_webhook:${productType}`,
        stripe_session_id: session.id,
        preset_tier: tier,
        preset_collection_slug: collectionSlug,
      },
    })
  }

  if (!customerEmail) {
    console.error("[presets] Missing customer email; cannot create token or send delivery.")
    return
  }

  try {
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const order = await upsertPresetOrderForPurchase({
      email: customerEmail,
      name: session.customer_details?.name || null,
      tier,
      collectionSlug,
      stripeSessionId: session.id,
      stripePaymentId: paymentIdForStorage,
      stripeCustomerId: customerId || stripeCustomerIdForStorage || null,
      metadata: session.metadata || {},
    })
    const accessUrl = `${productionUrl}/access/presets/${order.accessToken}`
    const collections = await getPresetCollectionsForAccess({
      tier,
      collectionSlug,
    })
    const firstName = getFirstNameForEmail({
      fullName: session.customer_details?.name,
      email: customerEmail,
    })
    const email = generatePresetsDeliveryEmail({
      firstName,
      accessUrl,
      tier,
      collections,
    })

    const emailResult = await sendEmail({
      to: customerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: "presets_delivery",
      tags: ["presets", "delivery", source],
    })

    if (emailResult.success) {
      console.log(`[presets] Delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`)
    } else {
      console.error(`[presets] Failed to send delivery email: ${emailResult.error}`)
    }
  } catch (emailError: any) {
    console.error("[presets] Error creating access or sending delivery email:", emailError.message)
  }
}
