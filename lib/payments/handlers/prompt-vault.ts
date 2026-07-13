// WEBHOOK-01 — Prompt Vault checkout fulfillment, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts (lines 3554-3780 as of 2026-06-10). No behavior change.

import { randomUUID } from "crypto"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { generatePromptVaultDeliveryEmail } from "@/lib/email/templates/prompt-vault-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { markRevenueEnginePurchase } from "../shared"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"
import { updateContactTags as updateTags, addContactToSegment } from "@/lib/resend/manage-contact"
import {
  AI_PHOTOSHOOT_AUDIENCE,
  buildAiPhotoshootEmailTags,
  buildAiPhotoshootResendTags,
} from "@/lib/audience/ai-photoshoot-segment"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import { activatePaidBuyerSuiteTrial } from "../paid-buyer-suite-trial"
import type { CheckoutFulfillmentContext } from "../types"

function metadataValue(
  metadata: Record<string, string> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function upsertPromptVaultSubscriber(email: string, name?: string | null) {
  const resolvedName = (name || email.split("@")[0] || "Prompt Vault buyer").trim()
  const existingSubscriber = await sql`
    SELECT id, access_token, email_tags
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  const existing = existingSubscriber[0] as
    | { id: number; access_token?: string | null; email_tags?: string[] | null }
    | undefined
  const accessToken = existing?.access_token?.trim() || randomUUID()
  const tags = new Set(Array.isArray(existing?.email_tags) ? existing.email_tags : [])
  tags.add("purchased")
  tags.add("customer")
  tags.add("prompt-vault-paid")
  const normalizedTags = buildAiPhotoshootEmailTags(Array.from(tags), ["buyer"])

  if (existing) {
    await sql`
      UPDATE freebie_subscribers
      SET
        name = COALESCE(NULLIF(${resolvedName}, ''), name),
        source = 'prompt-vault-paid',
        access_token = ${accessToken},
        email_tags = ${normalizedTags}::text[],
        converted_to_user = TRUE,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `

    return { subscriberId: existing.id, accessToken }
  }

  const inserted = await sql`
    INSERT INTO freebie_subscribers (
      email,
      name,
      source,
      access_token,
      email_tags,
      converted_to_user,
      converted_at,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${resolvedName},
      'prompt-vault-paid',
      ${accessToken},
      ${normalizedTags}::text[],
      TRUE,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id
  `

  return { subscriberId: inserted[0].id as number, accessToken }
}

export async function handlePromptVaultCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, userId, referralPurchaseUserId, source } = ctx
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Prompt Vault checkout completed but payment not confirmed (status: '${session.payment_status}').`
      )
    } else {
      console.log(`[v0] 🗝️ Prompt Vault purchase from ${customerEmail} - Payment confirmed`)

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
          console.error(
            `[v0] Error retrieving payment intent for prompt vault:`,
            piError.message
          )
        }
      }

      const vaultCustomerIdForStorage = customerId || session.id

      if (vaultCustomerIdForStorage) {
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
              ${vaultCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              'prompt_vault',
              'prompt_vault',
              'The AI Photo Prompt Vault',
              ${JSON.stringify(session.metadata || {})},
              ${customerEmail || session.customer_details?.email || session.customer_email || null},
              ${session.id},
              ${metadataValue(metadata, "source") || source || "prompt_vault_paid"},
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
          console.error(`[v0] Error storing prompt vault payment:`, paymentError.message)
        }
      }

      try {
        await markRevenueEnginePurchase({
          sessionId: session.id,
          userId: referralPurchaseUserId || null,
          userEmail: customerEmail || null,
          stripeCustomerId: customerId || vaultCustomerIdForStorage || null,
          stripePaymentId: paymentIdForStorage,
          purchaseValueCents: paymentAmountCents,
          purchaseCurrency: typeof session.currency === "string" ? session.currency : "usd",
          purchasedAt: new Date(),
          emailType: session.metadata?.email_type || null,
          campaignId: session.metadata?.campaign_id || null,
        })
      } catch (attributionError: any) {
        console.error(
          "[v0] Failed to persist Prompt Vault revenue attribution immediately after payment:",
          attributionError.message,
        )
      }

      if (userId) {
        await sql`
          INSERT INTO user_tags (user_id, tag, source, metadata)
          VALUES (
            ${userId},
            'bought_prompt_vault',
            'prompt_vault_purchase',
            ${JSON.stringify({
              stripe_session_id: session.id,
              stripe_payment_id: paymentIdForStorage,
            })}
          )
          ON CONFLICT (user_id, tag) DO NOTHING
        `

        await upsertPurchaseEntitlement({
          userId: String(userId),
          productId: "prompt_vault",
          sourceRef: paymentIdForStorage,
          metadata: {
            source: "stripe_webhook:prompt_vault",
            stripe_session_id: session.id,
          },
        })
      }

      try {
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
        const subscriberRecord = await upsertPromptVaultSubscriber(
          customerEmail!,
          session.customer_details?.name
        )
        const accessUrl = `${productionUrl}/access/prompt-vault/${subscriberRecord.accessToken}`
        const passwordSetupLink = await generatePasswordSetupLinkForPurchase(
          userId,
          customerEmail!,
          "/prompt-vault"
        )
        const firstName = getFirstNameForEmail({
          fullName: session.customer_details?.name,
          email: customerEmail!,
        })
        const email = generatePromptVaultDeliveryEmail({
          firstName,
          accessUrl,
          passwordSetupUrl: passwordSetupLink,
        })

        const emailResult = await sendEmail({
          to: customerEmail!,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: "prompt_vault_delivery",
          tags: ["prompt-vault", "delivery"],
        })

        if (emailResult.success) {
          console.log(
            `[v0] ✅ Prompt Vault delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`
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
            `[v0] ❌ Failed to send Prompt Vault delivery email: ${emailResult.error}`
          )
        }
      } catch (emailError: any) {
        console.error(`[v0] Error sending Prompt Vault delivery email:`, emailError.message)
      }

      // Paid buyers with an account start their included trial immediately. Email-token
      // fulfillment stays in place for guests. The shared helper is live-only and one-ever.
      try {
        await activatePaidBuyerSuiteTrial({
          livemode: event.livemode,
          userId,
          customerEmail,
          customerName: session.customer_details?.name,
          productType: "prompt_vault",
          stripeSessionId: session.id,
          getClaimUrl: async () => {
            const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
            const subscriber = await upsertPromptVaultSubscriber(
              customerEmail!,
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
        product: "prompt-vault",
        journey: "prompt_vault",
        bought_prompt_vault: "true",
      }).catch((tagError) => {
        console.error("[v0] Failed to update Prompt Vault tags:", tagError)
      })

      const aiPhotoshootSegmentId = process.env[AI_PHOTOSHOOT_AUDIENCE.resendSegmentEnvKey]
      if (aiPhotoshootSegmentId) {
        await addContactToSegment(customerEmail!, aiPhotoshootSegmentId).catch((segmentError) => {
          console.error("[v0] Failed to add Prompt Vault buyer to AI Photoshoot segment:", segmentError)
        })
      }

      try {
        await logAnalyticsEvent({
          eventName: "prompt_vault_checkout_success",
          userId: String(userId),
          properties: {
            source: source || "landing_page",
            product_type: "prompt_vault",
            value: paymentAmountCents / 100,
            currency: "usd",
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
            is_test_mode: isTestMode,
          },
        })
        await logAnalyticsEvent({
          eventName: "prompt_vault_payment_completed",
          userId: String(userId),
          properties: {
            source: source || "landing_page",
            product_type: "prompt_vault",
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
}
