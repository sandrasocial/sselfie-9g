// WEBHOOK-01 — Selfie Guide (+ bundle, + brand-strategy order bump) checkout fulfillment,
// extracted VERBATIM from app/api/webhooks/stripe/route.ts (block at lines 1994-2483 as of
// commit 8c75895f). No behavior change.

import { randomUUID } from "crypto"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateSelfieGuidePaidDeliveryEmail,
  SELFIE_GUIDE_PAID_DELIVERY_SUBJECT,
} from "@/lib/email/templates/selfie-guide-paid-delivery"
import { generateBrandStrategySetupNotificationEmail } from "@/lib/email/templates/brand-strategy-setup-notification"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { upsertPurchaseEntitlement } from "@/lib/academy-entitlements"
import { updateContactTags as updateTags } from "@/lib/resend/manage-contact"
import { ensurePaidSelfieGuideSubscriber } from "@/lib/freebie/selfie-guide-access"
import { generatePasswordSetupLinkForPurchase } from "../shared"
import type { CheckoutFulfillmentContext } from "../types"
import { schedulePurchaseObservation } from "./purchase-analytics"

export async function handleSelfieGuideCheckout(ctx: CheckoutFulfillmentContext): Promise<void> {
  const { event, session, isPaymentPaid, customerEmail, source, productType } = ctx as CheckoutFulfillmentContext & { productType?: string }
  const userId = ctx.userId as string
  const getExpandedSession = ctx.getExpandedSession as () => Promise<any>
    // ✨ SELFIE GUIDE (+ optional bundle with Brand Strategy): payment, access, delivery email
    if (!isPaymentPaid) {
      console.log(
        `[v0] ⚠️ Selfie Guide checkout completed but payment not confirmed (status: '${session.payment_status}').`
      )
    } else {
      const isSelfieGuideBundle = productType === "selfie_guide_bundle"
      console.log(
        `[v0] 📖 ${isSelfieGuideBundle ? "Selfie Guide bundle" : "Selfie Guide"} purchase from ${customerEmail} - Payment confirmed`
      )

      const isTestMode = !event.livemode
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id
      const paymentIdForStorage = paymentIntentId || session.id

      let paymentAmountCents = session.amount_total || 0
      let customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null
      let boughtBrandStrategyBump = false
      let brandStrategyBumpAmountCents = 0
      let fulfillBrandStrategyPack = isSelfieGuideBundle

      try {
        const hydratedSession = await getExpandedSession()
        const lineItems = hydratedSession.line_items?.data || []
        const selfieGuidePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE?.trim()
        const selfieGuideBundlePriceId = process.env.STRIPE_PRICE_SELFIE_GUIDE_BUNDLE?.trim()
        const brandStrategyPriceId = process.env.STRIPE_PRICE_BRAND_STRATEGY_PACK?.trim()

        const selfieGuideLineItem = lineItems.find((item: any) => {
          const linePriceId = typeof item.price === "string" ? item.price : item.price?.id
          return linePriceId === selfieGuidePriceId
        })

        const selfieGuideBundleLineItem = lineItems.find((item: any) => {
          const linePriceId = typeof item.price === "string" ? item.price : item.price?.id
          return linePriceId === selfieGuideBundlePriceId
        })

        const brandStrategyLineItem = lineItems.find((item: any) => {
          const linePriceId = typeof item.price === "string" ? item.price : item.price?.id
          return linePriceId === brandStrategyPriceId
        })

        if (isSelfieGuideBundle && typeof selfieGuideBundleLineItem?.amount_total === "number") {
          paymentAmountCents = selfieGuideBundleLineItem.amount_total
        } else if (typeof selfieGuideLineItem?.amount_total === "number") {
          paymentAmountCents = selfieGuideLineItem.amount_total
        }

        if (brandStrategyLineItem) {
          boughtBrandStrategyBump = true
          brandStrategyBumpAmountCents = brandStrategyLineItem.amount_total ?? 0
        }

        fulfillBrandStrategyPack = isSelfieGuideBundle || boughtBrandStrategyBump
      } catch (lineItemError: any) {
        console.error(
          `[v0] Error expanding Selfie Guide checkout line items:`,
          lineItemError.message
        )
      }

      const guideProductType = isSelfieGuideBundle ? "selfie_guide_bundle" : "selfie_guide"
      const guidePaymentDescription = isSelfieGuideBundle
        ? "Selfie Guide + Brand Strategy Bundle"
        : "Selfie Guide"
      const guideUserTag = isSelfieGuideBundle ? "bought_selfie_guide_bundle" : "bought_selfie_guide"
      const guideUserTagSource = isSelfieGuideBundle
        ? "selfie_guide_bundle_purchase"
        : "selfie_guide_purchase"
      const guideWebhookSource = isSelfieGuideBundle
        ? "stripe_webhook:selfie_guide_bundle"
        : "stripe_webhook:selfie_guide"

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          customerId =
            typeof paymentIntent.customer === "string"
              ? paymentIntent.customer
              : paymentIntent.customer?.id || customerId
        } catch (piError: any) {
          console.error(
            `[v0] Error retrieving payment intent for selfie guide:`,
            piError.message
          )
        }
      }

      const guideCustomerIdForStorage = customerId || session.id
      let paymentRecorded = false

      if (guideCustomerIdForStorage) {
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
              ${guideCustomerIdForStorage},
              ${userId},
              ${paymentAmountCents},
              'usd',
              'succeeded',
              ${guideProductType},
              ${guideProductType},
              ${guidePaymentDescription},
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
          console.error(`[v0] Error storing selfie guide payment:`, paymentError.message)
        }
      }

      if (paymentRecorded) {
        schedulePurchaseObservation({
          eventName: "selfie_guide_checkout_success",
          userId: userId ? String(userId) : null,
          source: source || "landing_page",
          productType: guideProductType,
          amountCents: paymentAmountCents,
          currency: "usd",
          sessionId: session.id,
          paymentId: paymentIdForStorage,
          isTestMode,
          checkoutMetadata: session.metadata,
        })
      }

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
          ${guideProductType},
          ${guideProductType},
          'active',
          ${customerId},
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = ${guideProductType}
            AND status = 'active'
        )
      `

      await sql`
        INSERT INTO user_tags (user_id, tag, source, metadata)
        VALUES (
          ${userId},
          ${guideUserTag},
          ${guideUserTagSource},
          ${JSON.stringify({
            stripe_session_id: session.id,
            stripe_payment_id: paymentIdForStorage,
          })}
        )
        ON CONFLICT (user_id, tag) DO NOTHING
      `

      await upsertPurchaseEntitlement({
        userId: String(userId),
        productId: guideProductType,
        sourceRef: paymentIdForStorage,
        metadata: {
          source: guideWebhookSource,
          stripe_session_id: session.id,
        },
      })

      if (fulfillBrandStrategyPack && customerEmail) {
        try {
          const bspSourceProductType = isSelfieGuideBundle ? "selfie_guide_bundle" : "selfie_guide"
          const bspPackDescription = isSelfieGuideBundle
            ? "Strategy Foundation (included in Selfie Guide bundle)"
            : "Strategy Foundation (Selfie Guide order bump)"
          const bspUserTagSource = isSelfieGuideBundle
            ? "selfie_guide_bundle_included"
            : "selfie_guide_order_bump"
          const bspEntitlementSource = isSelfieGuideBundle
            ? "stripe_webhook:selfie_guide_bundle_brand_strategy"
            : "stripe_webhook:selfie_guide_order_bump"
          const bspAnalyticsSource = isSelfieGuideBundle ? "selfie_guide_bundle" : "selfie_guide_order_bump"
          const brandStrategyPaymentId = paymentIntentId
            ? `${paymentIntentId}:brand_strategy_pack`
            : `${session.id}:brand_strategy_pack`
          const brandStrategyStoredAmountCents =
            boughtBrandStrategyBump && brandStrategyBumpAmountCents > 0
              ? brandStrategyBumpAmountCents
              : 0

          const brandStrategyCustomerIdForStorage = customerId || session.id
          let brandStrategyPaymentRecorded = false

          if (brandStrategyCustomerIdForStorage) {
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
                ${brandStrategyPaymentId},
                ${brandStrategyCustomerIdForStorage},
                ${userId},
                ${brandStrategyStoredAmountCents},
                'usd',
                'succeeded',
                'brand_strategy_pack',
                'brand_strategy_pack',
                ${bspPackDescription},
                ${JSON.stringify({
                  ...(session.metadata || {}),
                  source_session_id: session.id,
                  source_payment_id: paymentIdForStorage,
                  source_product_type: bspSourceProductType,
                })},
                NOW(),
                ${isTestMode},
                NOW(),
                NOW()
              )
              ON CONFLICT (stripe_payment_id)
              DO UPDATE SET
                amount_cents = ${brandStrategyStoredAmountCents},
                status = 'succeeded',
                updated_at = NOW()
            `
            brandStrategyPaymentRecorded = true
          }

          if (brandStrategyPaymentRecorded) {
            schedulePurchaseObservation({
              eventName: "brand_strategy_pack_checkout_success",
              userId: userId ? String(userId) : null,
              source: bspAnalyticsSource,
              productType: "brand_strategy_pack",
              amountCents: brandStrategyStoredAmountCents,
              currency: "usd",
              sessionId: session.id,
              paymentId: brandStrategyPaymentId,
              isTestMode,
              checkoutMetadata: session.metadata,
              properties: {
                source_product_type: bspSourceProductType,
              },
            })
          }

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
              'brand_strategy_pack',
              'brand_strategy_pack',
              'active',
              ${customerId},
              NOW(),
              NOW()
            WHERE NOT EXISTS (
              SELECT 1
              FROM subscriptions
              WHERE user_id = ${userId}
                AND product_type = 'brand_strategy_pack'
                AND status = 'active'
            )
          `

          await sql`
            INSERT INTO user_tags (user_id, tag, source, metadata)
            VALUES (
              ${userId},
              'bought_brand_strategy_pack',
              ${bspUserTagSource},
              ${JSON.stringify({
                stripe_session_id: session.id,
                stripe_payment_id: brandStrategyPaymentId,
                source_product_type: bspSourceProductType,
              })}
            )
            ON CONFLICT (user_id, tag) DO NOTHING
          `

          await upsertPurchaseEntitlement({
            userId: String(userId),
            productId: "brand_strategy_pack",
            sourceRef: brandStrategyPaymentId,
            metadata: {
              source: bspEntitlementSource,
              stripe_session_id: session.id,
              source_product_type: bspSourceProductType,
            },
          })

          const brandStrategySetupToken = randomUUID()
          await sql`
            UPDATE subscriptions
            SET setup_token = ${brandStrategySetupToken}::uuid,
                updated_at = NOW()
            WHERE user_id = ${userId}
              AND product_type = 'brand_strategy_pack'
              AND status = 'active'
          `

          await updateTags(customerEmail, {
            product: "brand-strategy-pack",
            bought_brand_strategy_pack: "true",
          })

          const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
          const setupUrl = `${productionUrl}/brand-strategy/setup/${brandStrategySetupToken}`
          const bspFirstName = getFirstNameForEmail({
            fullName: session.customer_details?.name,
            email: customerEmail,
          })
          const setupEmailContent = generateBrandStrategySetupNotificationEmail({
            firstName: bspFirstName,
            recipientEmail: customerEmail,
            setupUrl,
          })

          await sendEmail({
            from: "Maya at SSELFIE <hello@sselfie.ai>",
            to: customerEmail,
            replyTo: "hello@sselfie.ai",
            subject: setupEmailContent.subject,
            html: setupEmailContent.html,
            text: setupEmailContent.text,
            tags: isSelfieGuideBundle
              ? ["brand-strategy-setup", "selfie-guide-bundle"]
              : ["brand-strategy-setup", "selfie-guide-order-bump"],
            emailType: "brand-strategy-setup",
          })


          console.log(
            `[v0] ✅ Brand Strategy fulfilled for ${customerEmail} (${isSelfieGuideBundle ? "bundle" : "order bump"})`
          )
        } catch (bumpError: any) {
          console.error(
            `[v0] Error fulfilling Brand Strategy order bump:`,
            bumpError.message
          )
        }
      }

      // Send delivery email with download link
      try {
        const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
        const firstName = getFirstNameForEmail({
          fullName: session.customer_details?.name,
          email: customerEmail,
        })
        const subscriberRecord = await ensurePaidSelfieGuideSubscriber(
          customerEmail!,
          session.customer_details?.name
        )
        const accessUrl = `${productionUrl}/selfie-guide/access/${subscriberRecord.accessToken}`

        // Generate a fresh password setup link if user was just created (has no password set up)
        let passwordSetupLink: string | undefined
        if (userId) {
          try {
            const userRecord = await sql`
              SELECT password_setup_complete FROM users WHERE id = ${userId} LIMIT 1
            `
            if (userRecord[0]?.password_setup_complete === false) {
              const supabaseAdmin = createAdminClient()
              const { data: resetData, error: resetError } =
                await supabaseAdmin.auth.admin.generateLink({
                  type: "recovery",
                  email: customerEmail!,
                  options: { redirectTo: `${productionUrl}/auth/setup-password` },
                })
              if (!resetError && resetData?.properties?.action_link) {
                let link = resetData.properties.action_link
                if (link.includes("localhost") || link.includes("supabase.co")) {
                  const url = new URL(link)
                  const token = url.searchParams.get("token")
                  const type = url.searchParams.get("type") || "recovery"
                  if (token) {
                    link = `${productionUrl}/auth/confirm?token=${token}&type=${type}&redirect_to=/auth/setup-password`
                  }
                }
                passwordSetupLink = link
              }
            }
          } catch (linkError: any) {
            console.error(
              `[v0] Error generating password setup link for selfie guide:`,
              linkError.message
            )
          }
        }

        const emailContent = generateSelfieGuidePaidDeliveryEmail({
          firstName,
          email: customerEmail!,
          accessUrl,
          passwordSetupLink,
        })

        const emailResult = await sendEmail({
          to: customerEmail!,
          subject: SELFIE_GUIDE_PAID_DELIVERY_SUBJECT,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "selfie_guide_delivery",
          tags: ["selfie-guide-delivery", "purchase-confirmation"],
        })

        if (emailResult.success) {
          console.log(
            `[v0] ✅ Selfie Guide delivery email sent to ${customerEmail}, ID: ${emailResult.messageId}`
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
            `[v0] ❌ Failed to send Selfie Guide delivery email: ${emailResult.error}`
          )
        }
      } catch (emailError: any) {
        console.error(`[v0] Error sending Selfie Guide delivery email:`, emailError.message)
      }

    }
}
