// WEBHOOK-01 — Selfie to Brand Shoot System checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (block at lines 3042-3249 as of commit 720fa3dc).
// No behavior change. Note: this product also grants the Prompt Vault (bundle).

import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generateSelfieToBrandShootDeliveryEmail } from "@/lib/email/templates/selfie-to-brand-shoot-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { schedulePurchaseObservation } from "./purchase-analytics"
import { updateContactTags as updateTags, addContactToSegment } from "@/lib/resend/manage-contact"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"
import { ensurePaidSelfieToBrandShootSubscriber } from "@/lib/freebie/selfie-to-brand-shoot-access"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"

export async function handleSelfieToBrandShootCheckout(
  ctx: CheckoutFulfillmentContext
): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, source } = ctx
  if (!isPaymentPaid) {
    console.log(
      `[v0] ⚠️ Selfie to Brand Shoot checkout completed but payment not confirmed (status: '${session.payment_status}').`
    )
  } else {
    console.log(`[v0] 📸 Selfie to Brand Shoot purchase from ${customerEmail} - Payment confirmed`)

    const isTestMode = !event.livemode
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id
    const paymentIdForStorage = paymentIntentId || session.id
    let customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null
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
        console.error(
          `[v0] Error retrieving payment intent for Selfie to Brand Shoot:`,
          piError.message
        )
      }
    }

    const systemCustomerIdForStorage = customerId || session.id
    let paymentRecorded = false

    if (systemCustomerIdForStorage) {
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
              ${systemCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'selfie_to_brand_shoot_system',
              'selfie_to_brand_shoot_system',
              'Selfie to Brand Shoot System',
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
        console.error(`[v0] Error storing Selfie to Brand Shoot payment:`, paymentError.message)
      }
    }

    if (paymentRecorded) {
      schedulePurchaseObservation({
        eventName: "selfie_to_brand_shoot_checkout_success",
        userId: userId ? String(userId) : null,
        source,
        productType: "selfie_to_brand_shoot_system",
        amountCents: paymentAmountCents,
        currency: "usd",
        sessionId: session.id,
        paymentId: paymentIdForStorage,
        isTestMode,
      })
    }

    if (userId) {
      for (const tag of ["bought_selfie_to_brand_shoot_system", "bought_prompt_vault"]) {
        await sql`
            INSERT INTO user_tags (user_id, tag, source, metadata)
            VALUES (
              ${userId},
              ${tag},
              'selfie_to_brand_shoot_purchase',
              ${JSON.stringify({
                stripe_session_id: session.id,
                stripe_payment_id: paymentIdForStorage,
              })}
            )
            ON CONFLICT (user_id, tag) DO NOTHING
          `
      }

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "selfie_to_brand_shoot_system",
        sourceRef: paymentIdForStorage,
        metadata: {
          source: "stripe_webhook:selfie_to_brand_shoot_system",
          stripe_session_id: session.id,
        },
      })
      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: "prompt_vault",
        sourceRef: paymentIdForStorage,
        metadata: {
          source: "stripe_webhook:selfie_to_brand_shoot_system_includes_prompt_vault",
          stripe_session_id: session.id,
        },
      })
    }

    try {
      const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
      const subscriberRecord = await ensurePaidSelfieToBrandShootSubscriber(
        customerEmail!,
        session.customer_details?.name
      )
      const accessUrl = `${productionUrl}/academy/access/selfie-to-brand-shoot`
      const vaultUrl = `${productionUrl}/access/prompt-vault/${subscriberRecord.accessToken}`
      const passwordSetupLink = await generatePasswordSetupLinkForPurchase(
        userId,
        customerEmail!,
        "/academy/access/selfie-to-brand-shoot"
      )
      const firstName = getFirstNameForEmail({
        fullName: session.customer_details?.name,
        email: customerEmail!,
      })
      const email = generateSelfieToBrandShootDeliveryEmail({
        firstName,
        accessUrl,
        vaultUrl,
        passwordSetupUrl: passwordSetupLink,
      })

      const emailResult = await sendEmail({
        to: customerEmail!,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: "selfie_to_brand_shoot_delivery",
        tags: ["selfie-to-brand-shoot", "delivery"],
      })

      if (emailResult.success) {
        console.log(
          `[v0] ✅ Selfie to Brand Shoot delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`
        )
        await sql`
            UPDATE freebie_subscribers
            SET guide_access_email_sent = TRUE,
                guide_access_email_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ${subscriberRecord.subscriberId}
          `
      } else {
        console.error(
          `[v0] ❌ Failed to send Selfie to Brand Shoot delivery email: ${emailResult.error}`
        )
      }
    } catch (emailError: any) {
      console.error(`[v0] Error sending Selfie to Brand Shoot delivery email:`, emailError.message)
    }

    await updateTags(customerEmail!, {
      ...buildAiPhotoshootResendTags("buyer"),
      product: "selfie-to-brand-shoot",
      journey: "selfie_to_brand_shoot",
      bought_selfie_to_brand_shoot_system: "true",
      bought_prompt_vault: "true",
    }).catch(tagError => {
      console.error("[v0] Failed to update Selfie to Brand Shoot tags:", tagError)
    })

    const aiPhotoshootSegmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
    if (aiPhotoshootSegmentId) {
      await addContactToSegment(customerEmail!, aiPhotoshootSegmentId).catch(segmentError => {
        console.error(
          "[v0] Failed to add Selfie to Brand Shoot buyer to AI Photoshoot segment:",
          segmentError
        )
      })
    }
  }
}
